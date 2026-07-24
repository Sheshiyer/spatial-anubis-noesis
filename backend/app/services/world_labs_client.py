"""
World Labs API client for world generation.
Handles prompt submission, polling, and asset download.
"""
import asyncio
import hashlib
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.schemas.schemas import DashaPlanet, GenerationStatus

settings = get_settings()


class WorldLabsClient:
    """Async client for World Labs API."""
    
    def __init__(self):
        self.api_key = settings.WORLD_LABS_API_KEY
        self.base_url = settings.WORLD_LABS_API_URL
        self.mock_mode = settings.WORLD_LABS_MOCK_MODE
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
            timeout=60.0,
        )
    
    async def submit_generation(
        self,
        prompt: str,
        dasha: DashaPlanet,
        job_id: str,
    ) -> dict:
        """
        Submit a world generation prompt.
        
        Returns:
            Dict with generation_id and initial status
        """
        if self.mock_mode:
            # Mock submission - simulate API latency
            await asyncio.sleep(0.5)
            return {
                "generation_id": f"mock_{job_id}",
                "status": "processing",
                "estimated_seconds": 25,
            }
        
        payload = {
            "prompt": prompt,
            "output_format": ["glb", "splat"],
            "quality": "high",
            "metadata": {
                "dasha": dasha.value,
                "job_id": job_id,
            },
        }
        
        response = await self.client.post("/worlds/generate", json=payload)
        response.raise_for_status()
        return response.json()
    
    async def poll_generation_status(
        self,
        generation_id: str,
    ) -> dict:
        """
        Poll for generation status.
        
        Returns:
            Dict with status and URLs if completed
        """
        if self.mock_mode:
            # Mock polling - simulate progressive status
            await asyncio.sleep(2.0)
            
            # Deterministic status based on time
            elapsed = int(time.time()) % 30
            
            if elapsed < 5:
                return {"status": "processing", "progress": 15}
            elif elapsed < 10:
                return {"status": "processing", "progress": 40}
            elif elapsed < 15:
                return {"status": "processing", "progress": 65}
            elif elapsed < 20:
                return {"status": "processing", "progress": 85}
            else:
                # Return mock asset URLs
                dasha = self._extract_dasha_from_generation_id(generation_id)
                return {
                    "status": "completed",
                    "progress": 100,
                    "assets": {
                        "glb": f"mock://fallback/{dasha}_world.glb",
                        "splat": f"mock://fallback/{dasha}_world.splat",
                    },
                }
        
        response = await self.client.get(f"/worlds/{generation_id}/status")
        response.raise_for_status()
        return response.json()
    
    async def download_assets(
        self,
        asset_urls: dict,
        job_id: str,
    ) -> Tuple[str, str]:
        """
        Download .glb and .splat assets.
        
        Returns:
            Tuple of (splat_path, glb_path) relative to storage
        """
        storage_path = Path(settings.ASSET_STORAGE_PATH)
        storage_path.mkdir(parents=True, exist_ok=True)
        
        job_path = storage_path / job_id
        job_path.mkdir(parents=True, exist_ok=True)
        
        splat_path = job_path / "world.splat"
        glb_path = job_path / "world.glb"
        
        if self.mock_mode:
            # In mock mode, copy from fallback worlds
            dasha = self._extract_dasha_from_job_id(job_id)
            await self._copy_fallback_assets(dasha, splat_path, glb_path)
            return (
                f"/assets/{job_id}/world.splat",
                f"/assets/{job_id}/world.glb",
            )
        
        # Download splat
        if "splat" in asset_urls:
            async with self.client.stream("GET", asset_urls["splat"]) as response:
                response.raise_for_status()
                with open(splat_path, "wb") as f:
                    async for chunk in response.aiter_bytes():
                        f.write(chunk)
        
        # Download glb
        if "glb" in asset_urls:
            async with self.client.stream("GET", asset_urls["glb"]) as response:
                response.raise_for_status()
                with open(glb_path, "wb") as f:
                    async for chunk in response.aiter_bytes():
                        f.write(chunk)
        
        return (
            f"/assets/{job_id}/world.splat",
            f"/assets/{job_id}/world.glb",
        )
    
    async def generate_with_polling(
        self,
        prompt: str,
        dasha: DashaPlanet,
        job_id: str,
        max_wait_seconds: int = 300,
        poll_interval: int = 5,
    ) -> dict:
        """
        Submit generation and poll until completion or timeout.
        
        Returns:
            Dict with final status and asset URLs
        """
        # Submit
        submission = await self.submit_generation(prompt, dasha, job_id)
        generation_id = submission["generation_id"]
        
        # Poll
        start_time = time.time()
        while time.time() - start_time < max_wait_seconds:
            status = await self.poll_generation_status(generation_id)
            
            if status["status"] == "completed":
                # Download assets
                splat_url, glb_url = await self.download_assets(
                    status.get("assets", {}),
                    job_id,
                )
                return {
                    "status": GenerationStatus.COMPLETED,
                    "splat_url": splat_url,
                    "glb_url": glb_url,
                    "generation_duration": time.time() - start_time,
                }
            
            if status["status"] == "failed":
                return {
                    "status": GenerationStatus.FAILED,
                    "error": status.get("error", "Unknown error"),
                }
            
            await asyncio.sleep(poll_interval)
        
        return {
            "status": GenerationStatus.FAILED,
            "error": "Timeout waiting for generation",
        }
    
    def _extract_dasha_from_generation_id(self, generation_id: str) -> str:
        """Extract dasha from mock generation ID."""
        # Mock IDs are like "mock_<job_id>" where job_id contains dasha
        parts = generation_id.split("_")
        if len(parts) >= 3:
            return parts[2] if parts[2] in [d.value for d in DashaPlanet] else "saturn"
        return "saturn"
    
    def _extract_dasha_from_job_id(self, job_id: str) -> str:
        """Extract dasha from job ID."""
        parts = job_id.split("_")
        if len(parts) >= 2:
            return parts[1] if parts[1] in [d.value for d in DashaPlanet] else "saturn"
        return "saturn"
    
    async def _copy_fallback_assets(
        self,
        dasha: str,
        splat_dest: Path,
        glb_dest: Path,
    ) -> None:
        """Copy fallback assets for mock mode."""
        fallback_path = Path(settings.FALLBACK_WORLDS_PATH)
        
        source_splat = fallback_path / f"{dasha}_world.splat"
        source_glb = fallback_path / f"{dasha}_world.glb"
        
        # If specific fallback doesn't exist, use saturn as default
        if not source_splat.exists():
            source_splat = fallback_path / "saturn_world.splat"
        if not source_glb.exists():
            source_glb = fallback_path / "saturn_world.glb"
        
        # Copy if source exists
        if source_splat.exists():
            import shutil
            shutil.copy(source_splat, splat_dest)
        else:
            # Create empty placeholder
            splat_dest.write_bytes(b"")
        
        if source_glb.exists():
            import shutil
            shutil.copy(source_glb, glb_dest)
        else:
            glb_dest.write_bytes(b"")
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Singleton instance
_world_labs_client: Optional[WorldLabsClient] = None


def get_world_labs_client() -> WorldLabsClient:
    """Get or create World Labs client singleton."""
    global _world_labs_client
    if _world_labs_client is None:
        _world_labs_client = WorldLabsClient()
    return _world_labs_client
