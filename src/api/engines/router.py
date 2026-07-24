"""
FastAPI Dynamic Engine Router

P3-S3-17: FastAPI dynamic engine router (POST /{engine_id})
P3-S3-18: Pydantic response validation per engine
"""

from typing import Dict, Type, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import json

router = APIRouter(prefix="/api/engines", tags=["engines"])

# ============================================================================
# Pydantic Models for Request/Response Validation (P3-S3-18)
# ============================================================================

class EnginePosition(BaseModel):
    x: float
    y: float
    z: float

class EngineContext(BaseModel):
    coherence: Optional[float] = Field(None, ge=0, le=1)
    vessel_position: Optional[EnginePosition] = None
    active_readings: List[str] = Field(default_factory=list)

class EngineRequest(BaseModel):
    engine_id: str = Field(..., description="The ID of the engine to query")
    user_id: str = Field(..., description="Unique user identifier")
    session_id: str = Field(..., description="Current session identifier")
    input_data: Dict[str, Any] = Field(default_factory=dict, description="Engine-specific input data")
    context: EngineContext = Field(default_factory=EngineContext)

    @validator('engine_id')
    def validate_engine_id(cls, v):
        valid_engines = {
            "vimshottari", "iching", "tarot", "runes", "numerology",
            "biorhythm", "genekeys", "humandesign", "chronobiology",
            "decision-mirror", "transits", "somatic-canticle",
            "cartographer-compass"
        }
        if v not in valid_engines:
            raise ValueError(f"Invalid engine_id: {v}")
        return v

class SuggestedEngine(BaseModel):
    engine_id: str
    reason: str
    confidence: float = Field(..., ge=0, le=1)

class EngineResponse(BaseModel):
    reading_id: str = Field(..., description="Unique reading identifier")
    engine_id: str = Field(..., description="Engine that generated the reading")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    output_data: Dict[str, Any] = Field(default_factory=dict, description="Engine-specific output data")
    interpretation: str = Field(..., description="Human-readable interpretation")
    themes: List[str] = Field(default_factory=list, description="Key themes identified")
    keywords: List[str] = Field(default_factory=list, description="Relevant keywords")
    suggested_next_engines: List[SuggestedEngine] = Field(default_factory=list)
    coherence_at_reading: Optional[float] = Field(None, ge=0, le=1)

# Engine-specific response models for enhanced validation
class VimshottariResponse(EngineResponse):
    current_dasha: str
    current_antardasha: str
    planet_influence: Dict[str, Any]
    period_dates: Dict[str, datetime]

class IChingResponse(EngineResponse):
    hexagram_number: int = Field(..., ge=1, le=64)
    hexagram_name: str
    lines: List[Dict[str, Any]]
    changing_lines: List[int]
    transformed_hexagram: Optional[int] = Field(None, ge=1, le=64)

class TarotResponse(EngineResponse):
    cards: List[Dict[str, Any]]
    spread_type: str
    overall_energy: str
    positions: List[str]

class RunesResponse(EngineResponse):
    runes_cast: List[Dict[str, Any]]
    cast_type: str
    spatial_reading: Dict[str, Any]

class NumerologyResponse(EngineResponse):
    life_path: int
    expression: int
    soul_urge: int
    personality: int
    personal_year: int
    intensity_matrix: List[List[int]]

class BiorhythmResponse(EngineResponse):
    physical: float = Field(..., ge=-100, le=100)
    emotional: float = Field(..., ge=-100, le=100)
    intellectual: float = Field(..., ge=-100, le=100)
    critical_days: List[datetime]
    peak_days: List[datetime]

class GeneKeysResponse(EngineResponse):
    key_number: int = Field(..., ge=1, le=64)
    current_state: str = Field(..., regex="^(Shadow|Gift|Siddhi)$")
    shadow: str
    gift: str
    siddhi: str
    contemplation: str

class HumanDesignResponse(EngineResponse):
    type: str
    strategy: str
    authority: str
    profile: str
    defined_centers: List[str]
    undefined_centers: List[str]

class ChronobiologyResponse(EngineResponse):
    circadian_phase: str
    optimal_windows: Dict[str, List[Dict[str, Any]]]
    current_alignment: float = Field(..., ge=0, le=1)

