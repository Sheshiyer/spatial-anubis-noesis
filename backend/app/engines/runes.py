"""
Runes Engine - Elder Futhark
Engine 4 of 13 - Ancient Instrument Tier
"""
import time
from typing import Any, Dict, List

from app.engines.data.runes_data import (
    ELDER_FUTHARK,
    RUNE_LAYOUTS,
    get_rune_by_name,
)


class RunesEngine:
    """
    Elder Futhark rune casting engine.
    Implements traditional Norse/Germanic divination.
    """
    
    ENGINE_ID = "runes"
    ENGINE_NAME = "Elder Futhark Runes"
    CATEGORY = "ancient"
    RESPONSE_TIME_TARGET_MS = 160
    
    async def process(
        self,
        layout_type: str,
        runes: List[Dict[str, Any]],
        question: str | None = None
    ) -> Dict[str, Any]:
        """
        Process a Rune casting.
        
        Args:
            layout_type: Type of layout (single, three_norn, five_element, nine_grid)
            runes: List of rune inputs with id, position, orientation
            question: Optional question
            
        Returns:
            Complete Rune reading with interpretations
        """
        start_time = time.time()
        
        # Get layout configuration
        layout_config = RUNE_LAYOUTS.get(layout_type, RUNE_LAYOUTS["three_norn"])
        
        # Process each rune
        rune_results = []
        element_counts = {"Fire": 0, "Water": 0, "Air": 0, "Earth": 0, "Void": 0}
        
        for rune_input in runes:
            rune_id = rune_input.get("rune_id")
            position = rune_input.get("position")
            orientation = rune_input.get("orientation", "upright")
            coordinates = rune_input.get("coordinates")
            
            rune_data = get_rune_by_name(rune_id)
            if not rune_data:
                continue
            
            # Select meaning based on orientation
            if orientation == "reversed":
                meaning = rune_data.get("reversed_meaning", rune_data["meaning"])
            else:
                meaning = rune_data["meaning"]
            
            # Count elements
            element = rune_data.get("element", "Earth")
            element_counts[element] = element_counts.get(element, 0) + 1
            
            rune_results.append({
                "rune_id": rune_id,
                "name": rune_data["name"],
                "symbol": rune_data["symbol"],
                "position": position,
                "meaning": meaning,
                "reversed_meaning": rune_data.get("reversed_meaning"),
                "keywords": rune_data["keywords"],
                "element": element,
                "god_association": rune_data.get("god_association", "Unknown"),
                "coordinates": coordinates,
            })
        
        # Generate combined narrative
        narrative = self._generate_narrative(rune_results, layout_type, question)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "layout_type": layout_type,
            "layout_positions": layout_config["positions"],
            "runes": rune_results,
            "combined_narrative": narrative,
            "elemental_analysis": element_counts,
        }
    
    def _generate_narrative(
        self,
        runes: List[Dict[str, Any]],
        layout_type: str,
        question: str | None
    ) -> str:
        """Generate combined narrative from runes."""
        if not runes:
            return "No runes cast."
        
        if layout_type == "single":
            rune = runes[0]
            return f"{rune['name']} ({rune['symbol']}) answers your call: {rune['meaning']} " \
                   f"Associated with {rune['god_association']}, this rune carries the power of {rune['element']}."
        
        elif layout_type == "three_norn":
            urdh, verdandi, skuld = runes[0], runes[1], runes[2]
            return (
                f"The Three Norns weave your fate: "
                f"Urdh (Past) - {urdh['name']}: {urdh['meaning']} "
                f"Verdandi (Present) - {verdandi['name']}: {verdandi['meaning']} "
                f"Skuld (Future) - {skuld['name']}: {skuld['meaning']} "
                f"The thread of destiny moves from {urdh['keywords'][0]} through transformation."
            )
        
        elif layout_type == "five_element":
            elements = [r["element"] for r in runes]
            return (
                f"The elemental cross reveals your situation through the five directions. "
                f"Dominant element: {max(set(elements), key=elements.count)}. "
                f"The central self is marked by {runes[0]['name']}: {runes[0]['meaning']}"
            )
        
        else:  # nine_grid
            return (
                f"The Nine Worlds open to your query. "
                f"Midgard (Self) shows {runes[3]['name']}, while Asgard (Divine) reveals {runes[0]['name']}. "
                f"The runes speak of {runes[-1]['keywords'][0]} across the cosmic tree Yggdrasil."
            )
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "24 Elder Futhark runes plus Wyrd blank for Norse divination",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
