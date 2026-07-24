"""
Cartographer Engine - Meta-Engine Synthesis
Engine 13 of 13 - The Cartographer's Compass
"""
import time
from typing import Any, Dict, List, Optional


# Engine position map for 2D projection (matches frontend cartographerStore.ts)
ENGINE_POSITIONS: Dict[str, Dict[str, float]] = {
    # Tier 1: Inner Ring
    "vimshottari": {"x": 55, "y": -1, "z": 0},
    "iching": {"x": 51.55, "y": -1, "z": 4.76},
    "tarot": {"x": 45.95, "y": -1, "z": 2.94},
    "runes": {"x": 45.95, "y": -1, "z": -2.94},
    "numerology": {"x": 51.55, "y": -1, "z": -4.76},
    # Tier 2: Middle Ring
    "biorhythm": {"x": 60, "y": 0, "z": 0},
    "genekeys": {"x": 50, "y": 0, "z": 10},
    "humandesign": {"x": 40, "y": 0, "z": 0},
    "chronobiology": {"x": 50, "y": 0, "z": -10},
    # Tier 3: Outer Ring
    "decision-mirror": {"x": 65, "y": 2, "z": 0},
    "transits": {"x": 42.5, "y": 2, "z": 12.99},
    "somatic-canticle": {"x": 42.5, "y": 2, "z": -12.99},
}

# Significance thresholds
SIGNIFICANCE_THRESHOLDS = {
    "profound": 4,
    "major": 3,
    "moderate": 2,
}

CARTOGRAPHER_UNLOCK_THRESHOLD = 7