class DecisionMirrorResponse(EngineResponse):
    convergence_score: float = Field(..., ge=0, le=100)
    engine_inputs: List[Dict[str, Any]]
    pattern_overlaps: List[Dict[str, Any]]

class TransitResponse(EngineResponse):
    active_transits: List[Dict[str, Any]]
    upcoming_transits: List[Dict[str, Any]]
    aspect_orb: float

class SomaticCanticleResponse(EngineResponse):
    chapter_id: str
    bio_requirement_met: bool
    content: str
    pacing_bpm: float

class CartographerResponse(EngineResponse):
    patterns: List[Dict[str, Any]]
    map_data: Dict[str, Any]
    cartographer_voice: str
    meta_narrative: str

# ============================================================================
# Base Engine Class
# ============================================================================

class BaseEngine:
    """Base class for all divination engines."""
    
    engine_id: str = ""
    display_name: str = ""
    tier: int = 1
    
    async def process(self, request: EngineRequest) -> EngineResponse:
        """Process the divination request and return a reading."""
        raise NotImplementedError("Subclasses must implement process()")
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate engine-specific input data."""
        return True

# ============================================================================
# Engine Implementations (Stubs for development)
# ============================================================================

class VimshottariEngine(BaseEngine):
    engine_id = "vimshottari"
    display_name = "Vimshottari Dasha Clock"
    tier = 1
    
    async def process(self, request: EngineRequest) -> VimshottariResponse:
        # TODO: Implement actual Vedic astrology calculation
        return VimshottariResponse(
            reading_id=f"vim-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Current period indicates a focus on self-development and introspection.",
            themes=["growth", "reflection", "patience"],
            keywords=["Jupiter", "expansion", "wisdom"],
            current_dasha="Jupiter",
            current_antardasha="Saturn",
            planet_influence={"strength": 0.8, "nature": "benefic"},
            period_dates={"start": datetime.utcnow(), "end": datetime.utcnow()}
        )

class IChingEngine(BaseEngine):
    engine_id = "iching"
    display_name = "I-Ching Oracle"
    tier = 1
    
    async def process(self, request: EngineRequest) -> IChingResponse:
        # TODO: Implement actual I-Ching hexagram calculation
        return IChingResponse(
            reading_id=f"iching-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="The Creative works sublime success, furthering through perseverance.",
            themes=["creation", "action", "initiative"],
            keywords=["heaven", "power", "beginning"],
            hexagram_number=1,
            hexagram_name="The Creative",
            lines=[{"position": 1, "value": 7, "changing": False} for _ in range(6)],
            changing_lines=[],
            transformed_hexagram=None
        )

class TarotEngine(BaseEngine):
    engine_id = "tarot"
    display_name = "Tarot Arcana"
    tier = 1
    
    async def process(self, request: EngineRequest) -> TarotResponse:
        return TarotResponse(
            reading_id=f"tarot-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="The Fool begins a new journey with unlimited potential.",
            themes=["beginnings", "potential", "innocence"],
            keywords=["fool", "journey", "trust"],
            cards=[{"name": "The Fool", "position": 1, "reversed": False}],
            spread_type="single",
            overall_energy="New beginnings",
            positions=["Present"]
        )

class RuneEngine(BaseEngine):
    engine_id = "runes"
    display_name = "Rune Stones"
    tier = 1
    
    async def process(self, request: EngineRequest) -> RunesResponse:
        return RunesResponse(
            reading_id=f"runes-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Fehu indicates wealth and prosperity in your endeavors.",
            themes=["prosperity", "abundance", "reward"],
            keywords=["fehu", "cattle", "wealth"],
            runes_cast=[{"rune": "Fehu", "position": "center", "orientation": "upright"}],
            cast_type="single",
            spatial_reading={"center": "Fehu", "direction": "proceed"}
        )

class NumerologyEngine(BaseEngine):
    engine_id = "numerology"
    display_name = "Numerology Matrix"
    tier = 1
    
    async def process(self, request: EngineRequest) -> NumerologyResponse:
        return NumerologyResponse(
            reading_id=f"num-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Your Life Path 7 indicates a seeker of truth and wisdom.",
            themes=["spirituality", "analysis", "wisdom"],
            keywords=["seven", "seeker", "mystery"],
            life_path=7,
            expression=3,
            soul_urge=9,
            personality=1,
            personal_year=4,
            intensity_matrix=[[0] * 9 for _ in range(9)]
        )

class BiorhythmEngine(BaseEngine):
    engine_id = "biorhythm"
    display_name = "Biorhythm Compass"
    tier = 2
    
    async def process(self, request: EngineRequest) -> BiorhythmResponse:
        return BiorhythmResponse(
            reading_id=f"bio-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Your emotional cycle is ascending, favoring creative work.",
            themes=["cycles", "energy", "timing"],
            keywords=["rhythm", "cycle", "flow"],
            physical=65.5,
            emotional=82.3,
            intellectual=-12.1,
            critical_days=[],
            peak_days=[datetime.utcnow()]
        )

class GeneKeysEngine(BaseEngine):
    engine_id = "genekeys"
    display_name = "Gene Keys Helix"
    tier = 2
    
    async def process(self, request: EngineRequest) -> GeneKeysResponse:
        return GeneKeysResponse(
            reading_id=f"gk-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="In the Gift frequency, you become the artist of your own life.",
            themes=["creativity", "expression", "beauty"],
            keywords=["art", "expression", "gift"],
            key_number=1,
            current_state="Gift",
            shadow="Entropy",
            gift="Freshness",
            siddhi="Beauty",
            contemplation="What wants to be created through me?"
        )

class HumanDesignEngine(BaseEngine):
    engine_id = "humandesign"
    display_name = "Human Design Bodygraph"
    tier = 2
    
    async def process(self, request: EngineRequest) -> HumanDesignResponse:
        return HumanDesignResponse(
            reading_id=f"hd-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="As a Generator, your strategy is to respond, not initiate.",
            themes=["authority", "strategy", "type"],
            keywords=["generator", "sacral", "response"],
            type="Generator",
            strategy="To Respond",
            authority="Sacral",
            profile="3/5",
            defined_centers=["Sacral", "Root"],
            undefined_centers=["Head", "Ajna", "Throat", "G", "Heart", "Spleen", "Solar Plexus"]
        )

class ChronobiologyEngine(BaseEngine):
    engine_id = "chronobiology"
    display_name = "Chronobiology Clock"
    tier = 2
    
    async def process(self, request: EngineRequest) -> ChronobiologyResponse:
        return ChronobiologyResponse(
            reading_id=f"chrono-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Your optimal creative window begins in 2 hours.",
            themes=["timing", "optimization", "alignment"],
            keywords=["circadian", "ultradian", "peak"],
            circadian_phase="ascending",
            optimal_windows={
                "creative": [{"start": "10:00", "end": "12:00", "intensity": 0.9}],
                "analytical": [{"start": "14:00", "end": "16:00", "intensity": 0.8}]
            },
            current_alignment=0.75
        )

class DecisionMirrorEngine(BaseEngine):
    engine_id = "decision-mirror"
    display_name = "Decision Mirror"
    tier = 3
    
    async def process(self, request: EngineRequest) -> DecisionMirrorResponse:
        return DecisionMirrorResponse(
            reading_id=f"dm-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Your data shows convergence on patience over immediate action.",
            themes=["convergence", "pattern", "clarity"],
            keywords=["mirror", "decision", "pattern"],
            convergence_score=78.5,
            engine_inputs=[{"engine": "iching", "alignment": 0.8}],
            pattern_overlaps=[{"theme": "patience", "engines": ["iching", "tarot"]}]
        )

class TransitEngine(BaseEngine):
    engine_id = "transits"
    display_name = "Transit Overlay"
    tier = 3
    
    async def process(self, request: EngineRequest) -> TransitResponse:
        return TransitResponse(
            reading_id=f"transit-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Jupiter transiting your 10th house brings career opportunities.",
            themes=["transit", "opportunity", "expansion"],
            keywords=["jupiter", "career", "growth"],
            active_transits=[{"planet": "Jupiter", "house": 10, "aspect": "conjunction"}],
            upcoming_transits=[{"planet": "Saturn", "date": datetime.utcnow()}],
            aspect_orb=3.0
        )

class SomaticCanticleEngine(BaseEngine):
    engine_id = "somatic-canticle"
    display_name = "Somatic Canticle Index"
    tier = 3
    
    async def process(self, request: EngineRequest) -> SomaticCanticleResponse:
        return SomaticCanticleResponse(
            reading_id=f"sc-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Chapter 3: The Breath of Creation. Read when heart-centered.",
            themes=["somatic", "embodiment", "presence"],
            keywords=["breath", "body", "presence"],
            chapter_id="chapter-3",
            bio_requirement_met=request.context.coherence is not None and request.context.coherence > 0.6,
            content="The body remembers what the mind forgets...",
            pacing_bpm=6.0
        )

class CartographerEngine(BaseEngine):
    engine_id = "cartographer-compass"
    display_name = "The Cartographer's Compass"
    tier = 3
    
    async def process(self, request: EngineRequest) -> CartographerResponse:
        return CartographerResponse(
            reading_id=f"carto-{datetime.utcnow().timestamp()}",
            engine_id=self.engine_id,
            interpretation="Across your readings, a pattern emerges: transformation through patience.",
            themes=["synthesis", "pattern", "meta"],
            keywords=["cartographer", "map", "convergence"],
            patterns=[{"id": "patience", "engines": 5, "coherence": 0.82}],
            map_data={"nodes": [], "connections": []},
            cartographer_voice="guiding",
            meta_narrative="The seeker walks many paths, but all lead to the same mountain."
        )

# ============================================================================
# Engine Registry
# ============================================================================

ENGINE_REGISTRY: Dict[str, Type[BaseEngine]] = {
    "vimshottari": VimshottariEngine,
    "iching": IChingEngine,
    "tarot": TarotEngine,
    "runes": RuneEngine,
    "numerology": NumerologyEngine,
    "biorhythm": BiorhythmEngine,
    "genekeys": GeneKeysEngine,
    "humandesign": HumanDesignEngine,
    "chronobiology": ChronobiologyEngine,
    "decision-mirror": DecisionMirrorEngine,
    "transits": TransitEngine,
    "somatic-canticle": SomaticCanticleEngine,
    "cartographer-compass": CartographerEngine,
}

# ============================================================================
# API Routes
# ============================================================================

@router.post("/{engine_id}", response_model=EngineResponse)
async def query_engine(engine_id: str, request: EngineRequest):
    """
    Dynamic engine router - queries any engine by ID.
    
    P3-S3-17: POST /{engine_id} endpoint
    P3-S3-18: Pydantic response validation
    """
    # Validate engine exists
    engine_class = ENGINE_REGISTRY.get(engine_id)
    if not engine_class:
        raise HTTPException(
            status_code=404,
            detail=f"Engine '{engine_id}' not found. Valid engines: {list(ENGINE_REGISTRY.keys())}"
        )
    
    # Override engine_id from path
    request.engine_id = engine_id
    
    # Validate input
    engine_instance = engine_class()
    if not engine_instance.validate_input(request.input_data):
        raise HTTPException(
            status_code=400,
            detail="Invalid input data for engine"
        )
    
    # Process request
    try:
        response = await engine_instance.process(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Engine processing error: {str(e)}"
        )

@router.get("/{engine_id}/schema")
async def get_engine_schema(engine_id: str):
    """Get the response schema for a specific engine."""
    engine_class = ENGINE_REGISTRY.get(engine_id)
    if not engine_class:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_id}' not found")
    
    # Return schema based on engine type
    response_models = {
        "vimshottari": VimshottariResponse,
        "iching": IChingResponse,
        "tarot": TarotResponse,
        "runes": RunesResponse,
        "numerology": NumerologyResponse,
        "biorhythm": BiorhythmResponse,
        "genekeys": GeneKeysResponse,
        "humandesign": HumanDesignResponse,
        "chronobiology": ChronobiologyResponse,
        "decision-mirror": DecisionMirrorResponse,
        "transits": TransitResponse,
        "somatic-canticle": SomaticCanticleResponse,
        "cartographer-compass": CartographerResponse,
    }
    
    model = response_models.get(engine_id, EngineResponse)
    return model.schema()

@router.get("/")
async def list_engines():
    """List all available engines with their metadata."""
    return {
        "engines": [
            {
                "id": engine_id,
                "name": engine_class().display_name,
                "tier": engine_class().tier,
                "endpoint": f"/api/engines/{engine_id}"
            }
            for engine_id, engine_class in ENGINE_REGISTRY.items()
        ]
    }

@router.get("/health")
async def health_check():
    """Health check endpoint for the engine service."""
    return {
        "status": "healthy",
        "engines_loaded": len(ENGINE_REGISTRY),
        "timestamp": datetime.utcnow().isoformat()
    }
