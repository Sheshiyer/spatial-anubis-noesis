"""
Chronobiology Engine - Circadian Rhythm Analysis
Engine 9 of 13 - Biological Mirrors Tier
"""
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


class ChronobiologyEngine:
    """
    Chronobiology engine for circadian rhythm analysis.
    Provides optimal timing recommendations based on chronotype.
    """
    
    ENGINE_ID = "chronobiology"
    ENGINE_NAME = "Chronobiology"
    CATEGORY = "biological"
    RESPONSE_TIME_TARGET_MS = 150
    
    # Chronotype characteristics
    CHRONOTYPES = {
        "lion": {
            "name": "Lion",
            "description": "Early bird, wakes around 6am, most productive in morning",
            "peak_hours": (8, 12),
            "sleep_time": "22:00",
            "wake_time": "06:00",
            "cortisol_peak": "08:00",
            "melatonin_start": "21:00",
        },
        "bear": {
            "name": "Bear",
            "description": "Normal circadian rhythm, follows solar cycle",
            "peak_hours": (10, 14),
            "sleep_time": "23:00",
            "wake_time": "07:00",
            "cortisol_peak": "09:00",
            "melatonin_start": "22:00",
        },
        "wolf": {
            "name": "Wolf",
            "description": "Night owl, wakes late, most productive in evening",
            "peak_hours": (16, 20),
            "sleep_time": "00:00",
            "wake_time": "08:00",
            "cortisol_peak": "11:00",
            "melatonin_start": "23:00",
        },
        "dolphin": {
            "name": "Dolphin",
            "description": "Trouble sleeping, anxious, most productive mid-day",
            "peak_hours": (10, 14),
            "sleep_time": "23:30",
            "wake_time": "06:30",
            "cortisol_peak": "10:00",
            "melatonin_start": "22:30",
        },
    }
    
    # Activity recommendations by time
    ACTIVITY_WINDOWS = {
        "deep_work": {
            "description": "Deep work, complex problem-solving",
            "ideal_cortisol": "high",
            "ideal_body_temp": "rising",
        },
        "creative_work": {
            "description": "Creative tasks, brainstorming",
            "ideal_cortisol": "moderate",
            "ideal_body_temp": "stable",
        },
        "exercise": {
            "description": "Physical exercise",
            "ideal_cortisol": "high",
            "ideal_body_temp": "peak",
        },
        "meetings": {
            "description": "Meetings and collaboration",
            "ideal_cortisol": "moderate",
            "ideal_body_temp": "stable",
        },
        "administrative": {
            "description": "Administrative tasks",
            "ideal_cortisol": "low",
            "ideal_body_temp": "declining",
        },
    }
    
    async def process(
        self,
        current_time: datetime,
        timezone: str,
        chronotype: Optional[str] = None,
        chronotype_indicators: Optional[Dict[str, Any]] = None,
        pip_summary: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process chronobiology analysis.
        
        Args:
            current_time: Current date and time
            timezone: Timezone string
            chronotype: Optional known chronotype
            chronotype_indicators: Optional indicators for detection
            pip_summary: Optional PIP bio-data summary
            
        Returns:
            Chronobiology analysis with recommendations
        """
        start_time = time.time()
        
        # Detect or use chronotype
        detected_chronotype = chronotype or self._detect_chronotype(
            chronotype_indicators, pip_summary
        )
        
        chrono_data = self.CHRONOTYPES.get(detected_chronotype, self.CHRONOTYPES["bear"])
        
        # Calculate circadian phase
        hour = current_time.hour
        circadian_phase = self._calculate_circadian_phase(hour, chrono_data)
        
        # Calculate hormone levels
        cortisol, melatonin = self._calculate_hormone_levels(hour, chrono_data)
        
        # Generate optimal windows
        optimal_windows = self._generate_optimal_windows(detected_chronotype, current_time)
        
        # Generate current recommendations
        recommendations = self._generate_recommendations(
            circadian_phase, cortisol, melatonin
        )
        
        # Find next transition
        next_transition = self._find_next_transition(hour, chrono_data)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "detected_chronotype": detected_chronotype,
            "confidence": 0.85 if chronotype else 0.65,
            "circadian_phase": circadian_phase,
            "melatonin_level": melatonin,
            "cortisol_level": cortisol,
            "optimal_windows": optimal_windows,
            "current_recommendations": recommendations,
            "next_transition": next_transition,
        }
    
    def _detect_chronotype(
        self,
        indicators: Optional[Dict[str, Any]],
        pip_summary: Optional[Dict[str, Any]]
    ) -> str:
        """Detect chronotype from indicators."""
        if indicators:
            # Use provided indicators
            wake_time = indicators.get("preferred_wake_time", 7)
            if wake_time < 6.5:
                return "lion"
            elif wake_time > 8:
                return "wolf"
            elif indicators.get("sleep_quality") == "poor":
                return "dolphin"
            return "bear"
        
        if pip_summary:
            # Use PIP data
            coherence = pip_summary.get("avg_coherence", 0.5)
            if coherence > 0.7:
                return "lion"
            elif coherence < 0.4:
                return "dolphin"
            return "bear"
        
        return "bear"  # Default
    
    def _calculate_circadian_phase(self, hour: int, chrono_data: Dict) -> str:
        """Calculate current circadian phase."""
        wake_hour = int(chrono_data["wake_time"].split(":")[0])
        sleep_hour = int(chrono_data["sleep_time"].split(":")[0])
        
        # Adjust for day/night
        if sleep_hour < wake_hour:  # Spans midnight
            if hour >= sleep_hour or hour < wake_hour:
                return "night"
        else:
            if hour >= sleep_hour:
                return "night"
        
        # Day phases
        peak_start, peak_end = chrono_data["peak_hours"]
        if peak_start <= hour < peak_end:
            return "peak_performance"
        elif hour < peak_start:
            return "rising"
        else:
            return "declining"
    
    def _calculate_hormone_levels(
        self,
        hour: int,
        chrono_data: Dict
    ) -> tuple:
        """Calculate cortisol and melatonin levels."""
        cortisol_peak = int(chrono_data["cortisol_peak"].split(":")[0])
        melatonin_start = int(chrono_data["melatonin_start"].split(":")[0])
        
        # Cortisol: High at wake, declining through day
        cortisol_hours_since_peak = (hour - cortisol_peak) % 24
        if cortisol_hours_since_peak < 2:
            cortisol = "peak"
        elif cortisol_hours_since_peak < 6:
            cortisol = "high"
        elif cortisol_hours_since_peak < 10:
            cortisol = "moderate"
        else:
            cortisol = "low"
        
        # Melatonin: Low during day, rising in evening
        melatonin_hours = (hour - melatonin_start) % 24
        if hour >= melatonin_start or hour < 6:
            melatonin = "rising" if melatonin_hours < 3 else "peak"
        else:
            melatonin = "low"
        
        return cortisol, melatonin
    
    def _generate_optimal_windows(
        self,
        chronotype: str,
        current_time: datetime
    ) -> List[Dict[str, Any]]:
        """Generate optimal activity windows for the day."""
        chrono_data = self.CHRONOTYPES[chronotype]
        peak_start, peak_end = chrono_data["peak_hours"]
        
        windows = [
            {
                "activity": "Deep Work",
                "start_time": f"{peak_start:02d}:00",
                "end_time": f"{peak_start + 2:02d}:00",
                "quality_score": 95,
                "recommendation": "Best time for complex cognitive tasks",
            },
            {
                "activity": "Exercise",
                "start_time": f"{peak_start + 2:02d}:00",
                "end_time": f"{peak_start + 4:02d}:00",
                "quality_score": 90,
                "recommendation": "Optimal physical performance window",
            },
            {
                "activity": "Creative Work",
                "start_time": f"{peak_start - 2:02d}:00",
                "end_time": f"{peak_start:02d}:00",
                "quality_score": 80,
                "recommendation": "Good for brainstorming and creative tasks",
            },
            {
                "activity": "Administrative Tasks",
                "start_time": "14:00",
                "end_time": "16:00",
                "quality_score": 70,
                "recommendation": "Handle routine tasks during post-lunch dip",
            },
            {
                "activity": "Wind Down",
                "start_time": chrono_data["melatonin_start"],
                "end_time": chrono_data["sleep_time"],
                "quality_score": 85,
                "recommendation": "Begin relaxing for sleep preparation",
            },
        ]
        
        return windows
    
    def _generate_recommendations(
        self,
        circadian_phase: str,
        cortisol: str,
        melatonin: str
    ) -> List[str]:
        """Generate current recommendations."""
        recommendations = []
        
        if circadian_phase == "peak_performance":
            recommendations.append("You are in your peak performance window. Focus on important tasks.")
        elif circadian_phase == "declining":
            recommendations.append("Energy is declining. Switch to lighter tasks or take breaks.")
        elif circadian_phase == "night":
            recommendations.append("Night phase. Prioritize rest and recovery.")
        
        if cortisol == "high":
            recommendations.append("High cortisol supports focus and alertness.")
        elif cortisol == "low":
            recommendations.append("Low cortisol - avoid high-pressure decisions.")
        
        if melatonin == "rising":
            recommendations.append("Melatonin rising - prepare for sleep soon.")
        
        return recommendations
    
    def _find_next_transition(self, hour: int, chrono_data: Dict) -> Dict[str, Any]:
        """Find the next circadian transition."""
        peak_start, peak_end = chrono_data["peak_hours"]
        
        if hour < peak_start:
            return {
                "transition": "Peak Performance",
                "time_until": f"{peak_start - hour} hours",
            }
        elif hour < peak_end:
            return {
                "transition": "Declining Energy",
                "time_until": f"{peak_end - hour} hours",
            }
        elif hour < 18:
            return {
                "transition": "Evening Recovery",
                "time_until": f"{18 - hour} hours",
            }
        else:
            melatonin_hour = int(chrono_data["melatonin_start"].split(":")[0])
            if hour < melatonin_hour:
                return {
                    "transition": "Melatonin Release",
                    "time_until": f"{melatonin_hour - hour} hours",
                }
            return {
                "transition": "Sleep Window",
                "time_until": "Now",
            }
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Chronobiology analysis for circadian rhythms and optimal timing",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
