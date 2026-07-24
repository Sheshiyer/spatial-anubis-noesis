"""
Somatic Canticle Engine - Bio-Gated Content Release
Engine 12 of 13 - Synthesis Instruments Tier
"""
import time
from typing import Any, Dict, List, Optional


# Section templates with bio-gating configuration
SECTION_TEMPLATES = {
    "opening": {
        "title": "Invocation",
        "gate_type": "none",
        "gate_threshold": 0,
        "content_high": (
            "Your somatic canticle emerges from the convergence of biological "
            "rhythms and cosmic patterns. This personalized text unfurls "
            "according to your bio-state, revealing insights when coherence permits."
        ),
        "content_low": None,  # Always uses high (no gate)
    },
    "physical": {
        "title": "The Body's Wisdom",
        "gate_type": "coherence",
        "gate_threshold": 30,
        "content_high": (
            "Your physical vitality is high. This is a time for action, for "
            "moving the body in ways that express your energy. Trust the "
            "strength in your limbs and the clarity in your movement."
        ),
        "content_low": (
            "The body speaks in subtler tones today. Listen to its need for "
            "rest, for gentle movement, for nourishment that goes beyond the "
            "physical into the realm of subtle energy."
        ),
    },
    "emotional": {
        "title": "The Current of Feeling",
        "gate_type": "breath_phase",
        "gate_threshold": 0.3,
        "content_high": (
            "Emotional waters run clear today. You may find yourself drawn to "
            "connection, to the expression of feeling that moves through you "
            "like a current."
        ),
        "content_low": (
            "The emotional body seeks stillness. Allow feelings to pass through "
            "without attachment, like clouds moving across the sky of awareness."
        ),
    },
    "mental": {
        "title": "Thoughts and Silence",
        "gate_type": "coherence",
        "gate_threshold": 50,
        "content_high": (
            "Mental clarity shines like polished obsidian. Complex problems "
            "unravel, and the pattern behind patterns becomes visible to your "
            "inner eye."
        ),
        "content_low": (
            "The mind asks for a different kind of engagement today. Instead "
            "of solving, try wondering. Instead of knowing, practice the art "
            "of curious uncertainty."
        ),
    },
    "spiritual": {
        "title": "The Inner Sanctuary",
        "gate_type": "presence",
        "gate_threshold": 60,
        "content_high": (
            "Beyond the cycles of body and mind, there is a place of stillness "
            "that is always available. This section reveals itself only when "
            "presence is deep enough to recognize itself."
        ),
        "content_low": None,
    },
    "integration": {
        "title": "The Synthesis",
        "gate_type": "coherence",
        "gate_threshold": 70,
        "content_high": None,  # Dynamically generated from themes
        "content_low": (
            "Integration takes time. The various aspects of your being are "
            "moving toward harmony, each at its own pace. Patience is itself "
            "a form of wisdom."
        ),
    },
    "closing": {
        "title": "Release",
        "gate_type": "none",
        "gate_threshold": 0,
        "content_high": (
            "This canticle dissolves like morning mist as your bio-state shifts. "
            "Return to it when the body, heart, and mind align again. The scroll "
            "remembers what you have seen."
        ),
        "content_low": None,
    },
}

# Ordered section keys for canticle generation
SECTION_ORDER = [
    "opening", "physical", "emotional", "mental",
    "spiritual", "integration", "closing",
]


