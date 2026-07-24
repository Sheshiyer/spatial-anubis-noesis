"""
Human Design System Data
Based on Ra Uru Hu's Human Design System.
"""

from typing import Dict, List, Tuple

# Human Design Types
HD_TYPES: Dict[str, Dict] = {
    "generator": {
        "name": "Generator",
        "strategy": "To Respond",
        "authority": "Sacral",
        "description": "Builders of the world. Have sustainable energy to work and create.",
        "percentage": 37,
        "signature": "Satisfaction",
        "not_self": "Frustration",
        "key_traits": ["Sustainable energy", "Work force", "Sacral power"],
    },
    "manifesting_generator": {
        "name": "Manifesting Generator",
        "strategy": "To Respond, then Inform",
        "authority": "Sacral",
        "description": "Hybrid type with both manifesting and generating capabilities.",
        "percentage": 32,
        "signature": "Satisfaction",
        "not_self": "Frustration/Anger",
        "key_traits": ["Fast manifestation", "Multi-tasking", "Efficient"],
    },
    "projector": {
        "name": "Projector",
        "strategy": "Wait for the Invitation",
        "authority": "Self-Projected/Splenic",
        "description": "Guides and directors of energy. Natural leaders when recognized.",
        "percentage": 21,
        "signature": "Success",
        "not_self": "Bitterness",
        "key_traits": ["Guidance", "Wisdom", "Recognition"],
    },
    "manifestor": {
        "name": "Manifestor",
        "strategy": "To Inform",
        "authority": "Ego/Throat",
        "description": "Initiators who can act independently. Born to impact others.",
        "percentage": 8,
        "signature": "Peace",
        "not_self": "Anger",
        "key_traits": ["Initiation", "Independence", "Impact"],
    },
    "reflector": {
        "name": "Reflector",
        "strategy": "Wait a Lunar Cycle",
        "authority": "Lunar/None",
        "description": "Mirrors of the community. Rare type that samples and reflects.",
        "percentage": 1,
        "signature": "Surprise",
        "not_self": "Disappointment",
        "key_traits": ["Reflecting", "Sampling", "Lunar connection"],
    },
}

# Centers
HD_CENTERS: Dict[str, Dict] = {
    "head": {
        "name": "Head Center",
        "location": "Top",
        "theme": "Inspiration, Questions, Mental Pressure",
        "biological": "Pineal Gland",
        "functions": ["Mental inspiration", "Questions", "Confusion"],
    },
    "ajna": {
        "name": "Ajna Center",
        "location": "Forehead",
        "theme": "Conceptualization, Awareness",
        "biological": "Pituitary Gland",
        "functions": ["Mental processing", "Conceptualization", "Analysis"],
    },
    "throat": {
        "name": "Throat Center",
        "location": "Throat",
        "theme": "Communication, Expression, Action",
        "biological": "Thyroid, Parathyroid",
        "functions": ["Communication", "Expression", "Manifestation"],
    },
    "g": {
        "name": "G Center (Identity)",
        "location": "Heart/Chest",
        "theme": "Identity, Direction, Love",
        "biological": "Liver",
        "functions": ["Self-identity", "Direction", "Love"],
    },
    "heart": {
        "name": "Heart Center (Ego)",
        "location": "Solar Plexus/Heart",
        "theme": "Willpower, Ego, Worthiness",
        "biological": "Heart, Stomach",
        "functions": ["Willpower", "Material world", "Self-worth"],
    },
    "sacral": {
        "name": "Sacral Center",
        "location": "Lower Abdomen",
        "theme": "Life Force, Work Force, Sexuality",
        "biological": "Ovaries/Testes",
        "functions": ["Life force", "Work force", "Fertility"],
    },
    "spleen": {
        "name": "Spleen Center",
        "location": "Left Side/Ribs",
        "theme": "Intuition, Survival, Health",
        "biological": "Spleen, Lymphatic",
        "functions": ["Intuition", "Survival", "Immune system"],
    },
    "solar_plexus": {
        "name": "Solar Plexus Center",
        "location": "Solar Plexus",
        "theme": "Emotions, Passion, Desire",
        "biological": "Kidneys, Pancreas",
        "functions": ["Emotional awareness", "Passion", "Desire"],
    },
    "root": {
        "name": "Root Center",
        "location": "Base of Spine",
        "theme": "Pressure, Drive, Adrenaline",
        "biological": "Adrenal Glands",
        "functions": ["Stress pressure", "Drive", "Adrenaline"],
    },
}

