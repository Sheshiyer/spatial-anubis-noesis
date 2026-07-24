"""
Tarot Engine - 78 Cards of the Major and Minor Arcana
Engine 3 of 13 - Ancient Instrument Tier
"""
import time
from typing import Any, Dict, List

from app.engines.data.tarot_data import (
    TAROT_SPREADS,
    get_card_by_id,
)


class TarotEngine:
    """
    Tarot divination engine implementing the 78-card system.
    Supports Single, Three-Card, and Celtic Cross spreads.
    """
    
    ENGINE_ID = "tarot"
    ENGINE_NAME = "Tarot: Arcana Divination"
    CATEGORY = "ancient"
    RESPONSE_TIME_TARGET_MS = 180
    
    async def process(
        self,
        spread_type: str,
        cards: List[Dict[str, Any]],
        question: str | None = None
    ) -> Dict[str, Any]:
        """
        Process a Tarot reading.
        
        Args:
            spread_type: Type of spread (single, three_card, celtic_cross)
            cards: List of card inputs with id, position, orientation
            question: Optional question being asked
            
        Returns:
            Complete Tarot reading with interpretations
        """
        start_time = time.time()
        
        # Get spread configuration
        spread_config = TAROT_SPREADS.get(spread_type, TAROT_SPREADS["three_card"])
        
        # Process each card
        card_results = []
        for card_input in cards:
            card_id = card_input.get("card_id")
            position = card_input.get("position")
            orientation = card_input.get("orientation", "upright")
            
            card_data = get_card_by_id(card_id)
            if not card_data:
                continue
            
            # Select meaning based on orientation
            meaning = card_data["upright_meaning"] if orientation == "upright" else card_data["reversed_meaning"]
            
            card_results.append({
                "card_id": card_id,
                "name": card_data["name"],
                "arcana": card_data["arcana"],
                "position": position,
                "orientation": orientation,
                "meaning": meaning,
                "keywords": card_data["keywords"],
            })
        
        # Generate narrative synthesis
        narrative = self._generate_narrative(card_results, spread_type, question)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "spread_type": spread_type,
            "spread_positions": spread_config["positions"],
            "cards": card_results,
            "narrative_synthesis": narrative,
            "question_answered": question,
        }
    
    def _generate_narrative(
        self,
        cards: List[Dict[str, Any]],
        spread_type: str,
        question: str | None
    ) -> str:
        """Generate narrative synthesis from cards."""
        if not cards:
            return "No cards to interpret."
        
        if spread_type == "single":
            card = cards[0]
            return f"The {card['name']} appears as your answer. {card['meaning']} " \
                   f"This card in {card['position']} suggests: {', '.join(card['keywords'])}."
        
        elif spread_type == "three_card":
            past, present, future = cards[0], cards[1], cards[2]
            return (
                f"Past ({past['name']}): {past['meaning']} "
                f"Present ({present['name']}): {present['meaning']} "
                f"Future ({future['name']}): {future['meaning']} "
                f"The progression suggests movement from {past['keywords'][0]} "
                f"through {present['keywords'][0]} toward {future['keywords'][0]}."
            )
        
        else:  # celtic_cross
            # Synthesize the 10 cards
            main_cards = cards[:2]  # Present + Challenge
            influences = cards[2:6]  # Foundation, Past, Crown, Future
            external = cards[6:10]  # Self, Environment, Hopes, Outcome
            
            narrative = f"The situation centers on {main_cards[0]['name']}, facing the challenge of {main_cards[1]['name']}. "
            
            if question:
                narrative += f"Regarding your question '{question}': "
            
            narrative += f"The outcome card ({cards[-1]['name']}) indicates: {cards[-1]['meaning']}"
            
            return narrative
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "78-card Tarot system with Major and Minor Arcana interpretations",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
