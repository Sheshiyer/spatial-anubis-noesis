"""
9 Planetary Dasha biome prompt templates.
Maps each Dasha planet to biome description, material keywords, and atmosphere.
"""
from typing import Dict, List, Any

from app.schemas.schemas import DashaPlanet, BiomeMetadata


# Biome templates for each Dasha planet
DASHA_BIOME_TEMPLATES: Dict[DashaPlanet, Dict[str, Any]] = {
    DashaPlanet.SATURN: {
        "name": "Obsidian Void",
        "description": "A vast expanse of black volcanic glass, where jagged obsidian spires pierce through eternal twilight. Gravity feels heavy here, time moves slowly.",
        "material_keywords": [
            "obsidian",
            "black glass",
            "volcanic rock",
            "sharp crystalline edges",
            "basalt",
            "onyx",
            "shadow stone",
        ],
        "lighting_preset": "saturn_twilight",
        "atmosphere_description": "Deep purple and indigo fog, occasional lightning cracks through the void, stars barely visible through the obsidian haze",
        "fog_config": {
            "density": 0.025,
            "color": "#1a0a2e",
            "height_falloff": 0.5,
            "scattering": 0.8,
        },
        "fog_density": 0.025,
        "fog_color": "#1a0a2e",
        "ambient_color": "#0d0221",
        "prompt_template": (
            "Generate a mystical world of obsidian and shadow. "
            "Black volcanic glass formations rise from dark plains. "
            "The sky is deep purple twilight with distant stars. "
            "Atmosphere: heavy, contemplative, timeless. "
            "Lighting: dramatic rim lighting on crystalline edges. "
            "Style: ethereal, monumental, slightly ominous."
        ),
    },
    DashaPlanet.VENUS: {
        "name": "Crystalline Garden",
        "description": "A lush sanctuary of prismatic crystals and bioluminescent flora. Soft pink and emerald light filters through translucent formations. Beauty and harmony reign.",
        "material_keywords": [
            "rose quartz",
            "emerald crystal",
            "mother of pearl",
            "bioluminescent flora",
            "prismatic glass",
            "pink marble",
            "iridescent surfaces",
        ],
        "lighting_preset": "venus_soft_prismatic",
        "atmosphere_description": "Soft pink and green ambient glow, floating pollen particles, rainbow caustics dancing on surfaces",
        "fog_config": {
            "density": 0.008,
            "color": "#ffe4e1",
            "height_falloff": 0.3,
            "scattering": 0.4,
        },
        "fog_density": 0.008,
        "fog_color": "#ffe4e1",
        "ambient_color": "#f8e8e8",
        "prompt_template": (
            "Generate a breathtaking crystalline garden world. "
            "Rose quartz formations, emerald crystal trees, mother of pearl surfaces. "
            "Bioluminescent plants emit soft pink and green light. "
            "Atmosphere: romantic, harmonious, sensual. "
            "Lighting: soft prismatic caustics, gentle ambient glow. "
            "Style: ornate, beautiful, organic elegance."
        ),
    },
    DashaPlanet.JUPITER: {
        "name": "Golden Temple Realm",
        "description": "Majestic floating temples of gold and bronze suspended among massive gas clouds. Thunder rolls eternally in the distance. Wisdom and expansion permeate the air.",
        "material_keywords": [
            "gold",
            "bronze",
            "amber",
            "marble columns",
            "floating platforms",
            "storm clouds",
            "ivory",
        ],
        "lighting_preset": "jupiter_golden_storm",
        "atmosphere_description": "Golden-orange light with dramatic storm clouds, distant lightning illuminating massive floating structures",
        "fog_config": {
            "density": 0.015,
            "color": "#daa520",
            "height_falloff": 0.4,
            "scattering": 0.6,
        },
        "fog_density": 0.015,
        "fog_color": "#daa520",
        "ambient_color": "#fff8dc",
        "prompt_template": (
            "Generate a majestic realm of floating golden temples. "
            "Bronze and gold structures among dramatic storm clouds. "
            "Massive scale, wisdom and grandeur. "
            "Atmosphere: expansive, authoritative, benevolent. "
            "Lighting: golden hour with dramatic storm lighting. "
            "Style: classical architecture, mythical, grand."
        ),
    },
    DashaPlanet.MARS: {
        "name": "Crimson Battlefield",
        "description": "A landscape of red iron oxide dunes and ancient weapon-forges frozen in time. The ground pulses with buried aggression. Courage is tested here.",
        "material_keywords": [
            "rusted iron",
            "red sandstone",
            "blood crystal",
            "forged steel",
            "cooled lava",
            "cinnabar",
            "battle-worn bronze",
        ],
        "lighting_preset": "mars_crimson_dusk",
        "atmosphere_description": "Deep crimson and orange haze, dust particles in the air, heat shimmer rising from the ground",
        "fog_config": {
            "density": 0.02,
            "color": "#8b0000",
            "height_falloff": 0.4,
            "scattering": 0.7,
        },
        "fog_density": 0.02,
        "fog_color": "#8b0000",
        "ambient_color": "#4a0404",
        "prompt_template": (
            "Generate an intense crimson battlefield world. "
            "Red iron oxide dunes, ancient weapon forges, blood crystals. "
            "Warrior spirit permeates the landscape. "
            "Atmosphere: intense, courageous, confrontational. "
            "Lighting: harsh crsunset, dramatic shadows. "
            "Style: martial, raw, powerful."
        ),
    },
    DashaPlanet.SUN: {
        "name": "Solar Throne",
        "description": "A brilliant realm of pure light where golden palaces float in the corona of an eternal star. Truth burns away all shadows. Leadership radiates from every surface.",
        "material_keywords": [
            "pure gold",
            "solar crystal",
            "radiant light",
            "white marble",
            "sunstone",
            "citrine",
            "radiant energy",
        ],
        "lighting_preset": "sun_radiant",
        "atmosphere_description": "Blinding golden-white light, heat waves, solar flares in the distant sky, pure illumination",
        "fog_config": {
            "density": 0.005,
            "color": "#ffd700",
            "height_falloff": 0.2,
            "scattering": 0.9,
        },
        "fog_density": 0.005,
        "fog_color": "#ffd700",
        "ambient_color": "#fffacd",
        "prompt_template": (
            "Generate a brilliant solar throne world. "
            "Golden palaces floating in eternal light, solar crystals. "
            "Pure illumination, truth, leadership. "
            "Atmosphere: empowering, clear, commanding. "
            "Lighting: radiant, blinding, warm. "
            "Style: regal, divine, authoritative."
        ),
    },
    DashaPlanet.MOON: {
        "name": "Silver Dreamscape",
        "description": "An ethereal realm of silver mists and reflective pools. Reality bends softly at the edges. Intuition flows like water through the mind.",
        "material_keywords": [
            "silver",
            "moonstone",
            "reflective water",
            "pearl",
            "silver sand",
            "opal",
            "mirror surfaces",
        ],
        "lighting_preset": "moon_soft_silver",
        "atmosphere_description": "Soft silver-blue mist, gentle ripples on endless pools, bioluminescent moonflowers",
        "fog_config": {
            "density": 0.012,
            "color": "#c0c0c0",
            "height_falloff": 0.3,
            "scattering": 0.5,
        },
        "fog_density": 0.012,
        "fog_color": "#c0c0c0",
        "ambient_color": "#e6e6fa",
        "prompt_template": (
            "Generate an ethereal silver dreamscape world. "
            "Reflective pools, silver mists, moonstone formations. "
            "Dreamlike, intuitive, nurturing. "
            "Atmosphere: mysterious, emotional, flowing. "
            "Lighting: soft silver moonlight, gentle reflections. "
            "Style: ethereal, fluid, introspective."
        ),
    },
    DashaPlanet.MERCURY: {
        "name": "Mercury Spire",
        "description": "A lightning-fast realm of quicksilver rivers and crystalline information towers. Thought becomes form instantly. Communication dances through the air.",
        "material_keywords": [
            "quicksilver",
            "mercury",
            "silver mirror",
            "prism glass",
            "holographic crystal",
            "liquid metal",
            "data streams",
        ],
        "lighting_preset": "mercury_neural",
        "atmosphere_description": "Shimmering quicksilver vapor, electric blue energy arcs, information particles floating",
        "fog_config": {
            "density": 0.01,
            "color": "#e5e4e2",
            "height_falloff": 0.25,
            "scattering": 0.6,
        },
        "fog_density": 0.01,
        "fog_color": "#e5e4e2",
        "ambient_color": "#f0f8ff",
        "prompt_template": (
            "Generate a lightning-quick mercurial world. "
            "Quicksilver rivers, crystalline information towers. "
            "Communication, intellect, speed. "
            "Atmosphere: electric, cerebral, swift. "
            "Lighting: electric blue arcs, neural patterns. "
            "Style: futuristic, mental, intricate."
        ),
    },
    DashaPlanet.RAHU: {
        "name": "Shadow Maze",
        "description": "An unsettling labyrinth of smoky shadows and distorted reflections. Nothing is as it seems. Obsession and illusion grip the mind.",
        "material_keywords": [
            "smoke",
            "shadow",
            "distorted mirror",
            "dark glass",
            "eclipse darkness",
            "void stone",
            "twisted geometry",
        ],
        "lighting_preset": "rahu_eclipse",
        "atmosphere_description": "Swirling smoke shadows, distorted reality, eclipse-like darkness with ring of corrupted light",
        "fog_config": {
            "density": 0.03,
            "color": "#1a1a1a",
            "height_falloff": 0.6,
            "scattering": 0.3,
        },
        "fog_density": 0.03,
        "fog_color": "#1a1a1a",
        "ambient_color": "#0a0a0a",
        "prompt_template": (
            "Generate an unsettling shadow maze world. "
            "Smoke and shadow labyrinth, distorted reflections. "
            "Illusion, obsession, the unknown. "
            "Atmosphere: unsettling, mysterious, transformative. "
            "Lighting: eclipse darkness, corrupted light rings. "
            "Style: surreal, disorienting, psychological."
        ),
    },
    DashaPlanet.KETU: {
        "name": "Emptiness Monastery",
        "description": "A serene void of minimal forms and spiritual silence. Detachment brings clarity. The path to liberation opens through surrender.",
        "material_keywords": [
            "white void",
            "minimal stone",
            "emptiness",
            "pure light",
            "simple geometry",
            "ash",
            "transcendent white",
        ],
        "lighting_preset": "ketu_void",
        "atmosphere_description": "Pure white void with subtle form, infinite depth, spiritual calm, gentle floating particles",
        "fog_config": {
            "density": 0.006,
            "color": "#ffffff",
            "height_falloff": 0.1,
            "scattering": 0.95,
        },
        "fog_density": 0.006,
        "fog_color": "#ffffff",
        "ambient_color": "#ffffff",
        "prompt_template": (
            "Generate a serene emptiness monastery world. "
            "Minimal forms, white void, spiritual silence. "
            "Detachment, liberation, transcendence. "
            "Atmosphere: peaceful, empty, enlightened. "
            "Lighting: pure white, form-revealing, soft. "
            "Style: minimalist, zen, transcendent."
        ),
    },
}


