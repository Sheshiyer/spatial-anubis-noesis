"""
Human Design Engine - Bodygraph Calculation
Engine 8 of 13 - Biological Mirrors Tier
"""
import hashlib
import time
from datetime import datetime
from typing import Any, Dict, List, Set

from app.engines.data.human_design_data import (
    HD_CENTERS,
    HD_CHANNELS,
    HD_GATES,
    HD_PROFILES,
    HD_TYPES,
    determine_type,
    get_channels_for_gates,
)


class HumanDesignEngine:
    """
    Human Design calculation engine.
    Generates bodygraph with centers, channels, and gates.
    """
    
    ENGINE_ID = "human-design"
    ENGINE_NAME = "Human Design"
    CATEGORY = "biological"
    RESPONSE_TIME_TARGET_MS = 200
    
    async def process(
        self,
        birth_datetime: datetime,
        birth_location: str
    ) -> Dict[str, Any]:
        """
        Process Human Design calculation.
        
        Args:
            birth_datetime: Birth date and time
            birth_location: Birth location
            
        Returns:
            Complete Human Design chart
        """
        start_time = time.time()
        
        # Generate deterministic gates from birth data
        birth_seed = f"{birth_datetime.isoformat()}_{birth_location}"
        gates = self._generate_gates(birth_seed)
        
        # Calculate channels
        channels = get_channels_for_gates(gates)
        active_channels = [ch["number"] for ch in channels]
        
        # Determine defined centers
        defined_centers = self._get_defined_centers(gates, active_channels)
        
        # Determine type
        hd_type = determine_type(defined_centers)
        type_info = HD_TYPES[hd_type]
        
        # Determine profile
        profile = self._determine_profile(birth_seed)
        
        # Build center statuses
        center_statuses = {}
        for center_id, center_data in HD_CENTERS.items():
            is_defined = center_id in defined_centers
            center_gates = [g for g in gates if HD_GATES.get(g, {}).get("center") == center_id]
            center_channels = [ch for ch in channels if center_id in [
                HD_GATES[ch["gates"][0]]["center"],
                HD_GATES[ch["gates"][1]]["center"]
            ]]
            
            center_statuses[center_id] = {
                "name": center_data["name"],
                "defined": is_defined,
                "gates": center_gates,
                "channels": [ch["number"] for ch in center_channels],
                "strategy_note": type_info["strategy"] if is_defined else "Open to conditioning",
            }
        
        # Determine authority
        authority = self._determine_authority(defined_centers)
        
        # Calculate incarnation cross
        incarnation_cross = self._calculate_incarnation_cross(gates)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "type": hd_type,
            "strategy": type_info["strategy"],
            "authority": authority,
            "profile": profile,
            "centers": center_statuses,
            "defined_centers": defined_centers,
            "undefined_centers": [c for c in HD_CENTERS.keys() if c not in defined_centers],
            "active_channels": [
                {
                    "number": ch["number"],
                    "name": ch["name"],
                    "gates": list(ch["gates"]),
                    "circuit": ch["circuit"],
                }
                for ch in channels
            ],
            "gate_activations": [
                {
                    "gate": g,
                    "name": HD_GATES.get(g, {}).get("name", "Unknown"),
                    "center": HD_GATES.get(g, {}).get("center", "unknown"),
                }
                for g in gates
            ],
            "incarnation_cross": incarnation_cross,
        }
    
    def _generate_gates(self, birth_seed: str) -> List[int]:
        """Generate activated gates from birth data."""
        # Use hash to generate deterministic gates
        hash_val = int(hashlib.md5(birth_seed.encode()).hexdigest(), 16)
        
        gates = []
        # Generate approximately 13-15 activated gates
        num_gates = 13 + (hash_val % 5)
        
        for i in range(num_gates):
            gate_num = ((hash_val >> (i * 5)) % 64) + 1
            if gate_num not in gates:
                gates.append(gate_num)
        
        return sorted(gates)
    
    def _get_defined_centers(self, gates: List[int], channels: List[int]) -> List[str]:
        """Get list of defined centers based on gates and channels."""
        defined = set()
        
        # Centers are defined if they have a gate
        for gate in gates:
            center = HD_GATES.get(gate, {}).get("center")
            if center:
                defined.add(center)
        
        # Centers with connecting channels are also defined
        for channel_num in channels:
            channel = HD_CHANNELS.get(channel_num)
            if channel:
                g1, g2 = channel["gates"]
                c1 = HD_GATES.get(g1, {}).get("center")
                c2 = HD_GATES.get(g2, {}).get("center")
                if c1:
                    defined.add(c1)
                if c2:
                    defined.add(c2)
        
        return list(defined)
    
    def _determine_profile(self, birth_seed: str) -> str:
        """Determine Human Design profile."""
        hash_val = int(hashlib.md5((birth_seed + "_profile").encode()).hexdigest(), 16)
        
        # Profiles are combinations 1/3, 1/4, 2/4, 2/5, 3/5, 3/6, 4/6, 4/1, 5/1, 5/2, 6/2, 6/3
        profiles = [
            "1/3", "1/4", "2/4", "2/5", "3/5", "3/6",
            "4/6", "4/1", "5/1", "5/2", "6/2", "6/3"
        ]
        
        return profiles[hash_val % len(profiles)]
    
    def _determine_authority(self, defined_centers: List[str]) -> str:
        """Determine authority based on defined centers."""
        hierarchy = [
            ("solar_plexus", "Emotional Authority"),
            ("sacral", "Sacral Authority"),
            ("spleen", "Splenic Authority"),
            ("heart", "Ego Authority"),
            ("g", "Self-Projected Authority"),
        ]
        
        for center, authority in hierarchy:
            if center in defined_centers:
                return authority
        
        return "Mental Authority"  # Default
    
    def _calculate_incarnation_cross(self, gates: List[int]) -> str:
        """Calculate incarnation cross from gates."""
        # Simplified - use sun/personality gates
        if len(gates) >= 2:
            g1, g2 = gates[0], gates[1]
            return f"Cross of {HD_GATES.get(g1, {}).get('name', 'Unknown')} and {HD_GATES.get(g2, {}).get('name', 'Unknown')}"
        return "Unknown Cross"
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Human Design System with bodygraph, centers, channels, and gates",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
