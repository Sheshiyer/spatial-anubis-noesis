"""
Tests for biome templates and prompt construction.
"""
import pytest

from app.schemas.schemas import DashaPlanet
from app.services.biome_templates import (
    construct_prompt,
    get_biome_template,
    get_biome_metadata,
    DASHA_BIOME_TEMPLATES,
)


def test_all_dasha_planets_have_templates():
    """Test that all 9 Dasha planets have biome templates."""
    for planet in DashaPlanet:
        assert planet in DASHA_BIOME_TEMPLATES, f"Missing template for {planet}"


def test_biome_template_structure():
    """Test that biome templates have all required fields."""
    required_fields = [
        "name",
        "description",
        "material_keywords",
        "lighting_preset",
        "atmosphere_description",
        "fog_config",
        "fog_density",
        "fog_color",
        "ambient_color",
        "prompt_template",
    ]
    
    for planet, template in DASHA_BIOME_TEMPLATES.items():
        for field in required_fields:
            assert field in template, f"Missing field {field} for {planet}"


def test_construct_prompt_returns_string():
    """Test that construct_prompt returns a non-empty string."""
    prompt = construct_prompt(DashaPlanet.SATURN, "seeker")
    
    assert isinstance(prompt, str)
    assert len(prompt) > 0
    assert "seeker" in prompt.lower() or "wanderer" in prompt.lower()


def test_construct_prompt_contains_dasha_keywords():
    """Test that prompt contains Dasha-specific keywords."""
    saturn_prompt = construct_prompt(DashaPlanet.SATURN, "seeker")
    assert "obsidian" in saturn_prompt.lower() or "shadow" in saturn_prompt.lower()
    
    venus_prompt = construct_prompt(DashaPlanet.VENUS, "mystic")
    assert "crystal" in venus_prompt.lower() or "garden" in venus_prompt.lower()
    
    mars_prompt = construct_prompt(DashaPlanet.MARS, "warrior")
    assert "battle" in mars_prompt.lower() or "crimson" in mars_prompt.lower()


def test_get_biome_template_returns_dict():
    """Test that get_biome_template returns the correct template."""
    template = get_biome_template(DashaPlanet.JUPITER)
    
    assert isinstance(template, dict)
    assert template["name"] == "Golden Temple Realm"


def test_get_biome_metadata_returns_schema():
    """Test that get_biome_metadata returns a BiomeMetadata object."""
    metadata = get_biome_metadata(DashaPlanet.MOON)
    
    assert metadata.material_keywords is not None
    assert len(metadata.material_keywords) > 0
    assert metadata.lighting_preset is not None
    assert metadata.fog_config is not None
    assert 0 <= metadata.fog_density <= 1


def test_all_biome_metadata_valid():
    """Test that all planets have valid biome metadata."""
    for planet in DashaPlanet:
        metadata = get_biome_metadata(planet)
        
        assert isinstance(metadata.material_keywords, list)
        assert len(metadata.material_keywords) >= 5
        assert isinstance(metadata.fog_density, float)
        assert metadata.fog_color.startswith("#")
        assert metadata.ambient_color.startswith("#")


@pytest.mark.parametrize("planet,expected_name", [
    (DashaPlanet.SATURN, "Obsidian Void"),
    (DashaPlanet.VENUS, "Crystalline Garden"),
    (DashaPlanet.JUPITER, "Golden Temple Realm"),
    (DashaPlanet.MARS, "Crimson Battlefield"),
    (DashaPlanet.SUN, "Solar Throne"),
    (DashaPlanet.MOON, "Silver Dreamscape"),
    (DashaPlanet.MERCURY, "Mercury Spire"),
    (DashaPlanet.RAHU, "Shadow Maze"),
    (DashaPlanet.KETU, "Emptiness Monastery"),
])
def test_planet_names(planet, expected_name):
    """Test that each planet has the expected biome name."""
    template = get_biome_template(planet)
    assert template["name"] == expected_name
