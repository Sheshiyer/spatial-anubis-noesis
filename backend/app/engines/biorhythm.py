"""
Biorhythm Engine - 23/28/33 Day Cycles
Engine 6 of 13 - Biological Mirrors Tier
"""
import math
import time
from datetime import date, timedelta
from typing import Any, Dict, List


class BiorhythmEngine:
    """
    Biorhythm calculation engine.
    Calculates Physical (23-day), Emotional (28-day), and Intellectual (33-day) cycles.
    """
    
    ENGINE_ID = "biorhythm"
    ENGINE_NAME = "Biorhythm Cycles"
    CATEGORY = "biological"
    RESPONSE_TIME_TARGET_MS = 120
    
    # Cycle lengths
    PHYSICAL_CYCLE = 23
    EMOTIONAL_CYCLE = 28
    INTELLECTUAL_CYCLE = 33
    
    # Cycle descriptions
    CYCLE_DESCRIPTIONS = {
        "physical": {
            "name": "Physical",
            "description": "Strength, coordination, endurance, resistance",
            "high": "Peak physical condition, high energy, good for physical activities",
            "low": "Physical low, conserve energy, avoid overexertion",
            "critical": "Physical instability, be cautious with physical activities",
        },
        "emotional": {
            "name": "Emotional",
            "description": "Mood, sensitivity, creativity, intuition",
            "high": "Emotional peak, creative expression, good relationships",
            "low": "Emotional low, introspection needed, avoid conflicts",
            "critical": "Emotional volatility, practice self-care",
        },
        "intellectual": {
            "name": "Intellectual",
            "description": "Mental acuity, logic, analysis, memory",
            "high": "Mental clarity, good for learning and problem-solving",
            "low": "Mental low, avoid complex decisions, rest mind",
            "critical": "Mental instability, double-check decisions",
        },
    }
    
    async def process(
        self,
        birthdate: date,
        target_date_range_start: date,
        target_date_range_end: date
    ) -> Dict[str, Any]:
        """
        Process biorhythm calculation.
        
        Args:
            birthdate: Date of birth
            target_date_range_start: Start of calculation range
            target_date_range_end: End of calculation range
            
        Returns:
            Biorhythm values for each day in range
        """
        start_time = time.time()
        
        daily_values = []
        critical_days = []
        optimal_windows = []
        
        current_date = target_date_range_start
        while current_date <= target_date_range_end:
            # Calculate days since birth
            days_since_birth = (current_date - birthdate).days
            
            # Calculate cycle values (-100 to 100)
            physical = self._calculate_cycle(days_since_birth, self.PHYSICAL_CYCLE)
            emotional = self._calculate_cycle(days_since_birth, self.EMOTIONAL_CYCLE)
            intellectual = self._calculate_cycle(days_since_birth, self.INTELLECTUAL_CYCLE)
            
            # Check for critical days (zero crossing or transition)
            is_critical = self._is_critical_day(days_since_birth)
            if is_critical:
                critical_days.append(current_date)
            
            # Determine primary cycle
            primary_cycle = self._determine_primary_cycle(physical, emotional, intellectual)
            
            daily_values.append({
                "date": current_date.isoformat(),
                "physical": round(physical, 2),
                "emotional": round(emotional, 2),
                "intellectual": round(intellectual, 2),
                "is_critical": is_critical,
                "primary_cycle": primary_cycle,
            })
            
            current_date += timedelta(days=1)
        
        # Find optimal windows
        optimal_windows = self._find_optimal_windows(daily_values)
        
        # Generate guidance
        today_data = daily_values[0] if daily_values else None
        guidance = self._generate_guidance(today_data)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "cycle_length_physical": self.PHYSICAL_CYCLE,
            "cycle_length_emotional": self.EMOTIONAL_CYCLE,
            "cycle_length_intellectual": self.INTELLECTUAL_CYCLE,
            "daily_values": daily_values,
            "critical_days": [d.isoformat() for d in critical_days],
            "optimal_windows": optimal_windows,
            "guidance": guidance,
        }
    
    def _calculate_cycle(self, days: int, cycle_length: int) -> float:
        """Calculate biorhythm value for a specific cycle."""
        # Sine wave: sin(2π * days / cycle_length) * 100
        radians = (2 * math.pi * days) / cycle_length
        return math.sin(radians) * 100
    
    def _is_critical_day(self, days: int) -> bool:
        """Check if any cycle is at a critical point (zero crossing)."""
        for cycle in [self.PHYSICAL_CYCLE, self.EMOTIONAL_CYCLE, self.INTELLECTUAL_CYCLE]:
            # Critical when cycle position is near 0 or half cycle
            position = days % cycle
            if position == 0 or position == cycle // 2:
                return True
        return False
    
    def _determine_primary_cycle(
        self,
        physical: float,
        emotional: float,
        intellectual: float
    ) -> str:
        """Determine which cycle is currently dominant."""
        values = {
            "physical": abs(physical),
            "emotional": abs(emotional),
            "intellectual": abs(intellectual),
        }
        return max(values, key=values.get)
    
    def _find_optimal_windows(self, daily_values: List[Dict]) -> List[Dict[str, Any]]:
        """Find optimal time windows for different activities."""
        windows = []
        
        # Find days with all positive or high values
        for day in daily_values:
            phys = day["physical"]
            emo = day["emotional"]
            intel = day["intellectual"]
            
            if phys > 50 and emo > 50 and intel > 50:
                windows.append({
                    "date": day["date"],
                    "type": "peak_performance",
                    "description": "All cycles high - optimal for major activities",
                })
            elif phys > 50:
                windows.append({
                    "date": day["date"],
                    "type": "physical_peak",
                    "description": "Physical cycle high - good for exercise/sports",
                })
            elif emo > 50:
                windows.append({
                    "date": day["date"],
                    "type": "emotional_peak",
                    "description": "Emotional cycle high - good for creative/relationship activities",
                })
            elif intel > 50:
                windows.append({
                    "date": day["date"],
                    "type": "intellectual_peak",
                    "description": "Intellectual cycle high - good for mental work",
                })
        
        # Limit to first 5 windows
        return windows[:5]
    
    def _generate_guidance(self, today_data: Dict | None) -> str:
        """Generate guidance based on current biorhythm state."""
        if not today_data:
            return "No biorhythm data available."
        
        phys = today_data["physical"]
        emo = today_data["emotional"]
        intel = today_data["intellectual"]
        
        guidance_parts = []
        
        # Physical guidance
        if phys > 50:
            guidance_parts.append("Physical energy is high. Good day for exercise and physical activities.")
        elif phys < -50:
            guidance_parts.append("Physical energy is low. Rest and conserve energy.")
        
        # Emotional guidance
        if emo > 50:
            guidance_parts.append("Emotions are positive. Good time for creative work and social activities.")
        elif emo < -50:
            guidance_parts.append("Emotions may be challenging. Practice self-care and avoid conflicts.")
        
        # Intellectual guidance
        if intel > 50:
            guidance_parts.append("Mental clarity is high. Good for problem-solving and learning.")
        elif intel < -50:
            guidance_parts.append("Mental focus may be difficult. Postpone complex decisions if possible.")
        
        if not guidance_parts:
            return "Biorhythms are in transition. Maintain balance and listen to your body."
        
        return " ".join(guidance_parts)
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Biorhythm cycles: Physical (23-day), Emotional (28-day), Intellectual (33-day)",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
