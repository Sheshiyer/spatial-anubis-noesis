"""
Vimshottari Dasha Engine - Vedic Astrology Periods
Engine 2 of 13 - Ancient Instrument Tier
"""
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.models.models import DashaPlanet


class VimshottariEngine:
    """
    Vimshottari Dasha calculation engine for Vedic astrology.
    Calculates Maha Dasha, Antar Dasha, and Pratyantar Dasha periods.
    """
    
    ENGINE_ID = "vimshottari"
    ENGINE_NAME = "Vimshottari Dasha"
    CATEGORY = "ancient"
    RESPONSE_TIME_TARGET_MS = 200
    
    # Dasha periods in years
    DASHA_PERIODS = {
        "ketu": 7,
        "venus": 20,
        "sun": 6,
        "moon": 10,
        "mars": 7,
        "rahu": 18,
        "jupiter": 16,
        "saturn": 19,
        "mercury": 17,
    }
    
    # Dasha sequence
    DASHA_SEQUENCE = [
        "ketu", "venus", "sun", "moon", "mars", "rahu",
        "jupiter", "saturn", "mercury"
    ]
    
    # Nakshatras and their lords
    NAKSHATRA_LORDS = [
        "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
        "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
        "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
    ]
    
    NAKSHATRA_NAMES = [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", 
        "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
        "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
        "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
        "Uttara Bhadrapada", "Revati"
    ]
    
    async def process(
        self,
        birth_datetime: datetime,
        birth_location: str,
        moon_longitude: Optional[float] = None,
        timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Process Vimshottari Dasha calculation.
        
        Args:
            birth_datetime: Birth date and time
            birth_location: Birth location string
            moon_longitude: Optional moon longitude in degrees
            timezone: Birth timezone
            
        Returns:
            Complete Dasha sequence with current periods
        """
        start_time = time.time()
        
        # Calculate moon nakshatra
        nakshatra_index, pada = self._calculate_nakshatra(moon_longitude)
        nakshatra_name = self.NAKSHATRA_NAMES[nakshatra_index]
        nakshatra_lord = self.NAKSHATRA_LORDS[nakshatra_index]
        
        # Calculate Dasha sequence
        dasha_sequence = self._calculate_dasha_sequence(
            birth_datetime, nakshatra_lord, nakshatra_index, pada
        )
        
        # Find current dasha
        now = datetime.utcnow()
        current_maha = self._find_current_dasha(dasha_sequence, now)
        current_antar = self._calculate_antardasha(current_maha, now)
        
        # Find next major shift
        next_shift = self._find_next_shift(dasha_sequence, now)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "birth_moon_nakshatra": nakshatra_name,
            "birth_moon_pada": pada,
            "maha_dasha_sequence": dasha_sequence,
            "current_maha_dasha": current_maha,
            "current_antardasha": current_antar,
            "next_major_shift": next_shift,
        }
    
    def _calculate_nakshatra(self, moon_longitude: Optional[float]) -> tuple:
        """Calculate nakshatra index and pada from moon longitude."""
        if moon_longitude is None:
            # Default calculation based on seed
            moon_longitude = 15.0  # Default to first nakshatra
        
        # Each nakshatra is 13°20' (13.333... degrees)
        nakshatra_deg = 360 / 27
        nakshatra_index = int(moon_longitude / nakshatra_deg) % 27
        
        # Each pada is 3°20' (3.333... degrees)
        pada_deg = nakshatra_deg / 4
        pada = int((moon_longitude % nakshatra_deg) / pada_deg) + 1
        
        return nakshatra_index, min(pada, 4)
    
    def _calculate_dasha_sequence(
        self,
        birth_datetime: datetime,
        starting_lord: str,
        nakshatra_index: int,
        pada: int
    ) -> List[Dict[str, Any]]:
        """Calculate the complete Maha Dasha sequence from birth."""
        sequence = []
        
        # Find starting position in sequence
        start_index = self.DASHA_SEQUENCE.index(starting_lord)
        
        # Calculate balance of first dasha
        # Each pada = 1/4 of nakshatra = 1/4 of dasha period
        remaining_fraction = (4 - pada + 1) / 4
        
        current_date = birth_datetime
        
        for i in range(9):  # 9 dasha periods
            dasha_index = (start_index + i) % 9
            planet = self.DASHA_SEQUENCE[dasha_index]
            
            if i == 0:
                # First dasha has remaining fraction
                duration = self.DASHA_PERIODS[planet] * remaining_fraction
            else:
                duration = self.DASHA_PERIODS[planet]
            
            end_date = current_date + timedelta(days=int(duration * 365.25))
            
            sequence.append({
                "planet": planet,
                "start_date": current_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_years": duration,
                "antardashas": self._generate_antardashas(planet, current_date, duration),
            })
            
            current_date = end_date
        
        return sequence
    
    def _generate_antardashas(
        self,
        maha_planet: str,
        start_date: datetime,
        duration_years: float
    ) -> List[Dict[str, Any]]:
        """Generate Antar Dasha periods within a Maha Dasha."""
        antardashas = []
        
        maha_index = self.DASHA_SEQUENCE.index(maha_planet)
        total_days = duration_years * 365.25
        
        current_date = start_date
        
        for i in range(9):
            antar_planet = self.DASHA_SEQUENCE[(maha_index + i) % 9]
            
            # Antar dasha proportion = sub-period years / 120 (total cycle)
            antar_fraction = self.DASHA_PERIODS[antar_planet] / 120
            antar_days = total_days * antar_fraction
            
            end_date = current_date + timedelta(days=int(antar_days))
            
            antardashas.append({
                "planet": antar_planet,
                "start_date": current_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_days": int(antar_days),
            })
            
            current_date = end_date
        
        return antardashas
    
    def _find_current_dasha(
        self,
        dasha_sequence: List[Dict[str, Any]],
        current_time: datetime
    ) -> Dict[str, Any]:
        """Find the current active Maha Dasha."""
        for dasha in dasha_sequence:
            start = datetime.fromisoformat(dasha["start_date"])
            end = datetime.fromisoformat(dasha["end_date"])
            if start <= current_time < end:
                return dasha
        return dasha_sequence[-1]  # Return last if beyond range
    
    def _calculate_antardasha(
        self,
        maha_dasha: Dict[str, Any],
        current_time: datetime
    ) -> Dict[str, Any]:
        """Find current Antar Dasha within Maha Dasha."""
        for antar in maha_dasha.get("antardashas", []):
            start = datetime.fromisoformat(antar["start_date"])
            end = datetime.fromisoformat(antar["end_date"])
            if start <= current_time < end:
                return antar
        return {}
    
    def _find_next_shift(
        self,
        dasha_sequence: List[Dict[str, Any]],
        current_time: datetime
    ) -> datetime:
        """Find the next major dasha change."""
        for dasha in dasha_sequence:
            end = datetime.fromisoformat(dasha["end_date"])
            if end > current_time:
                return end
        return datetime.utcnow() + timedelta(days=365)
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "Vedic Dasha system calculating planetary periods from birth moon position",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