# Channels (36 total)
HD_CHANNELS: Dict[int, Dict] = {
    # Individual Channels
    1: {"number": 1, "gates": (1, 8), "name": "Inspiration", "circuit": "Individual"},
    2: {"number": 2, "gates": (2, 14), "name": "Beat", "circuit": "Individual"},
    3: {"number": 3, "gates": (3, 60), "name": "Mutation", "circuit": "Individual"},
    4: {"number": 4, "gates": (4, 63), "name": "Logic", "circuit": "Collective"},
    5: {"number": 5, "gates": (5, 15), "name": "Rhythm", "circuit": "Collective"},
    6: {"number": 6, "gates": (6, 59), "name": "Mating", "circuit": "Tribal"},
    7: {"number": 7, "gates": (7, 31), "name": "Alpha", "circuit": "Collective"},
    8: {"number": 8, "gates": (9, 52), "name": "Concentration", "circuit": "Collective"},
    9: {"number": 9, "gates": (10, 20), "name": "Awakening", "circuit": "Individual"},
    10: {"number": 10, "gates": (10, 34), "name": "Exploration", "circuit": "Individual"},
    11: {"number": 11, "gates": (11, 56), "name": "Curiosity", "circuit": "Collective"},
    12: {"number": 12, "gates": (12, 22), "name": "Openness", "circuit": "Collective"},
    13: {"number": 13, "gates": (13, 33), "name": "Prodigal", "circuit": "Collective"},
    14: {"number": 14, "gates": (16, 48), "name": "Wavelength", "circuit": "Collective"},
    15: {"number": 15, "gates": (17, 62), "name": "Acceptance", "circuit": "Collective"},
    16: {"number": 16, "gates": (18, 58), "name": "Judgment", "circuit": "Collective"},
    17: {"number": 17, "gates": (19, 49), "name": "Synthesis", "circuit": "Tribal"},
    18: {"number": 18, "gates": (20, 34), "name": "Charisma", "circuit": "Individual"},
    19: {"number": 19, "gates": (20, 57), "name": "Brainwave", "circuit": "Individual"},
    20: {"number": 20, "gates": (21, 45), "name": "Money Line", "circuit": "Tribal"},
    21: {"number": 21, "gates": (23, 43), "name": "Structuring", "circuit": "Individual"},
    22: {"number": 22, "gates": (24, 61), "name": "Awareness", "circuit": "Individual"},
    23: {"number": 23, "gates": (25, 51), "name": "Initiation", "circuit": "Individual"},
    24: {"number": 24, "gates": (26, 44), "name": "Surrender", "circuit": "Tribal"},
    25: {"number": 25, "gates": (27, 50), "name": "Preservation", "circuit": "Tribal"},
    26: {"number": 26, "gates": (28, 38), "name": "Struggle", "circuit": "Individual"},
    27: {"number": 27, "gates": (29, 46), "name": "Discovery", "circuit": "Collective"},
    28: {"number": 28, "gates": (32, 54), "name": "Transformation", "circuit": "Tribal"},
    29: {"number": 29, "gates": (34, 57), "name": "Power", "circuit": "Individual"},
    30: {"number": 30, "gates": (35, 36), "name": "Transitoriness", "circuit": "Collective"},
    31: {"number": 31, "gates": (37, 40), "name": "Community", "circuit": "Tribal"},
    32: {"number": 32, "gates": (39, 55), "name": "Emoting", "circuit": "Individual"},
    33: {"number": 33, "gates": (41, 30), "name": "Recognition", "circuit": "Collective"},
    34: {"number": 34, "gates": (42, 53), "name": "Maturing", "circuit": "Collective"},
    35: {"number": 35, "gates": (47, 64), "name": "Abstraction", "circuit": "Collective"},
    36: {"number": 36, "gates": (50, 27), "name": "Preservation", "circuit": "Tribal"},
}

