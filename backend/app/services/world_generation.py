"""
World generation orchestration service.
Manages the full pipeline: prompt -> generation -> processing -> storage.
"""
import asyncio
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import GenerationStatus, World, DashaPlanet
from app.schemas.schemas import WorldGenerateRequest, BiomeMetadata
from app.services.biome_templates import construct_prompt, get_biome_metadata
from app.services.collision_mesh import extract_collision_mesh
from app.services.splat_compression import compress_splat_file
from app.services.world_labs_client import get_world_labs_client

settings = get_settings()
logger = logging.getLogger(__name__)


class WorldGenerationService:
    """Service for orchestrating world generation."""
    
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 5
    
    def __init__(self):
        self.client = get_world_labs_client()
    
    async def create_generation_job(
        self,
        db: AsyncSession,
        user_id: str,
        request: WorldGenerateRequest,
    ) -> World:
        """
        Create a new world generation job.
        
        Returns:
            Created World model instance
        """
        job_id = f"world_{request.dasha_planet.value}_{uuid4().hex[:12]}"
        
        world = World(
            job_id=job_id,
            session_id=None,  # Will be set from auth context
            dasha_planet=request.dasha_planet,
            archetype=request.archetype,
            status=GenerationStatus.PENDING,
            progress_percent=0,
            biome_metadata=get_biome_metadata(request.dasha_planet).model_dump(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        db.add(world)
        await db.commit()
        await db.refresh(world)
        
        logger.info(f"Created world generation job: {job_id} for user {user_id}")
        
        return world
    
    async def process_generation(
        self,
        db: AsyncSession,
        world: World,
    ) -> World:
        """
        Process world generation with retry logic.
        
        This is the main orchestration pipeline.
        """
        start_time = time.time()
        
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                # Update status
                world.status = GenerationStatus.PROCESSING
                world.retry_count = attempt - 1
                world.progress_percent = 5
                await db.commit()
                
                # Construct prompt (simplified on retries)
                prompt = self._construct_prompt_with_retry(
                    world.dasha_planet,
                    world.archetype,
                    attempt,
                )
                
                world.progress_percent = 10
                await db.commit()
                
                # Generate via World Labs
                result = await self.client.generate_with_polling(
                    prompt=prompt,
                    dasha=world.dasha_planet,
                    job_id=world.job_id,
                )
                
                world.progress_percent = 60
                await db.commit()
                
                if result["status"] == GenerationStatus.COMPLETED:
                    # Process assets
                    await self._process_assets(db, world, result)
                    
                    # Update completion stats
                    world.status = GenerationStatus.COMPLETED
                    world.generated_at = datetime.utcnow()
                    world.generation_duration_seconds = time.time() - start_time
                    world.api_calls_made = attempt
                    world.estimated_cost_usd = self._estimate_cost(attempt)
                    world.progress_percent = 100
                    
                    await db.commit()
                    await db.refresh(world)
                    
                    logger.info(f"World generation completed: {world.job_id}")
                    return world
                
                else:
                    # Generation failed
                    raise Exception(result.get("error", "Unknown generation error"))
                    
            except Exception as e:
                logger.warning(f"Generation attempt {attempt} failed: {e}")
                world.last_error = str(e)
                await db.commit()
                
                if attempt < self.MAX_RETRIES:
                    # Wait before retry
                    await asyncio.sleep(self.RETRY_DELAY_SECONDS * attempt)
                else:
                    # All retries exhausted, use fallback
                    return await self._use_fallback_world(db, world)
        
        return world
    
    def _construct_prompt_with_retry(
        self,
        dasha: DashaPlanet,
        archetype: str,
        attempt: int,
    ) -> str:
        """
        Construct prompt, simplifying on retries.
        """
        base_prompt = construct_prompt(dasha, archetype)
        
        if attempt == 1:
            return base_prompt
        elif attempt == 2:
            # Simplify - remove archetype details
            return construct_prompt(dasha, "wanderer")
        else:
            # Most basic prompt
            template = {
                DashaPlanet.SATURN: "dark obsidian landscape",
                DashaPlanet.VENUS: "crystalline garden",
                DashaPlanet.JUPITER: "golden temple realm",
                DashaPlanet.MARS: "red battlefield",
                DashaPlanet.SUN: "bright solar throne",
                DashaPlanet.MOON: "silver dreamscape",
                DashaPlanet.MERCURY: "quicksilver spires",
                DashaPlanet.RAHU: "shadow maze",
                DashaPlanet.KETU: "white emptiness",
            }.get(dasha, "mystical landscape")
            
            return f"Generate a {template}, 3D world, high quality"
    
    async def _process_assets(
        self,
        db: AsyncSession,
        world: World,
        generation_result: dict,
    ) -> None:
        """
        Process and optimize generated assets.
        """
        world.progress_percent = 65
        await db.commit()
        
        storage_path = Path(settings.ASSET_STORAGE_PATH) / world.job_id
        
        # Get asset paths
        splat_url = generation_result.get("splat_url", "")
        glb_url = generation_result.get("glb_url", "")
        
        # Convert URLs to local paths
        splat_path = storage_path / "world.splat"
        glb_path = storage_path / "world.glb"
        
        world.splat_url = splat_url
        world.glb_url = glb_url
        world.progress_percent = 70
        await db.commit()
        
        # Compress splat
        if splat_path.exists():
            compressed_splat_path = storage_path / "world_compressed.splat"
            success, stats = compress_splat_file(
                splat_path,
                compressed_splat_path,
                downsample_factor=0.5,
            )
            
            if success:
                logger.info(f"Splat compressed: {stats}")
                # Use compressed version
                world.splat_url = splat_url.replace("world.splat", "world_compressed.splat")
        
        world.progress_percent = 80
        await db.commit()
        
        # Extract collision mesh
        if glb_path.exists():
            collision_path = storage_path / "collision_mesh.glb"
            success, error = extract_collision_mesh(
                glb_path,
                collision_path,
                max_triangles=5000,
            )
            
            if success:
                world.collision_mesh_url = f"/assets/{world.job_id}/collision_mesh.glb"
                logger.info(f"Collision mesh extracted: {collision_path}")
            else:
                logger.warning(f"Collision mesh extraction failed: {error}")
        
        world.progress_percent = 90
        await db.commit()
    
    async def _use_fallback_world(
        self,
        db: AsyncSession,
        world: World,
    ) -> World:
        """
        Fall back to pre-cached world.
        """
        logger.info(f"Using fallback world for {world.job_id}")
        
        dasha = world.dasha_planet.value
        
        # Use fallback assets
        world.splat_url = f"/fallback/{dasha}_world.splat"
        world.glb_url = f"/fallback/{dasha}_world.glb"
        world.collision_mesh_url = f"/fallback/{dasha}_collision.glb"
        world.status = GenerationStatus.FALLBACK_USED
        world.generated_at = datetime.utcnow()
        world.progress_percent = 100
        
        await db.commit()
        await db.refresh(world)
        
        return world
    
    def _estimate_cost(self, api_calls: int) -> float:
        """
        Estimate API cost based on calls made.
        Rough estimate: $0.05 per API call for World Labs.
        """
        return api_calls * 0.05


# Singleton
_generation_service: Optional[WorldGenerationService] = None


def get_generation_service() -> WorldGenerationService:
    """Get world generation service singleton."""
    global _generation_service
    if _generation_service is None:
        _generation_service = WorldGenerationService()
    return _generation_service
