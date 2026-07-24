"""
Sigil Compiler Engine
P4-S1-21: Generate procedural SVG sigils from intention and engine readings

Takes intention text and engine readings as input.
Generates procedural SVG path based on input hashes.
Returns SVG path data for 3D rendering.
"""

import hashlib
import math
import time
from typing import Any, Dict, List, Optional


class SigilCompilerEngine:
    """
    Sigil Compiler engine for generating procedural SVG sigils.
    Combines intention text with engine readings to create unique glyphs.
    """

    ENGINE_ID = "sigil-compiler"
    ENGINE_NAME = "Sigil Compiler"
    CATEGORY = "synthesis"
    RESPONSE_TIME_TARGET_MS = 150

    # Geometric primitives for sigil generation
    PRIMITIVES = [
        "circle",
        "line",
        "arc",
        "curve",
        "triangle",
        "square",
        "star",
        "spiral",
    ]

    async def compile(
        self,
        intention: str,
        engine_readings: Optional[List[Dict[str, Any]]] = None,
        coherence: float = 0.5,
        lqd: float = 0.5,
        entropy: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Compile sigil from intention and readings.

        Args:
            intention: User's intention text
            engine_readings: Optional engine reading data
            coherence: Coherence reading (0-1)
            lqd: LQD reading (0-1)
            entropy: Entropy reading (0-1)

        Returns:
            Sigil data with SVG path and metadata
        """
        start_time = time.time()

        # Generate hash from intention
        intention_hash = self._hash_intention(intention)

        # Extract numeric seeds from hash
        seeds = self._extract_seeds(intention_hash)

        # Combine with engine readings if provided
        if engine_readings:
            reading_influence = self._calculate_reading_influence(engine_readings)
            seeds = self._blend_seeds(seeds, reading_influence)

        # Apply bio-signal modulation
        seeds = self._apply_bio_modulation(seeds, coherence, lqd, entropy)

        # Generate SVG path
        svg_path = self._generate_svg_path(seeds)

        # Calculate complexity
        complexity = self._calculate_complexity(svg_path)

        response_time = (time.time() - start_time) * 1000

        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "sigil": {
                "svg_path": svg_path,
                "complexity": complexity,
                "intention_hash": intention_hash,
                "seeds": seeds,
            },
            "metadata": {
                "intention_length": len(intention),
                "coherence": coherence,
                "lqd": lqd,
                "entropy": entropy,
                "num_readings": len(engine_readings) if engine_readings else 0,
            },
        }

    def _hash_intention(self, intention: str) -> str:
        """Generate SHA-256 hash from intention text."""
        return hashlib.sha256(intention.encode("utf-8")).hexdigest()

    def _extract_seeds(self, hash_str: str) -> List[float]:
        """Extract numeric seeds from hash (0-1 range)."""
        seeds = []
        chunk_size = 8
        for i in range(0, len(hash_str), chunk_size):
            chunk = hash_str[i : i + chunk_size]
            seed = int(chunk, 16) / (16**chunk_size)
            seeds.append(seed)
        return seeds[:8]  # Use first 8 seeds

    def _calculate_reading_influence(
        self, readings: List[Dict[str, Any]]
    ) -> List[float]:
        """Calculate influence factors from engine readings."""
        if not readings:
            return [0.5] * 8

        influence = []

        for reading in readings[:8]:  # Max 8 readings
            # Extract numeric value from reading
            # Simple heuristic: hash the reading content
            reading_str = str(reading)
            reading_hash = hashlib.md5(reading_str.encode("utf-8")).hexdigest()
            value = int(reading_hash[:8], 16) / (16**8)
            influence.append(value)

        # Pad if fewer than 8 readings
        while len(influence) < 8:
            influence.append(0.5)

        return influence

    def _blend_seeds(
        self, seeds: List[float], influence: List[float]
    ) -> List[float]:
        """Blend intention seeds with reading influence."""
        blended = []
        for i in range(min(len(seeds), len(influence))):
            # Weighted average (70% intention, 30% readings)
            blended.append(seeds[i] * 0.7 + influence[i] * 0.3)
        return blended

    def _apply_bio_modulation(
        self,
        seeds: List[float],
        coherence: float,
        lqd: float,
        entropy: float,
    ) -> List[float]:
        """Apply bio-signal modulation to seeds."""
        modulated = []

        for i, seed in enumerate(seeds):
            # Coherence affects overall smoothness
            coherence_factor = 0.8 + coherence * 0.4

            # LQD affects scale/energy
            lqd_factor = 0.8 + lqd * 0.4

            # Entropy affects randomness
            entropy_factor = 1.0 - entropy * 0.3

            modulated_seed = seed * coherence_factor * lqd_factor * entropy_factor
            modulated_seed = max(0, min(1, modulated_seed))  # Clamp to 0-1
            modulated.append(modulated_seed)

        return modulated

    def _generate_svg_path(self, seeds: List[float]) -> str:
        """Generate SVG path from seeds."""
        # Use seeds to determine sigil geometry
        num_points = int(3 + seeds[0] * 8)  # 3-11 points
        radius_outer = 0.7 + seeds[1] * 0.2  # 0.7-0.9
        radius_inner = 0.3 + seeds[2] * 0.3  # 0.3-0.6
        rotation_offset = seeds[3] * math.pi * 2  # 0-2π
        curvature = seeds[4]  # 0-1
        symmetry = int(2 + seeds[5] * 4)  # 2-6 fold symmetry

        path_commands = []

        # Generate points based on symmetry
        for sym in range(symmetry):
            angle_offset = (sym / symmetry) * math.pi * 2

            for i in range(num_points):
                angle = (i / num_points) * math.pi * 2 + angle_offset + rotation_offset
                radius = radius_outer if i % 2 == 0 else radius_inner

                # Apply curvature using seeds[6] and seeds[7]
                radius *= 1 + (math.sin(angle * 3 + seeds[6] * math.pi) * curvature * 0.2)

                x = math.cos(angle) * radius
                y = math.sin(angle) * radius

                if sym == 0 and i == 0:
                    path_commands.append(f"M {x:.3f} {y:.3f}")
                else:
                    # Use curves for smoother paths
                    if curvature > 0.5:
                        # Bezier curve with control points
                        prev_angle = angle - (math.pi * 2 / num_points)
                        control_dist = radius * 0.5
                        cx1 = math.cos(prev_angle + 0.5) * control_dist
                        cy1 = math.sin(prev_angle + 0.5) * control_dist
                        cx2 = math.cos(angle - 0.5) * control_dist
                        cy2 = math.sin(angle - 0.5) * control_dist
                        path_commands.append(
                            f"C {cx1:.3f} {cy1:.3f}, {cx2:.3f} {cy2:.3f}, {x:.3f} {y:.3f}"
                        )
                    else:
                        path_commands.append(f"L {x:.3f} {y:.3f}")

        # Close path
        path_commands.append("Z")

        return " ".join(path_commands)

    def _calculate_complexity(self, svg_path: str) -> float:
        """Calculate sigil complexity score (0-1)."""
        # Count path commands
        commands = ["M", "L", "C", "Q", "A", "Z"]
        command_count = sum(svg_path.count(cmd) for cmd in commands)

        # Normalize to 0-1 (assuming max ~50 commands)
        complexity = min(1.0, command_count / 50)

        return round(complexity, 2)

    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Generates procedural SVG sigils from intention and readings",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