# All 64 Gates
HD_GATES: Dict[int, Dict] = {
    1: {"number": 1, "name": "The Creative", "center": "g", "line": "Self-expression"},
    2: {"number": 2, "name": "The Receptive", "center": "g", "line": "Direction"},
    3: {"number": 3, "name": "Difficulty", "center": "sacral", "line": "Ordering"},
    4: {"number": 4, "name": "Youthful Folly", "center": "ajna", "line": "Formulization"},
    5: {"number": 5, "name": "Waiting", "center": "sacral", "line": "Fixed Patterns"},
    6: {"number": 6, "name": "Conflict", "center": "solar_plexus", "line": "Friction"},
    7: {"number": 7, "name": "The Army", "center": "g", "line": "The Role of Self"},
    8: {"number": 8, "name": "Holding Together", "center": "throat", "line": "Contribution"},
    9: {"number": 9, "name": "Small Power", "center": "sacral", "line": "Focus"},
    10: {"number": 10, "name": "Treading", "center": "g", "line": "Behavior"},
    11: {"number": 11, "name": "Peace", "center": "ajna", "line": "Ideas"},
    12: {"number": 12, "name": "Standstill", "center": "throat", "line": "Caution"},
    13: {"number": 13, "name": "Fellowship", "center": "g", "line": "The Listener"},
    14: {"number": 14, "name": "Possession", "center": "sacral", "line": "Power Skills"},
    15: {"number": 15, "name": "Modesty", "center": "g", "line": "Extremes"},
    16: {"number": 16, "name": "Enthusiasm", "center": "throat", "line": "Skills"},
    17: {"number": 17, "name": "Following", "center": "ajna", "line": "Opinions"},
    18: {"number": 18, "name": "Work on Decay", "center": "spleen", "line": "Correction"},
    19: {"number": 19, "name": "Approach", "center": "root", "line": "Wanting"},
    20: {"number": 20, "name": "Contemplation", "center": "throat", "line": "Now"},
    21: {"number": 21, "name": "Biting Through", "center": "heart", "line": "Control"},
    22: {"number": 22, "name": "Grace", "center": "solar_plexus", "line": "Openness"},
    23: {"number": 23, "name": "Splitting Apart", "center": "throat", "line": "Assimilation"},
    24: {"number": 24, "name": "Return", "center": "ajna", "line": "Rationalization"},
    25: {"number": 25, "name": "Innocence", "center": "g", "line": "The Spirit of Self"},
    26: {"number": 26, "name": "Taming Power", "center": "heart", "line": "The Trickster"},
    27: {"number": 27, "name": "Nourishment", "center": "sacral", "line": "Care"},
    28: {"number": 28, "name": "Preponderance", "center": "spleen", "line": "Risk"},
    29: {"number": 29, "name": "The Abysmal", "center": "sacral", "line": "Perseverance"},
    30: {"number": 30, "name": "The Clinging", "center": "solar_plexus", "line": "Feelings"},
    31: {"number": 31, "name": "Influence", "center": "throat", "line": "Leading"},
    32: {"number": 32, "name": "Duration", "center": "spleen", "line": "Continuity"},
    33: {"number": 33, "name": "Retreat", "center": "throat", "line": "Privacy"},
    34: {"number": 34, "name": "Power", "center": "sacral", "line": "Exploration"},
    35: {"number": 35, "name": "Progress", "center": "throat", "line": "Change"},
    36: {"number": 36, "name": "Darkening Light", "center": "solar_plexus", "line": "Crisis"},
    37: {"number": 37, "name": "The Family", "center": "solar_plexus", "line": "Friendship"},
    38: {"number": 38, "name": "Opposition", "center": "root", "line": "The Fighter"},
    39: {"number": 39, "name": "Obstruction", "center": "root", "line": "Provocation"},
    40: {"number": 40, "name": "Deliverance", "center": "solar_plexus", "line": "Aloneness"},
    41: {"number": 41, "name": "Decrease", "center": "root", "line": "Contraction"},
    42: {"number": 42, "name": "Increase", "center": "sacral", "line": "Expansion"},
    43: {"number": 43, "name": "Break-through", "center": "ajna", "line": "Insight"},
    44: {"number": 44, "name": "Coming to Meet", "center": "spleen", "line": "Alertness"},
    45: {"number": 45, "name": "Gathering", "center": "throat", "line": "The Gatherer"},
    46: {"number": 46, "name": "Pushing Upward", "center": "g", "line": "Determination"},
    47: {"number": 47, "name": "Oppression", "center": "ajna", "line": "Realization"},
    48: {"number": 48, "name": "The Well", "center": "spleen", "line": "Depth"},
    49: {"number": 49, "name": "Revolution", "center": "solar_plexus", "line": "Principles"},
    50: {"number": 50, "name": "The Cauldron", "center": "spleen", "line": "Values"},
    51: {"number": 51, "name": "The Arousing", "center": "heart", "line": "Shock"},
    52: {"number": 52, "name": "Keeping Still", "center": "root", "line": "Concentration"},
    53: {"number": 53, "name": "Development", "center": "root", "line": "Beginnings"},
    54: {"number": 54, "name": "Marrying Maiden", "center": "root", "line": "Drive"},
    55: {"number": 55, "name": "Abundance", "center": "solar_plexus", "line": "Spirit"},
    56: {"number": 56, "name": "The Wanderer", "center": "throat", "line": "Stimulation"},
    57: {"number": 57, "name": "The Gentle", "center": "spleen", "line": "Intuition"},
    58: {"number": 58, "name": "The Joyous", "center": "root", "line": "Vitality"},
    59: {"number": 59, "name": "Dispersion", "center": "sacral", "line": "Sexuality"},
    60: {"number": 60, "name": "Limitation", "center": "root", "line": "Acceptance"},
    61: {"number": 61, "name": "Inner Truth", "center": "head", "line": "Mystery"},
    62: {"number": 62, "name": "Preponderance", "center": "throat", "line": "Detail"},
    63: {"number": 63, "name": "After Completion", "center": "head", "line": "Doubt"},
    64: {"number": 64, "name": "Before Completion", "center": "head", "line": "Confusion"},
}

