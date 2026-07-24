"""
Pydantic schemas for all 13 Divination Engines.
"""
from datetime import datetime, date
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ==================== Engine Base Schema ====================

class EngineBaseRequest(BaseModel):
    """Base request schema for all engines."""
    session_id: Optional[str] = None
    coherence_score: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class EngineBaseResponse(BaseModel):
    """Base response schema for all engines."""
    engine_id: str
    engine_name: str
    timestamp: datetime
    response_time_ms: float
    coherence_score: Optional[float] = None


# ==================== Engine 1: I-Ching ====================

class IChingRequest(EngineBaseRequest):
    """Request for I-Ching divination."""
    hexagram_number: int = Field(..., ge=1, le=64)
    changing_lines: List[int] = Field(default_factory=list)
    
    @field_validator('changing_lines')
    @classmethod
    def validate_changing_lines(cls, v):
        if not all(1 <= line <= 6 for line in v):
            raise ValueError("Changing lines must be between 1 and 6")
        return v


class LineInterpretation(BaseModel):
    """Single line interpretation."""
    line_number: int
    text: str
    is_changing: bool


class IChingResponse(EngineBaseResponse):
    """Response for I-Ching divination."""
    hexagram_number: int
    name: str
    chinese: str
    english_name: str
    judgment: str
    image: str
    trigram_above: str
    trigram_below: str
    line_interpretations: List[LineInterpretation]
    has_transformed: bool
    transformed_hexagram: Optional[Dict[str, Any]] = None
    guidance: str


# ==================== Engine 2: Vimshottari Dasha ====================

class VimshottariRequest(EngineBaseRequest):
    """Request for Vimshottari Dasha calculation."""
    birth_datetime: datetime
    birth_location: str
    moon_longitude: Optional[float] = Field(None, ge=0, lt=360)
    timezone: str = "UTC"


class DashaPeriod(BaseModel):
    """Individual Dasha period."""
    planet: str
    start_date: datetime
    end_date: datetime
    duration_years: float
    antardashas: Optional[List[Dict[str, Any]]] = None


class VimshottariResponse(EngineBaseResponse):
    """Response for Vimshottari Dasha calculation."""
    birth_moon_nakshatra: str
    birth_moon_pada: int
    maha_dasha_sequence: List[DashaPeriod]
    current_maha_dasha: DashaPeriod
    current_antardasha: Dict[str, Any]
    next_major_shift: datetime


# ==================== Engine 3: Tarot ====================

class TarotSpreadType(str, Enum):
    """Tarot spread types."""
    SINGLE = "single"
    THREE_CARD = "three_card"
    CELTIC_CROSS = "celtic_cross"


class TarotCardOrientation(str, Enum):
    """Tarot card orientation."""
    UPRIGHT = "upright"
    REVERSED = "reversed"


class TarotCardInput(BaseModel):
    """Input for a single tarot card."""
    card_id: int = Field(..., ge=0, le=77)
    position: str
    orientation: TarotCardOrientation = TarotCardOrientation.UPRIGHT


class TarotRequest(EngineBaseRequest):
    """Request for Tarot reading."""
    spread_type: TarotSpreadType = TarotSpreadType.THREE_CARD
    cards: List[TarotCardInput]
    question: Optional[str] = None
    
    @field_validator('cards')
    @classmethod
    def validate_card_count(cls, v, info):
        spread_type = info.data.get('spread_type')
        expected_counts = {
            TarotSpreadType.SINGLE: 1,
            TarotSpreadType.THREE_CARD: 3,
            TarotSpreadType.CELTIC_CROSS: 10,
        }
        expected = expected_counts.get(spread_type, 3)
        if len(v) != expected:
            raise ValueError(f"Expected {expected} cards for {spread_type} spread, got {len(v)}")
        return v


class TarotCardResult(BaseModel):
    """Result for a single tarot card."""
    card_id: int
    name: str
    arcana: str
    position: str
    orientation: str
    meaning: str
    keywords: List[str]


class TarotResponse(EngineBaseResponse):
    """Response for Tarot reading."""
    spread_type: str
    spread_positions: List[str]
    cards: List[TarotCardResult]
    narrative_synthesis: str
    question_answered: Optional[str] = None


# ==================== Engine 4: Runes ====================

class RuneLayoutType(str, Enum):
    """Rune layout types."""
    SINGLE = "single"
    THREE_NORN = "three_norn"
    FIVE_ELEMENT = "five_element"
    NINE_GRID = "nine_grid"


class RuneInput(BaseModel):
    """Input for a single rune."""
    rune_id: str
    position: str
    orientation: str = "upright"  # upright, reversed, or sideways
    coordinates: Optional[Dict[str, float]] = None  # 3D position


