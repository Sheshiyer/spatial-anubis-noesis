"""
Tests for services (World Labs client, collision mesh, splat compression).
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
import numpy as np
from pathlib import Path

from app.services.world_labs_client import WorldLabsClient
from app.services.splat_compression import SplatCompressor, compress_splat_file
from app.schemas.schemas import DashaPlanet


class TestWorldLabsClient:
    """Tests for WorldLabsClient."""
    
    @pytest.fixture
    def client(self):
        return WorldLabsClient()
    
    @pytest.mark.asyncio
    async def test_submit_generation_mock_mode(self, client):
        """Test submit_generation in mock mode."""
        result = await client.submit_generation(
            prompt="test prompt",
            dasha=DashaPlanet.SATURN,
            job_id="test_job_123",
        )
        
        assert "generation_id" in result
        assert result["status"] == "processing"
        assert "estimated_seconds" in result
    
    @pytest.mark.asyncio
    async def test_poll_generation_status_mock_mode(self, client):
        """Test poll_generation_status in mock mode."""
        result = await client.poll_generation_status("mock_test_saturn_123")
        
        assert "status" in result
        assert result["status"] in ["processing", "completed"]
    
    @pytest.mark.asyncio
    async def test_generate_with_polling_mock_mode(self, client, tmp_path):
        """Test full generation flow in mock mode."""
        import os
        os.makedirs("storage/assets/test_job", exist_ok=True)
        
        result = await client.generate_with_polling(
            prompt="test",
            dasha=DashaPlanet.SATURN,
            job_id="test_job",
            max_wait_seconds=5,
        )
        
        assert "status" in result
        assert result["status"] in ["completed", "failed"]


class TestSplatCompression:
    """Tests for splat compression."""
    
    def test_splat_compressor_init(self):
        """Test SplatCompressor initialization."""
        compressor = SplatCompressor(downsample_factor=0.6, quantize_sh=True)
        
        assert compressor.downsample_factor == 0.6
        assert compressor.quantize_sh is True
    
    def test_estimate_psnr(self):
        """Test PSNR estimation."""
        compressor = SplatCompressor()
        
        # No compression should have high PSNR
        high_psnr = compressor._estimate_psnr(1.0)
        assert high_psnr >= 45
        
        # 40% compression should be around 30-40 dB
        med_psnr = compressor._estimate_psnr(0.4)
        assert 25 <= med_psnr <= 45
    
    def test_validate_compression(self):
        """Test compression validation."""
        compressor = SplatCompressor()
        
        # Good compression
        good_stats = {
            "compression_ratio": 0.35,
            "estimated_psnr_db": 35,
        }
        assert compressor.validate_compression(good_stats) is True
        
        # Too large
        bad_size_stats = {
            "compression_ratio": 0.5,
            "estimated_psnr_db": 35,
        }
        assert compressor.validate_compression(bad_size_stats) is False
        
        # Too low quality
        bad_quality_stats = {
            "compression_ratio": 0.3,
            "estimated_psnr_db": 25,
        }
        assert compressor.validate_compression(bad_quality_stats) is False


class TestBiomeTemplates:
    """Tests for biome template service."""
    
    def test_construct_prompt_returns_string(self):
        """Test that construct_prompt returns a formatted string."""
        from app.services.biome_templates import construct_prompt
        
        prompt = construct_prompt(DashaPlanet.SATURN, "seeker")
        
        assert isinstance(prompt, str)
        assert len(prompt) > 0
    
    def test_all_archetypes_work(self):
        """Test that all archetypes can be used."""
        from app.services.biome_templates import construct_prompt
        
        archetypes = ["seeker", "warrior", "sage", "mystic", "wanderer", "builder", "healer", "trickster"]
        
        for archetype in archetypes:
            prompt = construct_prompt(DashaPlanet.VENUS, archetype)
            assert isinstance(prompt, str)
            assert len(prompt) > 0
    
    def test_unknown_archetype_defaults_to_essence(self):
        """Test that unknown archetype uses the value as modifier."""
        from app.services.biome_templates import construct_prompt
        
        prompt = construct_prompt(DashaPlanet.JUPITER, "unknown_archetype")
        
        assert "unknown_archetype essence" in prompt
