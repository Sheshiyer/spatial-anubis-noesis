"""
Numerology Engine - Pythagorean System
Engine 5 of 13 - Ancient Instrument Tier
"""
import time
from datetime import date
from typing import Any, Dict, List


class NumerologyEngine:
    """
    Pythagorean Numerology calculation engine.
    Calculates Life Path, Expression, Soul Urge, and other core numbers.
    """
    
    ENGINE_ID = "numerology"
    ENGINE_NAME = "Pythagorean Numerology"
    CATEGORY = "ancient"
    RESPONSE_TIME_TARGET_MS = 150
    
    # Letter to number mapping (Pythagorean system)
    LETTER_VALUES = {
        'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'h': 8, 'i': 9,
        'j': 1, 'k': 2, 'l': 3, 'm': 4, 'n': 5, 'o': 6, 'p': 7, 'q': 8, 'r': 9,
        's': 1, 't': 2, 'u': 3, 'v': 4, 'w': 5, 'x': 6, 'y': 7, 'z': 8,
    }
    
    # Number meanings
    NUMBER_MEANINGS = {
        1: {
            "name": "The Leader",
            "description": "Independence, individuality, leadership, new beginnings",
            "keywords": ["leadership", "independence", "ambition", "individuality"],
        },
        2: {
            "name": "The Peacemaker",
            "description": "Cooperation, diplomacy, sensitivity, partnership",
            "keywords": ["cooperation", "balance", "diplomacy", "sensitivity"],
        },
        3: {
            "name": "The Creative",
            "description": "Expression, creativity, joy, social interaction",
            "keywords": ["creativity", "expression", "joy", "optimism"],
        },
        4: {
            "name": "The Builder",
            "description": "Stability, practicality, hard work, foundation",
            "keywords": ["stability", "practicality", "discipline", "order"],
        },
        5: {
            "name": "The Freedom Seeker",
            "description": "Freedom, adventure, change, versatility",
            "keywords": ["freedom", "adventure", "change", "versatility"],
        },
        6: {
            "name": "The Nurturer",
            "description": "Responsibility, service, love, harmony",
            "keywords": ["love", "harmony", "responsibility", "service"],
        },
        7: {
            "name": "The Seeker",
            "description": "Analysis, wisdom, spirituality, introspection",
            "keywords": ["wisdom", "analysis", "spirituality", "knowledge"],
        },
        8: {
            "name": "The Powerhouse",
            "description": "Power, success, authority, material abundance",
            "keywords": ["power", "success", "abundance", "authority"],
        },
        9: {
            "name": "The Humanitarian",
            "description": "Compassion, completion, universal love, wisdom",
            "keywords": ["compassion", "completion", "humanitarian", "wisdom"],
        },
        11: {
            "name": "The Intuitive",
            "description": "Intuition, spiritual insight, inspiration, enlightenment",
            "keywords": ["intuition", "illumination", "inspiration", "spirituality"],
        },
        22: {
            "name": "The Master Builder",
            "description": "Master builder, practical idealism, large-scale achievement",
            "keywords": ["mastery", "practical idealism", "achievement", "vision"],
        },
        33: {
            "name": "The Master Teacher",
            "description": "Compassionate guidance, spiritual upliftment, healing",
            "keywords": ["teaching", "healing", "compassion", "guidance"],
        },
    }
    
    async def process(self, name: str, birth_date: date) -> Dict[str, Any]:
        """
        Process numerology calculation.
        
        Args:
            name: Full birth name
            birth_date: Date of birth
            
        Returns:
            Complete numerology profile
        """
        start_time = time.time()
        
        # Calculate core numbers
        life_path = self._calculate_life_path(birth_date)
        expression = self._calculate_expression(name)
        soul_urge = self._calculate_soul_urge(name)
        personality = self._calculate_personality(name)
        birthday = self._calculate_birthday(birth_date)
        maturity = self._calculate_maturity(life_path["value"], expression["value"])
        personal_year = self._calculate_personal_year(birth_date)
        
        # Calculate pinnacles and challenges
        pinnacles = self._calculate_pinnacles(birth_date)
        challenges = self._calculate_challenges(birth_date)
        
        # Build 9x9 grid
        grid = self._build_grid(name, birth_date)
        
        # Generate overall guidance
        guidance = self._generate_guidance(life_path, expression, soul_urge)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "life_path": life_path,
            "expression": expression,
            "soul_urge": soul_urge,
            "personality": personality,
            "birthday": birthday,
            "maturity": maturity,
            "personal_year": personal_year,
            "pinnacles": pinnacles,
            "challenges": challenges,
            "grid": grid,
            "overall_guidance": guidance,
        }
    
    def _reduce_number(self, num: int, master_numbers: bool = True) -> int:
        """Reduce number to single digit or master number (11, 22, 33)."""
        if master_numbers and num in (11, 22, 33):
            return num
        
        while num > 9:
            num = sum(int(d) for d in str(num))
            if master_numbers and num in (11, 22, 33):
                return num
        
        return num
    
    def _calculate_life_path(self, birth_date: date) -> Dict[str, Any]:
        """Calculate Life Path Number from birth date."""
        day = birth_date.day
        month = birth_date.month
        year = birth_date.year
        
        # Reduce each component
        day_num = self._reduce_number(day)
        month_num = self._reduce_number(month)
        year_num = self._reduce_number(year)
        
        # Sum and reduce
        total = day_num + month_num + year_num
        life_path_num = self._reduce_number(total)
        
        meaning = self.NUMBER_MEANINGS.get(life_path_num, self.NUMBER_MEANINGS[1])
        
        return {
            "value": life_path_num,
            "name": meaning["name"],
            "description": f"Your Life Path Number {life_path_num}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_expression(self, name: str) -> Dict[str, Any]:
        """Calculate Expression Number from full name."""
        total = sum(self.LETTER_VALUES.get(c, 0) for c in name.lower() if c.isalpha())
        expr_num = self._reduce_number(total)
        
        meaning = self.NUMBER_MEANINGS.get(expr_num, self.NUMBER_MEANINGS[1])
        
        return {
            "value": expr_num,
            "name": meaning["name"],
            "description": f"Your Expression Number {expr_num}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_soul_urge(self, name: str) -> Dict[str, Any]:
        """Calculate Soul Urge (Heart's Desire) from vowels in name."""
        vowels = 'aeiou'
        total = sum(self.LETTER_VALUES.get(c, 0) for c in name.lower() if c in vowels)
        soul_num = self._reduce_number(total)
        
        meaning = self.NUMBER_MEANINGS.get(soul_num, self.NUMBER_MEANINGS[1])
        
        return {
            "value": soul_num,
            "name": meaning["name"],
            "description": f"Your Soul Urge Number {soul_num}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_personality(self, name: str) -> Dict[str, Any]:
        """Calculate Personality Number from consonants in name."""
        vowels = 'aeiou'
        total = sum(self.LETTER_VALUES.get(c, 0) for c in name.lower() if c.isalpha() and c not in vowels)
        pers_num = self._reduce_number(total)
        
        meaning = self.NUMBER_MEANINGS.get(pers_num, self.NUMBER_MEANINGS[1])
        
        return {
            "value": pers_num,
            "name": meaning["name"],
            "description": f"Your Personality Number {pers_num}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_birthday(self, birth_date: date) -> Dict[str, Any]:
        """Calculate Birthday Number."""
        day_num = self._reduce_number(birth_date.day)
        meaning = self.NUMBER_MEANINGS.get(day_num, self.NUMBER_MEANINGS[1])
        
        return {
            "value": day_num,
            "name": meaning["name"],
            "description": f"Your Birthday Number {day_num}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_maturity(self, life_path: int, expression: int) -> Dict[str, Any]:
        """Calculate Maturity Number."""
        maturity_num = self._reduce_number(life_path + expression)
        meaning = self.NUMBER_MEANINGS.get(maturity_num, self.NUMBER_MEANINGS[1])
        
        return {
            "value": maturity_num,
            "name": meaning["name"],
            "description": f"Your Maturity Number {maturity_num}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_personal_year(self, birth_date: date) -> Dict[str, Any]:
        """Calculate Personal Year Number for current year."""
        current_year = date.today().year
        personal_year = self._reduce_number(birth_date.day + birth_date.month + current_year)
        meaning = self.NUMBER_MEANINGS.get(personal_year, self.NUMBER_MEANINGS[1])
        
        return {
            "value": personal_year,
            "name": meaning["name"],
            "description": f"Your Personal Year {personal_year} for {current_year}: {meaning['description']}",
            "keywords": meaning["keywords"],
        }
    
    def _calculate_pinnacles(self, birth_date: date) -> List[Dict[str, Any]]:
        """Calculate Four Pinnacles."""
        day = self._reduce_number(birth_date.day, False)
        month = self._reduce_number(birth_date.month, False)
        year = self._reduce_number(birth_date.year, False)
        
        pinnacle_values = [
            self._reduce_number(month + day),
            self._reduce_number(day + year),
            self._reduce_number(month + day + year),
            self._reduce_number(month + year),
        ]
        
        return [
            {
                "value": v,
                "name": self.NUMBER_MEANINGS.get(v, {}).get("name", "Unknown"),
                "description": self.NUMBER_MEANINGS.get(v, {}).get("description", ""),
            }
            for v in pinnacle_values
        ]
    
    def _calculate_challenges(self, birth_date: date) -> List[Dict[str, Any]]:
        """Calculate Four Challenges."""
        day = self._reduce_number(birth_date.day, False)
        month = self._reduce_number(birth_date.month, False)
        year = self._reduce_number(birth_date.year, False)
        
        challenge_values = [
            abs(month - day),
            abs(day - year),
            abs((month - day) - (day - year)),
            abs(month - year),
        ]
        
        return [
            {
                "value": v if v != 0 else 9,  # 0 becomes 9 in challenges
                "description": f"Challenge {i+1}: Overcoming limitations",
            }
            for i, v in enumerate(challenge_values)
        ]
    
    def _build_grid(self, name: str, birth_date: date) -> Dict[str, Any]:
        """Build 9x9 numerology grid."""
        # Collect all numbers from name and birth date
        all_numbers = []
        
        # From name
        for c in name.lower():
            if c in self.LETTER_VALUES:
                all_numbers.append(self.LETTER_VALUES[c])
        
        # From birth date
        for part in [birth_date.day, birth_date.month, birth_date.year]:
            all_numbers.extend(int(d) for d in str(part))
        
        # Build grid (simplified - count occurrences)
        grid_counts = {str(i): [] for i in range(1, 10)}
        for num in all_numbers:
            if 1 <= num <= 9:
                grid_counts[str(num)].append(num)
        
        # Find intensity numbers and missing numbers
        intensity = {}
        for num_str, occurrences in grid_counts.items():
            if len(occurrences) > 2:
                intensity[int(num_str)] = len(occurrences)
        
        missing = [i for i in range(1, 10) if len(grid_counts[str(i)]) == 0]
        
        return {
            "grid": grid_counts,
            "intensity_numbers": intensity,
            "missing_numbers": missing,
        }
    
    def _generate_guidance(
        self,
        life_path: Dict,
        expression: Dict,
        soul_urge: Dict
    ) -> str:
        """Generate overall guidance from core numbers."""
        return (
            f"Your Life Path {life_path['value']} as {life_path['name']} indicates "
            f"{life_path['keywords'][0]} as your core lesson. "
            f"Your Expression {expression['value']} shows how you manifest in the world: "
            f"{expression['keywords'][0]}. "
            f"Your Soul Urge {soul_urge['value']} reveals your deepest desire for "
            f"{soul_urge['keywords'][0]}."
        )
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Pythagorean numerology calculating Life Path, Expression, Soul Urge, and 9x9 grid",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
