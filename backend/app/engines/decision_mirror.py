"""
Decision Mirror Engine - Reading Synthesis
Engine 10 of 13 - Synthesis Instruments Tier
"""
import time
from typing import Any, Dict, List, Optional


class DecisionMirrorEngine:
    """
    Decision Mirror engine for synthesizing multiple engine readings.
    Identifies convergence, themes, and contradictions across readings.
    """
    
    ENGINE_ID = "decision-mirror"
    ENGINE_NAME = "Decision Mirror"
    CATEGORY = "synthesis"
    RESPONSE_TIME_TARGET_MS = 250
    
    # Theme keywords by engine
    THEME_KEYWORDS = {
        "i-ching": ["change", "transition", "perseverance", "harmony", "challenge"],
        "vimshottari": ["time", "period", "planet", "destiny", "karma"],
        "tarot": ["journey", "transformation", "intuition", "manifestation"],
        "runes": ["strength", "fate", "action", "protection", "wisdom"],
        "numerology": ["path", "purpose", "expression", "destiny"],
        "biorhythm": ["cycle", "energy", "peak", "rest", "flow"],
        "gene-keys": ["shadow", "gift", "siddhi", "evolution"],
        "human-design": ["strategy", "authority", "type", "profile"],
        "chronobiology": ["timing", "optimal", "rhythm", "peak"],
    }
    
    async def process(
        self,
        reading_ids: List[str],
        readings_data: List[Dict[str, Any]],
        question: Optional[str] = None,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Process Decision Mirror synthesis.
        
        Args:
            reading_ids: IDs of readings to synthesize
            readings_data: Full data from each reading
            question: Optional question context
            weights: Optional weights per engine
            
        Returns:
            Synthesis with convergence score, themes, and recommendations
        """
        start_time = time.time()
        
        # Calculate convergence score
        convergence_score = self._calculate_convergence(readings_data, weights)
        
        # Identify themes
        themes = self._identify_themes(readings_data)
        
        # Find contradictions
        contradictions = self._find_contradictions(readings_data)
        
        # Generate synthesis narrative
        narrative = self._generate_narrative(readings_data, themes, contradictions, question)
        
        # Determine confidence level
        confidence = self._determine_confidence(convergence_score, len(readings_data))
        
        # Generate recommendation
        recommendation = self._generate_recommendation(
            convergence_score, themes, contradictions
        )
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "convergence_score": convergence_score,
            "themes": themes,
            "contradictions": contradictions,
            "synthesis_narrative": narrative,
            "confidence_level": confidence,
            "recommendation": recommendation,
        }
    
    def _calculate_convergence(
        self,
        readings: List[Dict[str, Any]],
        weights: Optional[Dict[str, float]]
    ) -> float:
        """Calculate convergence score (0-100)."""
        if len(readings) < 2:
            return 50.0  # Neutral for single reading
        
        # Base convergence on number of readings and theme overlap
        base_score = min(70, 40 + (len(readings) * 10))
        
        # Adjust for theme overlap
        theme_overlap = self._calculate_theme_overlap(readings)
        
        # Apply weights if provided
        weight_factor = 1.0
        if weights:
            total_weight = sum(weights.values())
            weight_factor = min(1.2, total_weight / len(readings))
        
        convergence = (base_score * 0.5 + theme_overlap * 0.5) * weight_factor
        return min(100, max(0, round(convergence, 1)))
    
    def _calculate_theme_overlap(self, readings: List[Dict[str, Any]]) -> float:
        """Calculate theme overlap percentage."""
        if len(readings) < 2:
            return 50.0
        
        # Extract keywords from each reading
        all_keywords = []
        for reading in readings:
            engine_id = reading.get("engine_id", "")
            keywords = self.THEME_KEYWORDS.get(engine_id, [])
            all_keywords.append(set(keywords))
        
        # Calculate overlaps
        overlaps = []
        for i in range(len(all_keywords)):
            for j in range(i + 1, len(all_keywords)):
                if all_keywords[i] and all_keywords[j]:
                    intersection = len(all_keywords[i] & all_keywords[j])
                    union = len(all_keywords[i] | all_keywords[j])
                    if union > 0:
                        overlaps.append(intersection / union)
        
        if not overlaps:
            return 50.0
        
        return sum(overlaps) / len(overlaps) * 100
    
    def _identify_themes(self, readings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify recurring themes across readings."""
        theme_counts = {}
        
        for reading in readings:
            engine_id = reading.get("engine_id", "")
            keywords = self.THEME_KEYWORDS.get(engine_id, [])
            
            for keyword in keywords:
                if keyword not in theme_counts:
                    theme_counts[keyword] = {
                        "count": 0,
                        "engines": [],
                    }
                theme_counts[keyword]["count"] += 1
                if engine_id not in theme_counts[keyword]["engines"]:
                    theme_counts[keyword]["engines"].append(engine_id)
        
        # Filter to themes appearing in multiple readings
        significant_themes = [
            {
                "theme": theme,
                "frequency": data["count"],
                "supporting_engines": data["engines"],
                "confidence": min(100, data["count"] * 25),
            }
            for theme, data in theme_counts.items()
            if data["count"] >= 2
        ]
        
        # Sort by frequency
        significant_themes.sort(key=lambda x: x["frequency"], reverse=True)
        
        return significant_themes[:5]  # Top 5 themes
    
    def _find_contradictions(self, readings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find contradictions between readings."""
        contradictions = []
        
        # Check for timing contradictions
        timing_readings = [r for r in readings if r.get("engine_id") in 
                          ["biorhythm", "chronobiology", "vimshottari"]]
        
        if len(timing_readings) >= 2:
            # Simple contradiction check
            contradictions.append({
                "engines": [r["engine_id"] for r in timing_readings[:2]],
                "contradiction_type": "timing",
                "resolution_suggestion": "Consider the longer cycle influences over short-term fluctuations",
            })
        
        # Check for action vs. waiting contradictions
        action_engines = ["i-ching", "tarot", "runes"]
        passive_engines = ["biorhythm", "chronobiology"]
        
        has_action = any(r.get("engine_id") in action_engines for r in readings)
        has_passive = any(r.get("engine_id") in passive_engines for r in readings)
        
        if has_action and has_passive:
            contradictions.append({
                "engines": ["active_divination", "biological_rhythm"],
                "contradiction_type": "action_vs_waiting",
                "resolution_suggestion": "Prepare through divination but time action according to biological rhythms",
            })
        
        return contradictions
    
    def _generate_narrative(
        self,
        readings: List[Dict[str, Any]],
        themes: List[Dict[str, Any]],
        contradictions: List[Dict[str, Any]],
        question: Optional[str]
    ) -> str:
        """Generate synthesis narrative."""
        parts = []
        
        if question:
            parts.append(f"Regarding your question: '{question}'")
        
        parts.append(f"Across {len(readings)} readings, the following patterns emerge:")
        
        # Add theme summary
        if themes:
            theme_names = [t["theme"] for t in themes[:3]]
            parts.append(f"Primary themes: {', '.join(theme_names)}.")
        
        # Add contradiction handling
        if contradictions:
            parts.append("Some tensions exist between different perspectives.")
            parts.append("These can be resolved by considering different time scales.")
        
        # Add synthesis
        parts.append("The collective wisdom suggests:")
        parts.append("- Honor your natural rhythms while remaining open to guidance")
        parts.append("- The timing aligns when preparation meets opportunity")
        
        return " ".join(parts)
    
    def _determine_confidence(self, convergence: float, num_readings: int) -> str:
        """Determine confidence level from convergence score."""
        if convergence >= 80 and num_readings >= 3:
            return "high"
        elif convergence >= 60 or num_readings >= 2:
            return "moderate"
        else:
            return "exploratory"
    
    def _generate_recommendation(
        self,
        convergence: float,
        themes: List[Dict[str, Any]],
        contradictions: List[Dict[str, Any]]
    ) -> str:
        """Generate final recommendation."""
        if convergence >= 80:
            return "Strong alignment across readings. Proceed with confidence, following your dominant themes."
        elif convergence >= 60:
            return "Good alignment with some nuances. Consider the primary themes and allow for timing adjustments."
        elif contradictions:
            return "Mixed signals suggest complexity. Focus on biological rhythms as your foundation."
        else:
            return "Exploratory phase. Gather more information before making major decisions."
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Synthesizes multiple readings for convergence analysis and theme identification",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