# Profiles (12 total)
HD_PROFILES: Dict[int, Dict] = {
    1: {"number": 1, "name": "Investigator", "role": "Martyr", "description": "Deep research and investigation"},
    2: {"number": 2, "name": "Hermit", "role": "Hermit", "description": "Natural genius, needs alone time"},
    3: {"number": 3, "name": "Martyr", "role": "Martyr", "description": "Trial and error discovery"},
    4: {"number": 4, "name": "Opportunist", "role": "Opportunist", "description": "Network and opportunity based"},
    5: {"number": 5, "name": "Heretic", "role": "Heretic", "description": "Practical solutions for others"},
    6: {"number": 6, "name": "Role Model", "role": "Role Model", "description": "Three-phase life process"},
}


def determine_type(defined_centers: List[str]) -> str:
    """Determine Human Design type from defined centers."""
    has_sacral = "sacral" in defined_centers
    has_motor_to_throat = any(c in defined_centers for c in ["solar_plexus", "heart", "root"]) and "throat" in defined_centers
    
    if not has_sacral:
        if has_motor_to_throat:
            return "manifestor"
        else:
            return "projector"
    else:
        if has_motor_to_throat:
            return "manifesting_generator"
        else:
            return "generator"
    
    # Reflector check - all centers undefined
    if len(defined_centers) == 0:
        return "reflector"
    
    return "generator"  # Default


def get_channels_for_gates(gates: List[int]) -> List[Dict]:
    """Get active channels from activated gates."""
    active_channels = []
    gate_set = set(gates)
    
    for channel in HD_CHANNELS.values():
        g1, g2 = channel["gates"]
        if g1 in gate_set and g2 in gate_set:
            active_channels.append(channel)
    
    return active_channels