class RunesRequest(EngineBaseRequest):
    """Request for Rune casting."""
    layout_type: RuneLayoutType = RuneLayoutType.THREE_NORN
    runes: List[RuneInput]
    question: Optional[str] = None


class RuneResult(BaseModel):
    """Result for a single rune."""
    rune_id: str
    name: str
    symbol: str
    position: str
    meaning: str
    reversed_meaning: Optional[str] = None
    keywords: List[str]
    element: str
    god_association: str


class RunesResponse(EngineBaseResponse):
    """Response for Rune casting."""
    layout_type: str
    layout_positions: List[str]
    runes: List[RuneResult]
    combined_narrative: str
    elemental_analysis: Dict[str, int]


# ==================== Engine 5: Numerology ====================

class NumerologyRequest(EngineBaseRequest):
    """Request for Numerology calculation."""
    name: str
    birth_date: date


class NumerologyNumber(BaseModel):
    """Single numerology number with meaning."""
    value: int
    name: str
    description: str
    keywords: List[str]


class NumerologyGrid(BaseModel):
    """9x9 numerology grid."""
    grid: Dict[str, List[int]]
    intensity_numbers: Dict[int, int]
    missing_numbers: List[int]


class NumerologyResponse(EngineBaseResponse):
    """Response for Numerology calculation."""
    life_path: NumerologyNumber
    expression: NumerologyNumber
    soul_urge: NumerologyNumber
    personality: NumerologyNumber
    birthday: NumerologyNumber
    maturity: NumerologyNumber
    personal_year: NumerologyNumber
    pinnacles: List[NumerologyNumber]
    challenges: List[NumerologyNumber]
    grid: NumerologyGrid
    overall_guidance: str


# ==================== Engine 6: Biorhythm ====================

class BiorhythmRequest(EngineBaseRequest):
    """Request for Biorhythm calculation."""
    birthdate: date
    target_date_range_start: date
    target_date_range_end: date


class BiorhythmDay(BaseModel):
    """Biorhythm values for a single day."""
    date: date
    physical: float  # -100 to 100
    emotional: float
    intellectual: float
    is_critical: bool
    primary_cycle: str


class BiorhythmResponse(EngineBaseResponse):
    """Response for Biorhythm calculation."""
    cycle_length_physical: int = 23
    cycle_length_emotional: int = 28
    cycle_length_intellectual: int = 33
    daily_values: List[BiorhythmDay]
    critical_days: List[date]
    optimal_windows: List[Dict[str, Any]]
    guidance: str


# ==================== Engine 7: Gene Keys ====================

class GeneKeysRequest(EngineBaseRequest):
    """Request for Gene Keys calculation."""
    birth_datetime: datetime
    birth_location: str


class GeneKeySphere(BaseModel):
    """Single Gene Key sphere."""
    sphere_name: str
    key_number: int
    shadow: str
    gift: str
    siddhi: str
    programming_partner: int
    description: str


class GeneKeysResponse(EngineBaseResponse):
    """Response for Gene Keys calculation."""
    lifes_work: GeneKeySphere
    evolution: GeneKeySphere
    radiance: GeneKeySphere
    purpose: GeneKeySphere
    attraction: GeneKeySphere
    iq_sphere: GeneKeySphere
    eq_sphere: GeneKeySphere
    sq_sphere: GeneKeySphere
    vq_sphere: GeneKeySphere
    culture: GeneKeySphere
    programming_partners: List[Dict[str, Any]]


# ==================== Engine 8: Human Design ====================

class HumanDesignRequest(EngineBaseRequest):
    """Request for Human Design calculation."""
    birth_datetime: datetime
    birth_location: str


class CenterStatus(BaseModel):
    """Status of a Human Design center."""
    name: str
    defined: bool
    gates: List[int]
    channels: List[int]
    strategy_note: Optional[str] = None


class HumanDesignResponse(EngineBaseResponse):
    """Response for Human Design calculation."""
    type: str
    strategy: str
    authority: str
    profile: str
    centers: Dict[str, CenterStatus]
    defined_centers: List[str]
    undefined_centers: List[str]
    active_channels: List[Dict[str, Any]]
    gate_activations: List[Dict[str, Any]]
    incarnation_cross: str


# ==================== Engine 9: Chronobiology ====================

class Chronotype(str, Enum):
    """Chronotype classification."""
    LION = "lion"      # Early bird
    BEAR = "bear"      # Normal
    WOLF = "wolf"      # Night owl
    DOLPHIN = "dolphin"  # Insomniac


class ChronobiologyRequest(EngineBaseRequest):
    """Request for Chronobiology analysis."""
    current_time: datetime
    timezone: str
    chronotype: Optional[Chronotype] = None
    chronotype_indicators: Optional[Dict[str, Any]] = None
    pip_summary: Optional[Dict[str, Any]] = None


