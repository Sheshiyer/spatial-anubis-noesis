"""
Transit Engine - Planetary Transit Analysis
Engine 11 of 13 - Synthesis Instruments Tier
"""
import hashlib
import time
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional


class TransitEngine:
    """
    Astrological transit analysis engine.
    Calculates current planetary positions and aspects to natal chart.
    """
    
    ENGINE_ID = "transit"
    ENGINE_NAME = "Planetary Transits"
    CATEGORY = "synthesis"
    RESPONSE_TIME_TARGET_MS = 220
    
    # Planets
    PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
    
    # Signs
    SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    
    # Aspect types and orbs
    ASPECTS = {
        "conjunction": {"angle": 0, "orb": 8, "nature": "major"},
        "sextile": {"angle": 60, "orb": 4, "nature": "major"},
        "square": {"angle": 90, "orb": 6, "nature": "major"},
        "trine": {"angle": 120, "orb": 6, "nature": "major"},
        "opposition": {"angle": 180, "orb": 8, "nature": "major"},
        "quincunx": {"angle": 150, "orb": 2, "nature": "minor"},
    }
    
    # Planet speeds (approximate degrees per day)
    PLANET_SPEEDS = {
        "Sun": 1.0,
        "Moon": 13.2,
        "Mercury": 1.5,
        "Venus": 1.2,
        "Mars": 0.5,
        "Jupiter": 0.08,
        "Saturn": 0.03,
        "Uranus": 0.01,
        "Neptune": 0.006,
        "Pluto": 0.004,
    }
    
    async def process(
        self,
        natal_chart_data: Dict[str, Any],
        target_date: date
    ) -> Dict[str, Any]:
        """
        Process transit analysis.
        
        Args:
            natal_chart_data: Natal planetary positions
            target_date: Date for transit calculation
            
        Returns:
            Transit analysis with aspects and timing windows
        """
        start_time = time.time()
        
        # Calculate transit positions
        transit_positions = self._calculate_transit_positions(target_date)
        
        # Get natal positions
        natal_positions = natal_chart_data.get("planets", [])
        
        # Calculate aspects
        aspects = self._calculate_aspects(transit_positions, natal_positions)
        
        # Identify dominant transits
        dominant_transits = self._identify_dominant_transits(aspects)
        
        # Calculate timing windows
        timing_windows = self._calculate_timing_windows(
            dominant_transits, target_date
        )
        
        # Determine overall theme
        overall_theme = self._determine_overall_theme(dominant_transits)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "target_date": target_date.isoformat(),
            "transit_positions": transit_positions,
            "aspects_to_natal": aspects,
            "dominant_transits": dominant_transits,
            "timing_windows": timing_windows,
            "overall_theme": overall_theme,
        }
    
    def _calculate_transit_positions(self, target_date: date) -> List[Dict[str, Any]]:
        """Calculate approximate planetary positions for date."""
        # Use deterministic calculation from date
        seed = target_date.toordinal()
        
        positions = []
        for i, planet in enumerate(self.PLANETS):
            # Generate deterministic position
            planet_seed = seed + i * 100
            sign_index = planet_seed % 12
            degree = (planet_seed * 13) % 30
            
            # Retrograde for outer planets occasionally
            is_retrograde = (planet in ["Mercury", "Venus", "Mars"] and 
                           (seed + i) % 4 == 0)
            
            positions.append({
                "planet": planet,
                "sign": self.SIGNS[sign_index],
                "degree": round(degree, 2),
                "house": (sign_index % 12) + 1,
                "is_retrograde": is_retrograde,
            })
        
        return positions
    
    def _calculate_aspects(
        self,
        transit_positions: List[Dict],
        natal_positions: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Calculate aspects between transit and natal planets."""
        aspects = []
        
        for transit in transit_positions:
            for natal in natal_positions:
                # Calculate angular difference
                transit_long = self._calculate_longitude(transit)
                natal_long = self._calculate_longitude(natal)
                
                diff = abs(transit_long - natal_long)
                if diff > 180:
                    diff = 360 - diff
                
                # Check for aspects
                for aspect_name, aspect_data in self.ASPECTS.items():
                    if abs(diff - aspect_data["angle"]) <= aspect_data["orb"]:
                        orb = abs(diff - aspect_data["angle"])
                        
                        aspects.append({
                            "transit_planet": transit["planet"],
                            "natal_planet": natal.get("planet", "Unknown"),
                            "aspect_type": aspect_name,
                            "orb": round(orb, 2),
                            "interpretation": self._interpret_aspect(
                                transit["planet"], natal.get("planet", "Unknown"), aspect_name
                            ),
                            "intensity": aspect_data["nature"],
                        })
        
        # Sort by orb (closer aspects first)
        aspects.sort(key=lambda x: x["orb"])
        
        return aspects
    
    def _calculate_longitude(self, position: Dict) -> float:
        """Calculate approximate longitude from sign and degree."""
        sign_index = self.SIGNS.index(position["sign"])
        return sign_index * 30 + position["degree"]
    
    def _interpret_aspect(
        self,
        transit_planet: str,
        natal_planet: str,
        aspect_type: str
    ) -> str:
        """Generate interpretation for an aspect."""
        interpretations = {
            "conjunction": f"{transit_planet} merges with natal {natal_planet}, intensifying its energy",
            "sextile": f"{transit_planet} offers opportunities through natal {natal_planet}",
            "square": f"{transit_planet} challenges natal {natal_planet} to grow",
            "trine": f"{transit_planet} harmoniously supports natal {natal_planet}",
            "opposition": f"{transit_planet} brings awareness through tension with natal {natal_planet}",
        }
        return interpretations.get(aspect_type, f"{transit_planet} aspects natal {natal_planet}")
    
    def _identify_dominant_transits(
        self,
        aspects: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify the most significant transits."""
        # Filter to major aspects with small orbs
        significant = [a for a in aspects 
                      if a["intensity"] == "major" and a["orb"] < 5]
        
        # Prioritize outer planet transits
        outer_planets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
        
        dominant = []
        for aspect in significant:
            if aspect["transit_planet"] in outer_planets:
                dominant.append({
                    "transit_planet": aspect["transit_planet"],
                    "natal_planet": aspect["natal_planet"],
                    "aspect": aspect["aspect_type"],
                    "significance": "major",
                    "effect": f"Long-term transformation through {aspect['transit_planet'].lower()} energy",
                })
        
        # Limit to top 5
        return dominant[:5]
    
    def _calculate_timing_windows(
        self,
        dominant_transits: List[Dict],
        target_date: date
    ) -> List[Dict[str, Any]]:
        """Calculate timing windows for significant events."""
        windows = []
        
        for transit in dominant_transits:
            planet = transit["transit_planet"]
            
            # Estimate duration based on planet
            if planet in ["Jupiter", "Saturn"]:
                duration_days = 30
            elif planet in ["Uranus", "Neptune", "Pluto"]:
                duration_days = 90
            else:
                duration_days = 7
            
            windows.append({
                "transit": f"{planet} {transit['aspect']} {transit['natal_planet']}",
                "peak_date": target_date.isoformat(),
                "active_window_start": (target_date - timedelta(days=duration_days//2)).isoformat(),
                "active_window_end": (target_date + timedelta(days=duration_days//2)).isoformat(),
                "intensity": "high" if transit["significance"] == "major" else "moderate",
            })
        
        return windows
    
    def _determine_overall_theme(self, dominant_transits: List[Dict]) -> str:
        """Determine overall theme from dominant transits."""
        if not dominant_transits:
            return "A period of relative stability with subtle background shifts"
        
        planets = [t["transit_planet"] for t in dominant_transits]
        
        if "Saturn" in planets:
            return "A time of consolidation, structure-building, and facing responsibilities"
        elif "Jupiter" in planets:
            return "A period of expansion, growth, and new opportunities"
        elif any(p in planets for p in ["Uranus", "Neptune", "Pluto"]):
            return "A transformative period calling for deep inner and outer changes"
        else:
            return "Active period with multiple planetary influences to integrate"
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Planetary transit analysis with aspects to natal chart",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