def get_biome_template(planet: DashaPlanet) -> Dict[str, Any]:
    """Get biome template for a Dasha planet."""
    return DASHA_BIOME_TEMPLATES.get(planet, DASHA_BIOME_TEMPLATES[DashaPlanet.SATURN])


def construct_prompt(dasha: DashaPlanet, archetype: str) -> str:
    """
    Construct a World Labs prompt from Dasha planet and archetype.
    
    Args:
        dasha: The Dasha planet
        archetype: The user's archetype/role (e.g., "seeker", "warrior", "sage")
    
    Returns:
        Formatted prompt string for World Labs API
    """
    template = get_biome_template(dasha)
    
    # Archetype modifiers
    archetype_modifiers = {
        "seeker": "journey of discovery, hidden paths, ancient wisdom",
        "warrior": "test of strength, battle remnants, honorable combat",
        "sage": "contemplation spaces, knowledge artifacts, serene study",
        "mystic": "sacred geometry, ritual spaces, esoteric symbols",
        "wanderer": "endless horizons, resting places, nomadic elements",
        "builder": "construction sites, materials and tools, foundation stones",
        "healer": "restoration pools, medicinal flora, sanctuary spaces",
        "trickster": "hidden passages, illusion elements, playful surprises",
    }
    
    modifier = archetype_modifiers.get(archetype.lower(), f"{archetype} essence")
    
    prompt = (
        f"{template['prompt_template']} "
        f"Archetype elements: {modifier}. "
        f"High quality 3D world, immersive environment, "
        f"detailed materials: {', '.join(template['material_keywords'][:4])}. "
        f"Atmospheric lighting, suitable for exploration and meditation."
    )
    
    return prompt


def get_biome_metadata(planet: DashaPlanet) -> BiomeMetadata:
    """Get BiomeMetadata object for a Dasha planet."""
    template = get_biome_template(planet)
    return BiomeMetadata(
        material_keywords=template["material_keywords"],
        lighting_preset=template["lighting_preset"],
        fog_config=template["fog_config"],
        fog_density=template["fog_density"],
        fog_color=template["fog_color"],
        ambient_color=template["ambient_color"],
        atmosphere_description=template["atmosphere_description"],
    )
