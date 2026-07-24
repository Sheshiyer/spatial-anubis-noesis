"""
Gene Keys Engine - 64 Keys System
Engine 7 of 13 - Biological Mirrors Tier
"""
import hashlib
import time
from datetime import datetime
from typing import Any, Dict, List

from app.engines.data.gene_keys_data import (
    GENE_KEYS,
    calculate_spheres,
    get_gene_key,
)


class GeneKeysEngine:
    """
    Gene Keys calculation engine based on Richard Rudd's system.
    Calculates the 11 spheres of the Hologenetic Profile.
    """
    
    ENGINE_ID = "gene-keys"
    ENGINE_NAME = "Gene Keys"
    CATEGORY = "biological"
    RESPONSE_TIME_TARGET_MS = 180
    
    async def process(
        self,
        birth_datetime: datetime,
        birth_location: str
    ) -> Dict[str, Any]:
        """
        Process Gene Keys calculation.
        
        Args:
            birth_datetime: Birth date and time
            birth_location: Birth location
            
        Returns:
            Complete Gene Keys profile with all spheres
        """
        start_time = time.time()
        
        # Create unique seed from birth data
        birth_seed = f"{birth_datetime.isoformat()}_{birth_location}"
        
        # Calculate spheres
        sphere_numbers = calculate_spheres(birth_seed)
        
        # Build sphere data
        spheres = {}
        for sphere_name, key_num in sphere_numbers.items():
            key_data = get_gene_key(key_num)
            spheres[sphere_name] = {
                "sphere_name": sphere_name.replace("_", " ").title(),
                "key_number": key_num,
                "shadow": key_data["shadow"],
                "gift": key_data["gift"],
                "siddhi": key_data["siddhi"],
                "programming_partner": key_data["programming_partner"],
                "description": key_data["description"],
            }
        
        # Get programming partners data
        partners = self._get_programming_partners(sphere_numbers)
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "lifes_work": spheres["lifes_work"],
            "evolution": spheres["evolution"],
            "radiance": spheres["radiance"],
            "purpose": spheres["purpose"],
            "attraction": spheres["attraction"],
            "iq_sphere": spheres["iq_sphere"],
            "eq_sphere": spheres["eq_sphere"],
            "sq_sphere": spheres["sq_sphere"],
            "vq_sphere": spheres["vq_sphere"],
            "culture": spheres["culture"],
            "programming_partners": partners,
        }
    
    def _get_programming_partners(self, sphere_numbers: Dict[str, int]) -> List[Dict[str, Any]]:
        """Get programming partner relationships."""
        partners = []
        
        # Primary partners for the four main spheres
        primary_spheres = ["lifes_work", "evolution", "radiance", "purpose"]
        
        for sphere_name in primary_spheres:
            key_num = sphere_numbers[sphere_name]
            key_data = get_gene_key(key_num)
            partner_num = key_data["programming_partner"]
            partner_data = get_gene_key(partner_num)
            
            partners.append({
                "sphere": sphere_name,
                "key": key_num,
                "partner_key": partner_num,
                "partner_gift": partner_data["gift"],
                "relationship": f"{key_data['gift']} with {partner_data['gift']}",
            })
        
        return partners
    
    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": "64 Gene Keys system with Shadow, Gift, and Siddhi frequencies",
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
        }