class ActivityWindow(BaseModel):
    """Optimal time window for an activity."""
    activity: str
    start_time: str
    end_time: str
    quality_score: float  # 0-100
    recommendation: str


class ChronobiologyResponse(EngineBaseResponse):
    """Response for Chronobiology analysis."""
    detected_chronotype: Chronotype
    confidence: float
    circadian_phase: str
    melatonin_level: str
    cortisol_level: str
    optimal_windows: List[ActivityWindow]
    current_recommendations: List[str]
    next_transition: Dict[str, Any]


# ==================== Engine 10: Decision Mirror ====================

class DecisionMirrorRequest(EngineBaseRequest):
    """Request for Decision Mirror synthesis."""
    reading_ids: List[str]
    question: Optional[str] = None
    weights: Optional[Dict[str, float]] = None


class ThemeOverlay(BaseModel):
    """Theme identified across readings."""
    theme: str
    frequency: int
    supporting_engines: List[str]
    confidence: float


class Contradiction(BaseModel):
    """Contradiction between readings."""
    engines: List[str]
    contradiction_type: str
    resolution_suggestion: str


class DecisionMirrorResponse(EngineBaseResponse):
    """Response for Decision Mirror synthesis."""
    convergence_score: float  # 0-100
    themes: List[ThemeOverlay]
    contradictions: List[Contradiction]
    synthesis_narrative: str
    confidence_level: str
    recommendation: str


# ==================== Engine 11: Transit ====================

class TransitRequest(EngineBaseRequest):
    """Request for Transit analysis."""
    natal_chart_data: Dict[str, Any]
    target_date: date


class TransitPlanet(BaseModel):
    """Planet position in transit."""
    planet: str
    sign: str
    degree: float
    house: int
    is_retrograde: bool


class TransitAspect(BaseModel):
    """Aspect between transit and natal."""
    transit_planet: str
    natal_planet: str
    aspect_type: str  # conjunction, square, trine, etc.
    orb: float
    interpretation: str
    intensity: str  # major, minor


class TransitResponse(EngineBaseResponse):
    """Response for Transit analysis."""
    target_date: date
    transit_positions: List[TransitPlanet]
    aspects_to_natal: List[TransitAspect]
    dominant_transits: List[Dict[str, Any]]
    timing_windows: List[Dict[str, Any]]
    overall_theme: str


# ==================== Engine 12: Somatic Canticle ====================

class SomaticCanticleRequest(EngineBaseRequest):
    """Request for Somatic Canticle."""
    hrv: Optional[float] = None  # Heart Rate Variability
    coherence: Optional[float] = Field(None, ge=0, le=100)
    affect: Optional[str] = None  # Emotional state
    bio_data_summary: Optional[Dict[str, Any]] = None
    session_history: Optional[List[Dict[str, Any]]] = None


class SomaticPractice(BaseModel):
    """Somatic practice recommendation."""
    tier: int  # 1, 2, or 3
    name: str
    duration_minutes: int
    description: str
    contraindications: List[str]
    benefits: List[str]


class SomaticCanticleResponse(EngineBaseResponse):
    """Response for Somatic Canticle."""
    current_state: str
    coherence_tier: int  # 1-4
    recommended_practices: List[SomaticPractice]
    content_gating_valid: bool
    gate_requirements: Dict[str, Any]
    progression_path: List[Dict[str, Any]]


# ==================== Engine 13: Cartographer ====================

class CartographerRequest(EngineBaseRequest):
    """Request for Cartographer meta-synthesis."""
    all_readings: List[Dict[str, Any]]
    session_history: List[Dict[str, Any]]
    include_cross_session: bool = True
    depth_level: int = Field(2, ge=1, le=4)


class ThemeEvolution(BaseModel):
    """Evolution of a theme over time."""
    theme: str
    first_appearance: datetime
    frequency: int
    evolution: str
    current_state: str


class CrossSessionInsight(BaseModel):
    """Insight spanning multiple sessions."""
    pattern_type: str
    description: str
    sessions_involved: List[str]
    significance: str


class CartographerResponse(EngineBaseResponse):
    """Response for Cartographer meta-synthesis."""
    unified_narrative: str
    dominant_themes: List[str]
    theme_evolution: List[ThemeEvolution]
    recurring_patterns: List[Dict[str, Any]]
    cross_session_insights: List[CrossSessionInsight]
    recommended_focus: str
    next_session_suggestions: List[str]


# ==================== Engine List Schema ====================

class EngineInfo(BaseModel):
    """Information about an available engine."""
    id: str
    name: str
    description: str
    category: str  # ancient, biological, synthesis
    response_time_target_ms: int
    requires_auth: bool


class EngineListResponse(BaseModel):
    """Response for listing available engines."""
    engines: List[EngineInfo]
    count: int