class SomaticCanticleEngine:
    """
    Somatic Canticle engine for bio-gated content release.
    Generates personalized canticle sections that unlock based on
    coherence thresholds and bio-state gates.
    """

    ENGINE_ID = "somatic-canticle"
    ENGINE_NAME = "Somatic Canticle Index"
    CATEGORY = "synthesis"
    RESPONSE_TIME_TARGET_MS = 200

    async def process(
        self,
        themes: List[Dict[str, Any]],
        bio_state: Optional[Dict[str, Any]] = None,
        source_engines: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Process Somatic Canticle generation.

        Args:
            themes: Convergence themes from engine readings.
                    Each theme: {name, category, sources, strength, description}
            bio_state: Current bio-state data.
                       {coherence, breath_phase, presence_duration}
            source_engines: List of engine IDs that contributed themes.

        Returns:
            Canticle with bio-gated sections and scroll state.
        """
        start_time = time.time()

        bio_state = bio_state or {
            "coherence": 0,
            "breath_phase": 0,
            "presence_duration": 0,
        }
        source_engines = source_engines or []

        # Generate sections
        sections = self._generate_sections(themes, bio_state)

        # Calculate scroll state
        unlocked_count = sum(1 for s in sections if s["unlocked"])
        total_count = len(sections)

        scroll_state = {
            "unfurl_progress": unlocked_count / total_count if total_count > 0 else 0,
            "current_section": unlocked_count,
            "total_sections": total_count,
            "bio_gated": True,
            "required_coherence": 30,
        }

        # Generate title
        title = self._generate_title(themes)

        # Generate insights
        insights = self._generate_insights(themes)

        response_time = (time.time() - start_time) * 1000

        return {
            "engine_id": self.ENGINE_ID,
            "engine_name": self.ENGINE_NAME,
            "timestamp": time.time(),
            "response_time_ms": response_time,
            "title": title,
            "source_engines": source_engines,
            "sections": sections,
            "scroll_state": scroll_state,
            "insights": insights,
            "bio_state_summary": {
                "current_coherence": bio_state.get("coherence", 0),
                "sections_unlocked": unlocked_count,
                "sections_total": total_count,
                "fully_unfurled": unlocked_count == total_count,
            },
        }

    def _generate_sections(
        self,
        themes: List[Dict[str, Any]],
        bio_state: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate all canticle sections with bio-gating."""
        sections = []
        categories_present = {t.get("category", "") for t in themes}
        coherence = bio_state.get("coherence", 0)
        breath_phase = bio_state.get("breath_phase", 0)
        presence_duration = bio_state.get("presence_duration", 0)

        for key in SECTION_ORDER:
            template = SECTION_TEMPLATES[key]

            # Skip themed sections if category not present
            if key == "physical" and "Physical" not in categories_present:
                continue
            if key == "emotional" and "Emotional" not in categories_present:
                continue
            if key == "mental" and "Mental" not in categories_present:
                continue
            if key == "spiritual":
                has_spiritual = "Spiritual" in categories_present
                has_high_strength = any(t.get("strength", 0) > 70 for t in themes)
                if not has_spiritual and not has_high_strength:
                    continue
            if key == "integration" and len(themes) < 2:
                continue

            # Determine unlock state
            unlocked = self._check_gate(
                template["gate_type"],
                template["gate_threshold"],
                coherence,
                breath_phase,
                presence_duration,
            )

            # Select content based on theme strength
            content = self._select_content(key, template, themes)

            sections.append({
                "id": key,
                "title": template["title"],
                "content": content,
                "gate_type": template["gate_type"],
                "gate_threshold": template["gate_threshold"],
                "unlocked": unlocked,
                "unlocked_at": time.time() if unlocked else None,
            })

        return sections

    def _check_gate(
        self,
        gate_type: str,
        threshold: float,
        coherence: float,
        breath_phase: float,
        presence_duration: float,
    ) -> bool:
        """Check if a bio-gate is satisfied."""
        if gate_type == "none":
            return True
        if gate_type == "coherence":
            return coherence >= threshold
        if gate_type == "breath_phase":
            return abs(breath_phase - 0.5) < threshold
        if gate_type == "presence":
            return coherence >= threshold and presence_duration >= 30
        return False

    def _select_content(
        self,
        section_key: str,
        template: Dict[str, Any],
        themes: List[Dict[str, Any]],
    ) -> str:
        """Select content variant based on theme strength."""
        # Integration section: dynamically generated
        if section_key == "integration":
            high_strength = [t for t in themes if t.get("strength", 0) > 70]
            if len(high_strength) >= 2:
                names = " and ".join(t.get("name", "Unknown") for t in high_strength[:3])
                return (
                    f"Multiple systems align in this moment. The convergence of "
                    f"{names} creates a window of extraordinary clarity. "
                    f"Decisions made now carry the weight of alignment."
                )
            return template["content_low"] or ""

        # Category-keyed sections: check theme strength
        category_map = {
            "physical": "Physical",
            "emotional": "Emotional",
            "mental": "Mental",
        }
        if section_key in category_map:
            category = category_map[section_key]
            matching = [t for t in themes if t.get("category") == category]
            threshold = 60 if section_key != "emotional" else 50
            if matching and matching[0].get("strength", 0) > threshold:
                return template["content_high"] or ""
            return template["content_low"] or template["content_high"] or ""

        # Default sections (opening, spiritual, closing)
        return template["content_high"] or ""

    def _generate_title(self, themes: List[Dict[str, Any]]) -> str:
        """Generate canticle title from themes."""
        if not themes:
            return "Canticle of The Unnamed"

        strongest = max(themes, key=lambda t: t.get("strength", 0))
        hour = int(time.time() % 86400 / 3600)
        time_adjectives = ["Morning", "Noon", "Evening", "Night"]
        time_index = (hour // 6) % 4

        return f"Canticle of {time_adjectives[time_index]} {strongest.get('name', 'Silence')}"

    def _generate_insights(self, themes: List[Dict[str, Any]]) -> List[str]:
        """Generate personalized insights from themes."""
        insights = []

        if any(
            t.get("category") == "Physical" and t.get("strength", 0) > 60
            for t in themes
        ):
            insights.append("Physical vitality supports bold action")

        if any(
            t.get("category") == "Mental" and t.get("strength", 0) > 60
            for t in themes
        ):
            insights.append("Mental clarity aids complex decisions")

        if len(themes) >= 3:
            insights.append("Multiple convergences suggest a moment of significance")

        if themes and all(t.get("strength", 0) < 40 for t in themes):
            insights.append("A quieter moment - rest and integration are called for")

        return insights

    def get_info(self) -> Dict[str, Any]:
        """Get engine information."""
        return {
            "id": self.ENGINE_ID,
            "name": self.ENGINE_NAME,
            "description": (
                "Bio-gated canticle that unfurls personalized content "
                "based on coherence thresholds and bio-state gates"
            ),
            "category": self.CATEGORY,
            "response_time_target_ms": self.RESPONSE_TIME_TARGET_MS,
            "requires_auth": False,
            "gate_types": ["none", "coherence", "breath_phase", "presence"],
            "section_types": list(SECTION_TEMPLATES.keys()),
        }