class CartographerEngine:
    """
    Cartographer meta-engine that synthesizes readings across all 12 engines.
    Detects convergent themes, calculates meta-patterns, generates 2D map
    projections, and produces narrative synthesis.
    """

    ENGINE_ID = "cartographer"
    ENGINE_NAME = "Cartographer's Compass"
    CATEGORY = "meta"
    RESPONSE_TIME_TARGET_MS = 300

    async def process(
        self,
        engine_readings: List[Dict[str, Any]],
        consulted_engines: Optional[List[str]] = None,
        coherence_score: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Process meta-synthesis across all engine readings.

        Args:
            engine_readings: Aggregated readings from consulted engines.
                Each reading: {engine_id, reading_id, timestamp, themes, keywords, coherence}
            consulted_engines: List of engine IDs that have been consulted.
            coherence_score: Current session coherence score (0-100).

        Returns:
            Meta-synthesis with patterns, map projection, and narrative.
        """
        start_time = time.time()

        consulted_engines = consulted_engines or [
            r.get("engine_id", "") for r in engine_readings
        ]

        # Detect meta-patterns across readings
        patterns = self._detect_meta_patterns(engine_readings)

        # Calculate convergence score
        convergence_score = self._calculate_convergence(
            engine_readings, patterns
        )

        # Generate 2D map projection
        map_projection = self._generate_map_projection(
            engine_readings, patterns
        )

        # Generate narrative
        narrative = self._generate_narrative(
            engine_readings, patterns, convergence_score
        )

        # Determine cartographer voice
        voice = self._determine_voice(len(consulted_engines))

        response_time = (time.time() - start_time) * 1000

        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "consulted_engines": consulted_engines,
            "consulted_count": len(consulted_engines),
            "patterns": [self._pattern_to_dict(p) for p in patterns],
            "convergence_score": convergence_score,
            "map": map_projection,
            "narrative": narrative,
            "cartographer_voice": voice,
        }

    def _detect_meta_patterns(
        self, readings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find convergent themes across engine readings."""
        # Collect all themes and their source engines
        theme_sources: Dict[str, List[str]] = {}

        for reading in readings:
            engine_id = reading.get("engine_id", "")
            themes = reading.get("themes", [])
            keywords = reading.get("keywords", [])

            for theme in themes + keywords:
                theme_lower = theme.lower()
                if theme_lower not in theme_sources:
                    theme_sources[theme_lower] = []
                if engine_id not in theme_sources[theme_lower]:
                    theme_sources[theme_lower].append(engine_id)

        # Build patterns from themes appearing in 2+ engines
        patterns = []
        for theme, engines in theme_sources.items():
            if len(engines) >= 2:
                significance = "moderate"
                for level, threshold in SIGNIFICANCE_THRESHOLDS.items():
                    if len(engines) >= threshold:
                        significance = level
                        break

                coherence = len(engines) / max(len(readings), 1)

                patterns.append({
                    "pattern_id": f"pattern-{theme}-{int(time.time() * 1000)}",
                    "name": f"{theme.title()} Convergence",
                    "description": (
                        f'The theme "{theme}" appears across '
                        f"{len(engines)} engines"
                    ),
                    "involved_engines": engines,
                    "coherence": round(coherence, 3),
                    "significance": significance,
                })

        # Sort by number of involved engines (most convergent first)
        patterns.sort(key=lambda p: len(p["involved_engines"]), reverse=True)

        return patterns

    def _calculate_convergence(
        self,
        readings: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]],
    ) -> float:
        """Calculate overall convergence score (0-100)."""
        if len(readings) < 2:
            return 50.0

        # Base score from number of readings
        base_score = min(70, 40 + len(readings) * 5)

        # Pattern bonus: more patterns with higher coherence = higher score
        pattern_bonus = 0.0
        if patterns:
            avg_coherence = sum(p["coherence"] for p in patterns) / len(patterns)
            pattern_bonus = min(30, len(patterns) * 5 * avg_coherence)

        convergence = base_score * 0.6 + pattern_bonus * 0.4
        return round(min(100, max(0, convergence)), 1)

    def _generate_map_projection(
        self,
        readings: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate 2D map projection with nodes and connections."""
        # Build nodes from readings
        nodes = []
        for reading in readings:
            engine_id = reading.get("engine_id", "")
            position = ENGINE_POSITIONS.get(engine_id, {"x": 50, "y": 0, "z": 0})

            nodes.append({
                "engine_id": engine_id,
                "position": position,
                "weight": 1,  # Could be based on reading history count
                "themes": reading.get("themes", []),
                "glow_intensity": reading.get("coherence", 0.5),
            })

        # Build connections from shared themes
        connections = []
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                shared = [
                    t for t in nodes[i]["themes"]
                    if t in nodes[j]["themes"]
                ]
                if shared:
                    max_themes = max(
                        len(nodes[i]["themes"]),
                        len(nodes[j]["themes"]),
                        1,
                    )
                    connections.append({
                        "from": nodes[i]["engine_id"],
                        "to": nodes[j]["engine_id"],
                        "weight": round(len(shared) / max_themes, 3),
                        "shared_themes": shared,
                    })

        return {
            "nodes": nodes,
            "connections": connections,
        }

    def _generate_narrative(
        self,
        readings: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]],
        convergence: float,
    ) -> str:
        """Generate synthesis narrative."""
        parts = []

        parts.append(
            f"Across {len(readings)} engines, "
            f"{len(patterns)} convergent patterns emerge..."
        )

        if patterns:
            top_patterns = patterns[:3]
            pattern_names = [p["name"] for p in top_patterns]
            parts.append(
                f"Primary convergences: {', '.join(pattern_names)}."
            )

        if convergence >= 80:
            parts.append(
                "Strong alignment across readings. The engines speak "
                "with remarkable unity — proceed with confidence."
            )
        elif convergence >= 60:
            parts.append(
                "Good alignment with subtle nuances. The primary themes "
                "hold, but attention to timing refines their expression."
            )
        elif convergence >= 40:
            parts.append(
                "Mixed signals suggest creative tension. Focus on the "
                "patterns that repeat and let contradictions inform depth."
            )
        else:
            parts.append(
                "An exploratory phase. The engines offer diverse perspectives — "
                "sit with the multiplicity before seeking synthesis."
            )

        return " ".join(parts)

    def _determine_voice(self, consulted_count: int) -> str:
        """Determine cartographer's narrative voice."""
        if consulted_count >= 10:
            return "revealing"
        elif consulted_count >= 5:
            return "guiding"
        else:
            return "observing"

    def _pattern_to_dict(self, pattern: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure pattern is serializable."""
        return {
            "pattern_id": pattern["pattern_id"],
            "name": pattern["name"],
            "description": pattern["description"],
            "involved_engines": pattern["involved_engines"],
            "coherence": pattern["coherence"],
            "significance": pattern["significance"],
        }

    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": (
                "Meta-engine that synthesizes readings across all 12 engines, "
                "detecting convergent patterns and generating map projections"
            ),
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
            "unlock_threshold": CARTOGRAPHER_UNLOCK_THRESHOLD,
            "supported_engines": list(ENGINE_POSITIONS.keys()),
        }
