"""
I-Ching Engine - The Book of Changes
Engine 1 of 13 - Ancient Instrument Tier
"""
import time
from typing import Any, Dict, List

from app.engines.data.i_ching_data import (
    get_hexagram_by_number,
    get_transformed_hexagram,
)


class IChingEngine:
    """
    I-Ching divination engine implementing the ancient Chinese Book of Changes.
    Provides hexagram interpretation with changing lines and transformed readings.
    """
    
    ENGINE_ID = "i-ching"
    ENGINE_NAME = "I-Ching: The Book of Changes"
    CATEGORY = "ancient"
    RESPONSE_TIME_TARGET_MS = 150
    
    async def process(self, hexagram_number: int, changing_lines: List[int]) -> Dict[str, Any]:
        """
        Process an I-Ching reading.
        
        Args:
            hexagram_number: The primary hexagram (1-64)
            changing_lines: List of changing line numbers (1-6)
            
        Returns:
            Complete I-Ching reading with interpretations
        """
        start_time = time.time()
        
        # Get primary hexagram
        primary = get_hexagram_by_number(hexagram_number)
        if not primary:
            raise ValueError(f"Invalid hexagram number: {hexagram_number}")
        
        # Build line interpretations
        line_interpretations = []
        for line_num in range(1, 7):
            line_text = primary["lines"].get(line_num, "")
            is_changing = line_num in changing_lines
            line_interpretations.append({
                "line_number": line_num,
                "text": line_text,
                "is_changing": is_changing,
            })
        
        # Calculate transformed hexagram if there are changing lines
        transformed = None
        has_transformed = len(changing_lines) > 0
        
        if has_transformed:
            transformed_num = get_transformed_hexagram(hexagram_number, changing_lines)
            transformed_data = get_hexagram_by_number(transformed_num)
            transformed = {
                "number": transformed_num,
                "name": transformed_data["name"],
                "chinese": transformed_data["chinese"],
                "english_name": transformed_data["english_name"],
                "judgment": transformed_data["judgment"],
            }
        
        # Generate guidance based on the reading
        guidance = self._generate_guidance(primary, changing_lines, transformed)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "hexagram_number": hexagram_number,
            "name": primary["name"],
            "chinese": primary["chinese"],
            "english_name": primary["english_name"],
            "judgment": primary["judgment"],
            "image": primary["image"],
            "trigram_above": primary["trigram_above"],
            "trigram_below": primary["trigram_below"],
            "line_interpretations": line_interpretations,
            "has_transformed": has_transformed,
            "transformed_hexagram": transformed,
            "guidance": guidance,
        }
    
    def _generate_guidance(
        self,
        primary: Dict[str, Any],
        changing_lines: List[int],
        transformed: Dict[str, Any] | None
    ) -> str:
        """Generate contextual guidance based on the reading."""
        if not changing_lines:
            return f"The {primary['english_name']} indicates a time of stability. " \
                   f"{primary['judgment']} Focus on the image: {primary['image']}"
        
        if transformed:
            return f"The situation is in flux. Moving from {primary['english_name']} " \
                   f"to {transformed['english_name']}. The changing lines indicate " \
                   f"{len(changing_lines)} areas of transformation. " \
                   f"Pay attention to the movement and allow the transformation to unfold."
        
        return f"Multiple changing lines suggest significant transformation. " \
               f"The core message of {primary['english_name']} remains: {primary['judgment']}"
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Ancient Chinese divination through 64 hexagrams with changing lines",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
