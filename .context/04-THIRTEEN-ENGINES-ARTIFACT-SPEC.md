# 04-THIRTEEN-ENGINES-ARTIFACT-SPEC.md

**Project:** Triambhakam OASIS // NOESIS
**Module:** The Eighteen Engines (Divination Artifacts & Spatial Interaction — 13 Core + 5 Bonus via Selemene)
**Version:** 1.0.0 (Alpha)
**Status:** DRAFT SPECIFICATION
**Authored By:** The Witness Architect (Aletheos)

---

## 1. Executive Summary: Alchemy You Can Touch

The 13 Engines are not apps. They are not dashboards. They are not interfaces.

They are **spatial artifacts**--objects with weight, texture, and physical presence--that encode divination, self-inquiry, and pattern recognition into forms the user must physically engage. A Tarot reading is not a button press; it is a hand reaching through a veil of light. An I-Ching consultation is not a random number generator; it is three coins thrown across a stone dish, their final resting orientations determined by Rapier physics.

This document specifies how each of the 13 Divination Engines transforms from a database query into a 3D interactive artifact inhabiting the East Wing constellation (Doc 01, Section 4.2). Where Doc 01 defined the Latent Temple's spatial coordinate system and Doc 02 defined the Crystalline Ship as the user's embodied presence, this document defines **what the user encounters when they arrive**.

### 1.1 The Field Cartographer's Principle

Every engine follows a single design axiom: **the artifact teaches its own use**. There are no tutorials, no tooltips, no onboarding modals. The I-Ching coins sit in a dish. The user picks one up. Physics does the rest. The Gene Keys Helix glows at specific nodes. The user touches one. The Shadow-Gift-Siddhi progression unfolds.

This is the cartographer's philosophy made spatial: the map is not separate from the terrain. The engine *is* the practice.

### 1.2 Relationship to NOESIS Core Offerings

The 13 Engines serve as the **substrate layer** for five of the six NOESIS core offerings:

| NOESIS Offering | Engine Relationship |
|----------------|---------------------|
| **Witness Agents** | Invisible guardrails that regulate Engine depth (Tier gating, unlock logic) |
| **Somatic Canticles** | Engine 12 (Somatic Canticle Index) gates narrative release via bio-readiness |
| **Symbolic Narratives** | Engines generate the raw symbol data that Narratives encode into manga/visual form |
| **Decision Mirrors** | Engine 10 (Decision Mirror) is the direct artifact implementation |
| **Ritual Objects** | Every Engine artifact *is* a ritual object--the physical bridge between symbol and body |
| **Infinite Treasure Hunt** | Cross-engine progression feeds the Dharma/Artha/Kama/Moksha game layer |

---

## 2. Engine Taxonomy: Three Tiers of Inquiry

The 13 Engines are organized into three tiers based on their epistemological function. This is not an arbitrary grouping--it maps directly to the unlock and progression system (Section 6) and to the spatial placement logic (Section 4).

### 2.1 Tier 1: The Ancient Instruments

Traditional divination systems. These are humanity's oldest technologies for pattern recognition. They require no biological data--only intention.

| # | Engine | System | Core Function |
|---|--------|--------|---------------|
| 1 | Vimshottari Dasha | Vedic Astrology | Planetary period calculator mapping temporal cycles |
| 2 | I-Ching Oracle | Chinese Divination | 64 hexagram oracle via physical coin toss |
| 3 | Tarot Arcana | Western Esoteric | Major/Minor Arcana as reflective archetypal surfaces |
| 4 | Rune Stones | Norse/Germanic | Elder Futhark casting and spatial reading |
| 5 | Numerology Matrix | Pythagorean | Numerological reduction and life-path analysis |

### 2.2 Tier 2: The Biological Mirrors

Body-data driven instruments. These require active bio-data connection (webcam/PIP analysis active, per Doc 02 Section 3). They reflect the body's own patterns back to the user.

| # | Engine | System | Core Function |
|---|--------|--------|---------------|
| 6 | Biorhythm Compass | Chronobiology | Physical/Emotional/Intellectual cycle mapping |
| 7 | Gene Keys Helix | Gene Keys | 64-key activation map (Shadow/Gift/Siddhi) |
| 8 | Human Design Bodygraph | Human Design | Type, Strategy, Authority constellation |
| 9 | Chronobiology Clock | Circadian Science | Circadian/Ultradian rhythm synchronization |

### 2.3 Tier 3: The Synthesis Instruments

Cross-system integration engines. These do not generate readings independently--they synthesize data from Tier 1 and Tier 2 engines into convergent insights.

| # | Engine | System | Core Function |
|---|--------|--------|---------------|
| 10 | Decision Mirror | Convergence | Multi-system data overlay for practical choices |
| 11 | Transit Overlay | Vedic/Western Astrology | Current planetary transits mapped onto natal chart |
| 12 | Somatic Canticle Index | Bio-Narrative | Body-readiness gating for content release |
| 13 | The Cartographer's Compass | Meta-Pattern | Reads coherence across all 12 active engines |

---

## 3. Per-Engine Artifact Specifications

Each engine is defined across five dimensions: **Visual Form**, **Material & Shader**, **Interaction Mechanic**, **Backend Trigger**, and **Output Display**.

### 3.1 Engine 01: Vimshottari Dasha Clock

**3D Visual Form:** A rotating multi-ring celestial astrolabe suspended at eye level. Nine concentric rings, each representing a planetary lord (Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus). The rings rotate at different speeds proportional to their Dasha period lengths (Sun: 6 years, Moon: 10 years ... Venus: 20 years). The current active Dasha ring is elevated and highlighted.

**Material & Shader:**
- Ring geometry: Bone (`#F5F0E8`) with etched Devanagari planetary glyphs
- Active Dasha ring: Aged Gold (`#B8860B`) with selective bloom (threshold 0.8, per Doc 01 Section 7.2)
- Inactive rings: Stone Grey (`#6B6B6B`) at 60% opacity
- Central axis: Terracotta (`#C65D3B`) pulsing at the user's breath rate (PIP sync)

**Interaction Mechanic:**
- **Hover (Raycasting):** Ring expands outward, revealing period dates as floating text
- **Grab (Click + Drag):** User can rotate individual rings to explore past/future periods. Rapier `RevoluteJoint` constrains rotation to the ring's axis
- **Proximity (< 3 units):** The astrolabe tilts toward the user's Vessel, displaying the current Antardasha (sub-period) as inner micro-rings

**Backend Trigger:**
```typescript
// React event -> FastAPI
const onDashaSelect = async (planetId: string, birthData: UserBirthData) => {
  const response = await fetch('/api/engines/vimshottari', {
    method: 'POST',
    body: JSON.stringify({
      planet: planetId,
      birth_datetime: birthData.datetime,
      birth_location: birthData.location,
      query_depth: 'antardasha' // or 'mahadasha', 'pratyantardasha'
    })
  });
  return response.json() as VimshottariReading;
};
```

**Output Display:** Period dates and planetary influences materialize as floating Bone-colored text particles that orbit the selected ring. The text uses a 3D `TextGeometry` with a custom `ShaderMaterial` that fades based on distance from the user.

---

### 3.2 Engine 02: I-Ching Oracle

**3D Visual Form:** Three ancient bronze coins resting in a shallow stone dish. The dish sits on a rough-hewn basalt pedestal. Above the dish, empty air waits for the hexagram to be projected.

**Material & Shader:**
- Coins: Metallic bronze with PBR (roughness 0.4, metalness 0.9). One side inscribed with Chinese characters (value 3), the other plain (value 2)
- Dish: Bone (`#F5F0E8`) stone with visible grain texture
- Pedestal: Deep Ink (`#1A1A2E`) basalt with subtle Terracotta veining

**Interaction Mechanic:**
- **Pick Up:** User raycasts onto a coin and holds click. The coin attaches to the cursor via a Rapier `SpringJoint` (stiffness 50, damping 5)
- **Toss:** User releases click with cursor velocity. Rapier `RigidBody` (type: Dynamic, mass: 0.05kg) handles the physics simulation. The coin tumbles, bounces off the dish, and settles
- **Read:** After settling (`angularVelocity < 0.01`), the system reads the coin's Y-axis rotation to determine heads (Yang line) or tails (Yin line)
- **Repeat:** Six tosses build the hexagram. After each toss, a horizontal line (solid or broken) materializes above the dish, stacking upward
- **Changing Lines:** If all three coins land the same face, the line is marked as "changing" (pulsing Terracotta glow)

**Backend Trigger:**
```typescript
const onHexagramComplete = async (lines: IChing Line[]) => {
  const response = await fetch('/api/engines/iching', {
    method: 'POST',
    body: JSON.stringify({
      lines: lines, // Array of 6 { value: 6|7|8|9, changing: boolean }
      question: currentIntention, // User's stated question
      method: 'three_coin'
    })
  });
  return response.json() as IChingReading;
};
```

**Output Display:** The completed hexagram floats above the dish as six horizontal bars of light (Aged Gold for solid Yang lines, gaps for broken Yin lines). The hexagram name and number appear in both Chinese and English. The reading text projects outward from the hexagram as a radial text display, readable by orbiting around the artifact.

---

### 3.3 Engine 03: Tarot Arcana

**3D Visual Form:** 78 semi-transparent cards suspended in a slow-rotating spiral helix. The Major Arcana (22 cards) form the inner spiral; the Minor Arcana (56 cards) form the outer spiral. A veil of SparkJS Gaussian Splats (Deep Ink, low opacity) obscures the cards until the user reaches through.

**Material & Shader:**
- Card faces: Custom `ShaderMaterial` with animated imagery (procedural tarot art rendered as textures)
- Card backs: Aged Gold (`#B8860B`) with sacred geometry mandala pattern
- Veil: SparkJS dynamic splat cloud (color: Deep Ink `#1A1A2E`, opacity 0.3, turbulence 0.8)
- Selected card: Bloom intensity increases to 1.2, card scales to 3x

**Interaction Mechanic:**
- **Approach (< 5 units):** The spiral slows its rotation. The veil thickens as if resisting
- **Reach Through (Hand tracking via MediaPipe or cursor penetration past veil boundary):** The user's cursor/hand passes through the splat veil. Splats part around the intrusion point
- **Draw (Click on card):** The selected card detaches from the spiral, flips face-up, and floats toward the user. A `TweenAnimation` scales it to 3x over 800ms
- **Spread:** Drawing multiple cards auto-arranges them into a Celtic Cross or Three-Card spread layout, floating at waist height

**Backend Trigger:**
```typescript
const onCardDraw = async (cardId: number, spreadPosition: number) => {
  const response = await fetch('/api/engines/tarot', {
    method: 'POST',
    body: JSON.stringify({
      card_id: cardId,         // 0-77
      reversed: Math.random() > 0.5, // Determined by card's Z-rotation at draw
      spread_type: currentSpread,     // 'single', 'three_card', 'celtic_cross'
      position_in_spread: spreadPosition,
      natal_context: userNatalData    // Optional astrological context
    })
  });
  return response.json() as TarotReading;
};
```

**Output Display:** The drawn card expands to fill a 2x3 unit plane. Its imagery animates subtly (particles drift, colors shift). The interpretation text appears as 3D typography floating beside the card, with keywords highlighted in Aged Gold and shadow aspects in Terracotta.

---

### 3.4 Engine 04: Rune Stones

**3D Visual Form:** A leather pouch sitting on a flat granite slab. Inside the pouch: 24 Elder Futhark rune stones (plus one blank stone). Each stone is a small, irregular pebble with a carved rune glyph.

**Material & Shader:**
- Stones: Bone (`#F5F0E8`) with roughness 0.8, subtle normal-map surface irregularity
- Carved rune glyphs: Inset channels filled with Aged Gold (`#B8860B`) emissive material
- Pouch: Dark leather texture (Deep Ink tinted brown)
- Granite slab: Stone Grey (`#6B6B6B`) with quartz flecks (point lights, intensity 0.1)

**Interaction Mechanic:**
- **Open Pouch:** Click on pouch toggles it open. Stones become visible inside
- **Draw Blind:** User reaches into the pouch (cursor enters pouch bounds) and clicks to grab a random stone. The selection is physics-seeded: the stone nearest to the cursor's entry vector is chosen
- **Cast:** For a multi-rune reading, user draws 3-5 stones, then "casts" them onto the granite slab (release with velocity). Rapier simulates their scatter pattern
- **Spatial Reading:** The interpretation accounts for stone positions relative to each other (proximity = relationship, orientation = emphasis)

**Backend Trigger:**
```typescript
const onRuneCast = async (stones: RuneStone[]) => {
  const response = await fetch('/api/engines/runes', {
    method: 'POST',
    body: JSON.stringify({
      runes: stones.map(s => ({
        glyph: s.glyphId,        // 0-24 (Fehu through Othala + Blank)
        position: s.worldPosition, // {x, y, z}
        rotation: s.rotation,      // Upright vs. reversed (merkstave)
        proximity_to: s.nearestNeighborId
      })),
      cast_type: 'three_norn'     // or 'single', 'five_element', 'nine_grid'
    })
  });
  return response.json() as RuneReading;
};
```

**Output Display:** Each cast stone emits a vertical beam of Aged Gold light. The rune name (Elder Futhark + English) and its meaning appear as floating text above each stone. Relationship lines (thin gold filaments) connect stones that share thematic resonance.

---

### 3.5 Engine 05: Numerology Matrix

**3D Visual Form:** A floating grid of luminous numbers arranged in a 9x9 matrix. The grid resembles a Lo Shu magic square expanded to encompass Pythagorean numerological dimensions. Numbers pulse with varying intensities based on their frequency in the user's chart.

**Material & Shader:**
- Number glyphs: Emissive `ShaderMaterial`, color interpolating between Stone Grey (inactive) and Aged Gold (active)
- Grid lines: Bone (`#F5F0E8`) at 20% opacity, width 0.5px
- Active number cells: Bloom halo (Aged Gold), intensity proportional to frequency count
- Background plane: Deep Ink (`#1A1A2E`) with subtle noise displacement

**Interaction Mechanic:**
- **Input:** The Numerology Matrix requires birth date and full name. These are entered via a floating 3D text input (React overlay with transparent background, positioned at the artifact's location)
- **Calculation Animation:** Once submitted, numbers cascade across the grid in a waterfall animation (top to bottom, 50ms stagger per row). The user's Life Path, Expression, and Soul Urge numbers "lock in" with a percussive audio cue
- **Explore:** Tapping any active number cell expands it into a detailed breakdown panel

**Backend Trigger:**
```python
# FastAPI endpoint
@router.post("/api/engines/numerology")
async def calculate_numerology(request: NumerologyRequest):
    chart = NumerologyEngine.compute(
        birth_date=request.birth_date,
        full_name=request.full_name,
        system="pythagorean"  # or "chaldean"
    )
    return {
        "life_path": chart.life_path,
        "expression": chart.expression,
        "soul_urge": chart.soul_urge,
        "personality": chart.personality,
        "maturity": chart.maturity,
        "personal_year": chart.personal_year,
        "pinnacles": chart.pinnacles,
        "challenges": chart.challenges,
        "grid": chart.intensity_matrix  # 9x9 frequency grid
    }
```

**Output Display:** The 9x9 grid reorganizes into a radial mandala with the Life Path number at center. Each numerological dimension orbits at a different radius. Touching any orbiting number reveals its interpretation as projected text.

---

### 3.6 Engine 06: Biorhythm Compass

**3D Visual Form:** A nautical compass rose, but instead of cardinal directions, the three arms represent Physical (red/Terracotta), Emotional (gold/Aged Gold), and Intellectual (bone/Bone) cycles. The arms rotate independently at their respective cycle frequencies (23, 28, 33 days). A central needle points to the current day's composite state.

**Material & Shader:**
- Compass body: Polished Deep Ink (`#1A1A2E`) with metallic sheen (metalness 0.7)
- Physical arm: Terracotta (`#C65D3B`) with glow intensity mapped to cycle amplitude
- Emotional arm: Aged Gold (`#B8860B`)
- Intellectual arm: Bone (`#F5F0E8`)
- Central needle: Chrome (reflective, environment-mapped)

**Interaction Mechanic:**
- **Live Mode:** Requires PIP bio-data connection (Doc 02, Section 3). The compass arms auto-sync to the user's actual biorhythmic cycle positions
- **Scrub (Click + Drag on rim):** User rotates the compass to view past or future cycle positions. A date readout floats above
- **Critical Days:** When any cycle crosses zero (critical day), that arm flashes Terracotta and emits a low-frequency audio tone

**Backend Trigger:**
```typescript
const onBiorhythmQuery = async (targetDate: Date) => {
  const response = await fetch('/api/engines/biorhythm', {
    method: 'POST',
    body: JSON.stringify({
      birth_date: userProfile.birthDate,
      target_date: targetDate.toISOString(),
      pip_metrics: currentPIPState // Real-time bio overlay
    })
  });
  return response.json() as BiorhythmReading;
};
```

**Output Display:** Three sine waves project outward from the compass as 3D ribbon geometry, showing 30 days of cycle data. The current day is marked with a vertical Aged Gold line. Critical and peak days are annotated.

---

### 3.7 Engine 07: Gene Keys Helix

**3D Visual Form:** A DNA-like double helix structure made of light, approximately 8 units tall. 64 nodes are distributed along the helix, each representing one Gene Key. The helix rotates slowly on its vertical axis. Nodes are color-coded by their activation state in the user's profile.

**Material & Shader:**
- Helix strands: Bone (`#F5F0E8`) translucent tubes with internal Fresnel glow
- Inactive nodes: Stone Grey (`#6B6B6B`), small spheres (radius 0.1)
- User-activated nodes: Aged Gold (`#B8860B`), larger spheres (radius 0.2) with bloom
- Shadow state: Deep Ink (`#1A1A2E`) inner glow
- Gift state: Aged Gold (`#B8860B`) mid glow
- Siddhi state: Bone White (`#F5F0E8`) outer radiance with particle emission

**Interaction Mechanic:**
- **Birth Data Highlight:** On first load, the user's specific Gene Key activations (derived from birth data via Human Design gate mapping) illuminate along the helix. Activated nodes swell and pulse
- **Touch a Node (Raycast + Click):** The node detaches from the helix and floats to eye level. It unfolds into three concentric rings showing Shadow (inner, Deep Ink) -> Gift (middle, Gold) -> Siddhi (outer, Bone White)
- **Progression Animation:** As the user engages with the Gene Key over time, the node visually transitions from Shadow coloring toward Siddhi radiance

**Backend Trigger:**
```typescript
const onGeneKeySelect = async (keyNumber: number) => {
  const response = await fetch('/api/engines/genekeys', {
    method: 'POST',
    body: JSON.stringify({
      key_number: keyNumber,   // 1-64
      birth_data: userProfile.birthData,
      activation_type: 'conscious' // or 'unconscious', 'transit'
    })
  });
  return response.json() as GeneKeyReading;
};
```

**Output Display:** The Shadow-Gift-Siddhi progression text projects as three columns of 3D typography, color-coded to their respective states. The current "frequency band" (Shadow, Gift, or Siddhi) is highlighted based on the user's engagement history and bio-coherence level.

---

### 3.8 Engine 08: Human Design Bodygraph

**3D Visual Form:** A constellation map floating vertically, approximately 4 units tall. Nine geometric centers (Head, Ajna, Throat, G, Heart, Sacral, Solar Plexus, Spleen, Root) are rendered as polyhedra connected by 36 channel lines. The entire structure resembles a star map more than a body diagram.

**Material & Shader:**
- Defined Centers: Aged Gold (`#B8860B`), filled polyhedra with internal glow
- Undefined Centers: Bone (`#F5F0E8`), wireframe polyhedra (transparent)
- Open Centers: Stone Grey (`#6B6B6B`), barely visible wireframe
- Active Channels: Aged Gold lines connecting defined centers (width 0.05, emissive)
- Dormant Channels: Deep Ink (`#1A1A2E`) hairlines

**Interaction Mechanic:**
- **Ambient Audio:** The user's Strategy and Authority are communicated not through text but through **ambient sound design**. A Generator type hears a deep, rhythmic hum (sacral response). A Projector hears a high-pitched crystalline tone (invitation frequency). A Manifestor hears a percussive beat (initiation pulse)
- **Center Inspection:** Clicking a center causes it to expand, revealing its gates (numbered 1-64, corresponding to Gene Keys). This creates a direct cross-reference with Engine 07
- **Channel Tracing:** Hovering over a channel highlights both connected centers and displays the channel's theme as floating text

**Backend Trigger:**
```typescript
const onBodygraphLoad = async () => {
  const response = await fetch('/api/engines/humandesign', {
    method: 'POST',
    body: JSON.stringify({
      birth_datetime: userProfile.birthData.datetime,
      birth_location: userProfile.birthData.location,
      include_transit: true // Overlay current planetary positions
    })
  });
  return response.json() as HumanDesignChart;
};
```

**Output Display:** The full chart persists as a floating constellation. Type, Strategy, Authority, and Profile are displayed as ambient text orbiting the bodygraph slowly. Defined gates glow along their respective channels. The user's "Not-Self" theme appears as a subtle Terracotta warning glow on undefined centers when coherence drops below 40.

---

### 3.9 Engine 09: Chronobiology Clock

**3D Visual Form:** A 24-hour clock face oriented horizontally (like a sundial), with concentric rings representing Circadian, Ultradian (90-minute), and Infradian (monthly) rhythms. The current time is marked by a vertical beam of light that sweeps around the clock face in real-time.

**Material & Shader:**
- Clock face: Polished Bone (`#F5F0E8`) stone with hour markers in Aged Gold
- Circadian ring (outermost): Gradient from Deep Ink (night hours) to Bone (day hours)
- Ultradian ring (middle): 16 segments alternating Stone Grey and Aged Gold (90-min cycles)
- Infradian ring (innermost): Monthly phase using the Terracotta-to-Gold gradient
- Time beam: Vertical Aged Gold light column with soft bloom

**Interaction Mechanic:**
- **Live Sync:** Requires PIP connection. The clock auto-synchronizes to the user's detected circadian phase (based on bio-metrics and local time)
- **Optimal Windows:** Periods of peak performance (physical, cognitive, creative) are highlighted as arcs of Aged Gold. The user can see when their body is optimized for specific activities
- **Rotate (Drag):** Scrubbing the clock forward/backward shows predicted optimal windows for coming days

**Backend Trigger:**
```typescript
const onChronobiologyQuery = async () => {
  const response = await fetch('/api/engines/chronobiology', {
    method: 'POST',
    body: JSON.stringify({
      current_time: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pip_metrics: currentPIPState,
      biorhythm_phase: currentBiorhythmState,
      sleep_data: userProfile.sleepPattern // Optional
    })
  });
  return response.json() as ChronobiologyReading;
};
```

**Output Display:** Optimal activity windows project upward from the clock face as 3D bar charts (height = intensity). Labels ("Deep Work," "Creative Flow," "Rest," "Physical Peak") float above their respective windows.

---

### 3.10 Engine 10: Decision Mirror

**3D Visual Form:** A polished obsidian mirror, 3 units wide and 4 units tall, floating vertically. The surface is not reflective in the traditional sense--it does not show the user's face. Instead, it shows **the convergence of all active engine readings** as overlapping data projections on a dark surface.

**Material & Shader:**
- Mirror surface: Deep Ink (`#1A1A2E`) with extreme metalness (0.95) and low roughness (0.1)
- Frame: Aged Gold (`#B8860B`) ornamental border with etched decision-tree iconography
- Active data streams: Each contributing engine projects its color signature onto the mirror surface
- Convergence point: Where multiple engine readings align, a bright Bone White (`#F5F0E8`) glow appears

**Interaction Mechanic:**
- **State a Decision:** The user speaks or types a decision they face. This is the "question" that all active engines are asked to reflect on
- **Convergence View:** The mirror surface displays each active engine's response as a colored data layer. Where layers overlap (agreement across systems), the surface brightens
- **Drag to Compare:** The user can pull individual engine layers off the mirror to compare them side by side
- **The Mirror Principle:** The mirror does not tell you what to decide. It shows you where your own data converges. "Dependency is Failure"--the mirror teaches you to read your own patterns

**Backend Trigger:**
```typescript
const onDecisionMirrorActivate = async (decision: string) => {
  const response = await fetch('/api/engines/decision-mirror', {
    method: 'POST',
    body: JSON.stringify({
      decision_text: decision,
      active_engines: getActiveEngineStates(), // All Tier 1+2 readings
      bio_state: currentPIPState,
      natal_data: userProfile.birthData
    })
  });
  return response.json() as DecisionMirrorReading;
};
```

**Output Display:** The mirror surface becomes a data visualization canvas. Each engine's input appears as a distinct layer (color-coded per engine). Convergence zones glow brightest. The system generates a "Convergence Score" (0-100) displayed as a percentage in the mirror's upper corner. No recommendation is given--only pattern visibility.

---

### 3.11 Engine 11: Transit Overlay

**3D Visual Form:** A transparent celestial sphere (approximately 5 units diameter) with the user's natal chart as a fixed inner ring and current planetary transits as a slowly rotating outer ring. The sphere is rendered as a wireframe geodesic with planetary glyphs positioned at their ecliptic longitudes.

**Material & Shader:**
- Natal ring: Aged Gold (`#B8860B`) with fixed planetary positions
- Transit ring: Bone (`#F5F0E8`) with slowly orbiting planetary markers
- Aspect lines (conjunctions, oppositions, trines, squares): Color-coded filaments (Gold = harmonious, Terracotta = challenging, Stone Grey = neutral)
- Sphere wireframe: Deep Ink (`#1A1A2E`) at 15% opacity

**Interaction Mechanic:**
- **Time Scrub:** User grabs the outer transit ring and rotates it to view past/future transits. Date readout updates in real-time
- **Aspect Highlight:** When a transit planet forms an exact aspect to a natal planet, both planets pulse and a connecting line appears with aspect information
- **Cross-Reference:** Tapping a transit aspect auto-scrolls the Vimshottari Clock (Engine 01) to the corresponding period

**Backend Trigger:**
```typescript
const onTransitQuery = async (targetDate: Date) => {
  const response = await fetch('/api/engines/transits', {
    method: 'POST',
    body: JSON.stringify({
      natal_data: userProfile.birthData,
      target_date: targetDate.toISOString(),
      systems: ['vedic', 'western'], // Dual system support
      orb_degrees: 3 // Aspect orb tolerance
    })
  });
  return response.json() as TransitReading;
};
```

**Output Display:** Active aspects project outward from the celestial sphere as 3D text cards. Each card shows the transit (e.g., "Saturn conjunct natal Moon"), its duration, and its thematic meaning. Cards are sorted by exactitude (tightest orb first).

---

### 3.12 Engine 12: Somatic Canticle Index

**3D Visual Form:** A vertical scroll or codex, approximately 3 units tall, made of translucent parchment. The scroll contains chapter markers that are either illuminated (unlocked) or dark (locked). The scroll breathes--it expands and contracts in sync with the user's PIP breath data (per Doc 02, Section 3).

**Material & Shader:**
- Parchment: Bone (`#F5F0E8`) with aged texture, slight translucency (opacity 0.85)
- Unlocked chapters: Aged Gold (`#B8860B`) illuminated text
- Locked chapters: Deep Ink (`#1A1A2E`) text, barely visible
- Chapter currently available (bio-ready): Terracotta (`#C65D3B`) pulsing border
- Scroll edges: Stone Grey (`#6B6B6B`) metallic caps

**Interaction Mechanic:**
- **Bio-Gating:** Chapters only unlock when the user's bio-state matches the chapter's requirements. A meditation chapter requires Coherence > 70. An intensity chapter requires Heart Rate Variability in a specific range
- **Read (Touch unlocked chapter):** The chapter unfurls from the scroll and projects its content into the 3D space as a floating manuscript page
- **The Somatic Check:** Before content displays, the system performs a 5-second breath coherence check (Doc 02, Section 4.2). If the user is dysregulated, the content gently folds back into the scroll with a message: "The body is not ready. Return to the Breathfield."

**Backend Trigger:**
```typescript
const onCanticleRequest = async (chapterId: string) => {
  const response = await fetch('/api/engines/somatic-canticle', {
    method: 'POST',
    body: JSON.stringify({
      chapter_id: chapterId,
      bio_state: currentPIPState,
      coherence_history: last5MinCoherenceAvg,
      reading_history: userProfile.canticleProgress
    })
  });
  return response.json() as CanticleReading;
};
```

**Output Display:** The canticle text renders as 3D typography on translucent parchment planes, floating at reading distance. Text appears word by word, paced to the user's breath rate. The content is not consumed--it is *breathed*.

---

### 3.13 Engine 13: The Cartographer's Compass

**3D Visual Form:** A slowly orbiting golden astrolabe-compass hybrid that circles the entire East Wing constellation. It is smaller than the other engines (approximately 1 unit diameter) but always visible, tracing a path around the periphery of all 12 engines. Its internal mechanisms visually represent the state of all other engines.

**Material & Shader:**
- Body: Aged Gold (`#B8860B`) with intricate mechanical detailing (gears, dials)
- Dial faces (12): Each represents one engine. Lit = consulted, dark = unconsulted
- Luminosity: The Compass glows brighter as more engines are engaged (emissive intensity = `activeEngineCount / 12`)
- Trail: Leaves a fading particle trail (Bone `#F5F0E8`) as it orbits

**Interaction Mechanic:**
- **Passive Presence:** The Compass orbits automatically. It cannot be summoned--it arrives when the user has engaged 7 or more engines (Section 6)
- **Intercept (Move into its orbital path):** When the user's Vessel intersects the Compass's orbit, it pauses and turns to face the user
- **The Meta-Reading:** Clicking the paused Compass triggers the meta-pattern analysis. It reads coherence *across* all active engine readings, looking for convergent themes, contradictions, and emergent patterns
- **The Cartographer's Voice:** The output is delivered in "Cartographer mode"--a distinct narrative voice that speaks as the field cartographer, the witness who walked the terrain before drawing the map

**Backend Trigger:**
```typescript
const onCompassActivate = async () => {
  const response = await fetch('/api/engines/cartographer-compass', {
    method: 'POST',
    body: JSON.stringify({
      active_readings: getAllActiveReadings(), // All Tier 1+2+3 readings
      session_history: currentSessionReadings,
      coherence_score: currentPIPState.coherence,
      engagement_depth: calculateEngagementDepth()
    })
  });
  return response.json() as CartographerReading;
};
```

**Output Display:** The Compass unfolds into a flat map--a 2D projection that hovers in 3D space, showing all 12 engines as nodes with connecting lines weighted by thematic coherence. The Cartographer's narrative appears as scrolling text along the map's edges, written in the field cartographer's voice.

---

## 4. Spatial Placement: The East Wing Constellation

The 13 engines are arranged in 3D space within the East Wing (centered at `(50, 0, 0)` per Doc 01, Section 4.2) as three concentric rings.

### 4.1 Ring Layout

```
                    Outer Ring (Tier 3: Synthesis)
                    Radius: 15 units from center
                    Y-offset: +2 (elevated)

              Middle Ring (Tier 2: Biological)
              Radius: 10 units from center
              Y-offset: 0 (eye level)

        Inner Ring (Tier 1: Ancient)
        Radius: 5 units from center
        Y-offset: -1 (slightly below eye level)

        The Cartographer's Compass orbits ALL rings
        Orbital radius: 17 units, Y-oscillation: +/- 3
```

### 4.2 Precise Coordinates (Relative to East Wing Center at 50, 0, 0)

| Engine | Tier | Ring | Angle | Position (x, y, z) relative to (50,0,0) |
|--------|------|------|-------|------------------------------------------|
| 01 Vimshottari | T1 | Inner | 0deg | (5, -1, 0) |
| 02 I-Ching | T1 | Inner | 72deg | (1.55, -1, 4.76) |
| 03 Tarot | T1 | Inner | 144deg | (-4.05, -1, 2.94) |
| 04 Runes | T1 | Inner | 216deg | (-4.05, -1, -2.94) |
| 05 Numerology | T1 | Inner | 288deg | (1.55, -1, -4.76) |
| 06 Biorhythm | T2 | Middle | 0deg | (10, 0, 0) |
| 07 Gene Keys | T2 | Middle | 90deg | (0, 0, 10) |
| 08 Human Design | T2 | Middle | 180deg | (-10, 0, 0) |
| 09 Chronobiology | T2 | Middle | 270deg | (0, 0, -10) |
| 10 Decision Mirror | T3 | Outer | 0deg | (15, 2, 0) |
| 11 Transit Overlay | T3 | Outer | 120deg | (-7.5, 2, 12.99) |
| 12 Somatic Index | T3 | Outer | 240deg | (-7.5, 2, -12.99) |
| 13 Compass | -- | Orbit | Varies | Orbiting at r=17, period=120s |

### 4.3 The Gravity Well System

Each engine exerts a subtle attractive force on the user's Vessel (Crystalline Ship, per Doc 02). This is implemented as a radial force field in Rapier physics.

```typescript
// Gravity well for each engine artifact
const GRAVITY_WELL_CONFIG = {
  innerRadius: 2.0,    // Full attraction zone
  outerRadius: 8.0,    // Attraction falloff begins
  maxForce: 0.5,       // Newtons (gentle pull, not a trap)
  falloffCurve: 'inverse_square',
  activeOnly: true     // Only pulls if engine is unlocked
};

// Applied per-frame in the physics loop
engines.forEach(engine => {
  if (!engine.unlocked) return;
  const distance = vessel.position.distanceTo(engine.position);
  if (distance < GRAVITY_WELL_CONFIG.outerRadius) {
    const force = calculateGravityForce(distance, GRAVITY_WELL_CONFIG);
    vessel.rigidBody.applyForce(
      engine.position.clone().sub(vessel.position).normalize().multiplyScalar(force)
    );
  }
});
```

### 4.4 Inter-Engine Visual Connections

When two or more engines have been consulted in the same session, thin filament lines connect them. These filaments are rendered as `LineGeometry` with a custom shader:

- **Color:** Aged Gold (`#B8860B`) at 30% opacity
- **Width:** 0.02 units (hairline)
- **Animation:** A slow pulse travels along the filament from one engine to the other (1 cycle per 4 seconds)
- **Brightness:** Increases with the number of cross-references between the two engines' readings

---

## 5. Latent Space Retrieval: From Touch to Truth

This section specifies the complete data pipeline from the moment a user's cursor contacts an engine artifact to the moment the reading appears in 3D space.

### 5.1 The Interaction Pipeline

```
Phase 1: CONTACT
  User Vessel raycast hits Engine collider
    -> Three.js `onPointerEnter` event
    -> React state: setHoveredEngine(engineId)
    -> Visual: Engine scales up 1.1x (TweenAnimation, 300ms)

Phase 2: ENGAGEMENT
  User clicks / performs interaction mechanic
    -> Three.js `onPointerDown` + mechanic-specific logic
    -> React state: setActiveEngine(engineId)
    -> Engine-specific interaction (coin toss, card draw, etc.)

Phase 3: QUERY
  Interaction mechanic completes (coins settle, card drawn, etc.)
    -> React dispatches API call to FastAPI backend
    -> Loading state: Engine artifact emits particle burst (anticipation)
    -> Python engine processes divination logic

Phase 4: RESPONSE
  FastAPI returns structured JSON
    -> React state: setEngineReading(engineId, reading)
    -> Three.js renders reading as 3D text/particle overlay
    -> Audio cue: Low resonant tone (completion)

Phase 5: PERSISTENCE
  Reading stored in user's Field Journal
    -> POST /api/field-journal/entries
    -> Cross-reference with other active readings
    -> Update Cartographer's Compass state
```

### 5.2 The FastAPI Engine Router

```python
# engines/router.py
from fastapi import APIRouter, Depends
from .vimshottari import VimshottariEngine
from .iching import IChingEngine
from .tarot import TarotEngine
from .runes import RuneEngine
from .numerology import NumerologyEngine
from .biorhythm import BiorhythmEngine
from .genekeys import GeneKeysEngine
from .humandesign import HumanDesignEngine
from .chronobiology import ChronobiologyEngine
from .decision_mirror import DecisionMirrorEngine
from .transits import TransitEngine
from .somatic_canticle import SomaticCanticleEngine
from .cartographer import CartographerEngine

router = APIRouter(prefix="/api/engines")

ENGINE_REGISTRY = {
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

@router.post("/{engine_id}")
async def query_engine(engine_id: str, request: EngineRequest):
    engine_class = ENGINE_REGISTRY.get(engine_id)
    if not engine_class:
        raise HTTPException(404, f"Engine '{engine_id}' not found")
    engine = engine_class()
    reading = await engine.process(request)
    return reading.to_response()
```

### 5.3 The 3D Text Rendering System

All engine readings are displayed as 3D typography in the world space. The rendering uses a shared system:

```typescript
interface ReadingDisplay {
  position: THREE.Vector3;      // Near the engine artifact
  orientation: 'face_user';     // Always billboard toward Vessel
  font: 'Inter';                // Clean, legible sans-serif
  primaryColor: '#F5F0E8';      // Bone for body text
  accentColor: '#B8860B';       // Aged Gold for keywords
  warningColor: '#C65D3B';      // Terracotta for shadow/warning
  fadeDistance: 15;              // Text fades beyond 15 units
  animationStyle: 'typewriter'; // Characters appear sequentially
  typingSpeed: 40;              // ms per character
}
```

---

## 6. Unlock & Progression Logic

Not all 13 engines are available from the first session. The unlock system follows the NOESIS principle: **the system teaches by revealing, not by restricting**. Locked engines are not hidden--they are visible but inert, their forms dimmed to Stone Grey, waiting for the conditions that awaken them.

### 6.1 Tier 1 Unlock Rules

| Engine | Available At | Unlock Condition |
|--------|-------------|------------------|
| 01 Vimshottari | Session 1 | Birth data entered |
| 02 I-Ching | Session 1 | None (always available) |
| 03 Tarot | Session 1 | None (always available) |
| 04 Runes | Session 1 | None (always available) |
| 05 Numerology | Session 2+ | Complete at least one reading from any Tier 1 engine |

### 6.2 Tier 2 Unlock Rules

| Engine | Unlock Condition |
|--------|------------------|
| 06 Biorhythm | PIP bio-data connection active (webcam enabled) |
| 07 Gene Keys | Birth data entered + one Tier 1 reading completed |
| 08 Human Design | Birth data entered (precise time required) |
| 09 Chronobiology | PIP active + 3 sessions with bio-data (system needs baseline) |

### 6.3 Tier 3 Unlock Rules

| Engine | Unlock Condition |
|--------|------------------|
| 10 Decision Mirror | 3+ unique engine readings in the current session |
| 11 Transit Overlay | Vimshottari (Engine 01) consulted + birth data precise |
| 12 Somatic Index | 5+ total readings across sessions + PIP Coherence > 60 (once) |
| 13 Cartographer's Compass | 7+ unique engines consulted across all sessions |

### 6.4 The Unlock Animation

When an engine unlocks, the following sequence plays:

1. The artifact's material transitions from Stone Grey to its proper color palette (2-second lerp)
2. A ring of Aged Gold particles expands outward from the artifact (burst, 500ms)
3. The artifact's gravity well activates (subtle pull on the Vessel)
4. A resonant audio tone plays (unique per engine, tuned to its thematic frequency)
5. The Cartographer's Compass (if active) briefly redirects its orbit to pass near the newly unlocked engine

---

## 7. JSON Schema: Engine State

This JSON structure defines the state of a single engine instance within a user session.

### 7.1 Individual Engine State

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EngineState",
  "type": "object",
  "properties": {
    "engine_id": {
      "type": "string",
      "enum": [
        "vimshottari", "iching", "tarot", "runes", "numerology",
        "biorhythm", "genekeys", "humandesign", "chronobiology",
        "decision-mirror", "transits", "somatic-canticle",
        "cartographer-compass"
      ]
    },
    "tier": {
      "type": "integer",
      "enum": [1, 2, 3]
    },
    "status": {
      "type": "string",
      "enum": ["locked", "unlocked", "active", "completed"]
    },
    "position": {
      "type": "object",
      "properties": {
        "x": { "type": "number" },
        "y": { "type": "number" },
        "z": { "type": "number" }
      }
    },
    "visual_state": {
      "type": "object",
      "properties": {
        "primary_color": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "emissive_intensity": { "type": "number", "minimum": 0, "maximum": 2 },
        "scale_multiplier": { "type": "number", "default": 1.0 },
        "bloom_enabled": { "type": "boolean" }
      }
    },
    "interaction_state": {
      "type": "object",
      "properties": {
        "hovered": { "type": "boolean" },
        "engaged": { "type": "boolean" },
        "reading_in_progress": { "type": "boolean" },
        "last_interaction_timestamp": { "type": "number" }
      }
    },
    "current_reading": {
      "type": ["object", "null"],
      "properties": {
        "reading_id": { "type": "string" },
        "timestamp": { "type": "number" },
        "input_data": { "type": "object" },
        "output_data": { "type": "object" },
        "display_config": {
          "type": "object",
          "properties": {
            "text_content": { "type": "string" },
            "highlight_keywords": { "type": "array", "items": { "type": "string" } },
            "visual_artifacts": { "type": "array" }
          }
        }
      }
    },
    "history": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "reading_id": { "type": "string" },
          "timestamp": { "type": "number" },
          "summary": { "type": "string" }
        }
      }
    },
    "gravity_well": {
      "type": "object",
      "properties": {
        "active": { "type": "boolean" },
        "inner_radius": { "type": "number", "default": 2.0 },
        "outer_radius": { "type": "number", "default": 8.0 },
        "force": { "type": "number", "default": 0.5 }
      }
    }
  },
  "required": ["engine_id", "tier", "status", "position"]
}
```

### 7.2 Full Constellation State

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConstellationState",
  "type": "object",
  "properties": {
    "session_id": { "type": "string" },
    "user_id": { "type": "string" },
    "timestamp": { "type": "number" },
    "east_wing_center": {
      "type": "object",
      "properties": {
        "x": { "type": "number", "default": 50 },
        "y": { "type": "number", "default": 0 },
        "z": { "type": "number", "default": 0 }
      }
    },
    "engines": {
      "type": "array",
      "items": { "$ref": "#/definitions/EngineState" },
      "minItems": 13,
      "maxItems": 13
    },
    "filament_connections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from_engine": { "type": "string" },
          "to_engine": { "type": "string" },
          "strength": { "type": "number", "minimum": 0, "maximum": 1 },
          "cross_references": { "type": "integer" }
        }
      }
    },
    "compass_orbital_phase": {
      "type": "number",
      "description": "Current angle of the Cartographer's Compass orbit (0-360)"
    },
    "total_unique_engines_consulted": {
      "type": "integer",
      "minimum": 0,
      "maximum": 13
    }
  }
}
```

---

## 8. Development Roadmap: From Single Artifact to Full Constellation

### Phase 1: The First Stone (Weeks 1-3)

**Goal:** One engine, fully functional, end-to-end.

- **Target Engine:** I-Ching Oracle (Engine 02). Chosen because it has the most satisfying physics interaction (coin toss) and the simplest backend (no birth data required)
- **Deliverables:**
  - Three.js scene with stone dish, pedestal, and 3 coin RigidBodies
  - Rapier physics integration: pick up, throw, settle, read
  - FastAPI endpoint for hexagram interpretation
  - 3D text rendering of hexagram result
  - Field Journal persistence (database write)
- **Success Metric:** A user can toss three coins six times and receive a complete I-Ching reading rendered in 3D space

### Phase 2: The Inner Ring (Weeks 4-7)

**Goal:** All five Tier 1 engines operational.

- **Deliverables:**
  - Vimshottari Clock with concentric ring interaction
  - Tarot spiral with veil mechanic and card draw
  - Rune Stones with pouch draw and spatial casting
  - Numerology Matrix with input form and grid display
  - Tier 1 spatial placement (inner ring at r=5)
  - Inter-engine filament connections
  - Unlock logic for Numerology (requires first reading)
- **Success Metric:** User can consult all 5 Tier 1 engines and see filament connections form between consulted engines

### Phase 3: The Biological Ring (Weeks 8-11)

**Goal:** Tier 2 engines connected to PIP bio-data pipeline.

- **Deliverables:**
  - Biorhythm Compass with PIP sync
  - Gene Keys Helix with Shadow-Gift-Siddhi interaction
  - Human Design Bodygraph with ambient audio for Strategy/Authority
  - Chronobiology Clock with circadian detection
  - Tier 2 spatial placement (middle ring at r=10)
  - Bio-data gating logic (engines require webcam/PIP active)
- **Success Metric:** Tier 2 engines respond to the user's live bio-state. The Gene Keys Helix highlights activations based on birth data. The Biorhythm Compass syncs to PIP breath metrics

### Phase 4: The Synthesis Layer (Weeks 12-15)

**Goal:** Tier 3 engines synthesizing cross-engine data.

- **Deliverables:**
  - Decision Mirror with multi-engine convergence display
  - Transit Overlay with natal/transit celestial sphere
  - Somatic Canticle Index with bio-gated content release
  - Tier 3 spatial placement (outer ring at r=15)
  - Cross-tier unlock progression
- **Success Metric:** The Decision Mirror shows convergent patterns from 3+ active engines. The Somatic Index gates content based on real-time coherence

### Phase 5: The Cartographer Arrives (Weeks 16-18)

**Goal:** The meta-engine and full constellation polish.

- **Deliverables:**
  - Cartographer's Compass with orbital path and meta-reading
  - Full 13-engine constellation with all filament connections
  - Gravity well system tuning
  - Unlock animation sequence for all engines
  - Performance optimization (LOD, culling, instancing for 13 simultaneous artifacts)
  - Complete Field Journal integration with reading history
- **Success Metric:** A user who has engaged 7+ engines sees the Cartographer's Compass appear and deliver a meta-pattern reading that synthesizes all active data. The full constellation is navigable at 60fps on target hardware

### Phase 6: The Living Field (Weeks 19-22)

**Goal:** Polish, edge cases, and the philosophy made real.

- **Deliverables:**
  - Session-to-session reading persistence and progression tracking
  - Gene Key node visual progression (Shadow toward Siddhi over time)
  - Cross-session Cartographer narrative continuity
  - Audio design for all 13 engines (ambient, interaction, completion cues)
  - Accessibility considerations (screen reader descriptions for readings, keyboard navigation fallback)
  - Load testing with all 13 engines active simultaneously
- **Success Metric:** The system fulfills its core promise: "Dependency is Failure." After sufficient engagement, the user begins to recognize their own patterns without consulting the engines. The Cartographer's final reading reflects this back to them

---

## 9. Performance Considerations

### 9.1 LOD (Level of Detail) Strategy

With 13 artifacts in the East Wing, rendering all at full detail would be prohibitive. The LOD system:

| Distance from Vessel | Detail Level | Description |
|---------------------|-------------|-------------|
| 0-5 units | Full | All geometry, physics active, particles, text rendering |
| 5-15 units | Medium | Simplified geometry, no particles, no text, reduced polygon count |
| 15-30 units | Low | Billboard impostor (pre-rendered sprite from 8 angles) |
| 30+ units | Icon | Single glowing point of the engine's primary color |

### 9.2 Physics Budget

Only the nearest 3 engines have active Rapier physics simulations at any time. Distant engines use kinematic (pre-animated) motion. The gravity well system runs for all unlocked engines (lightweight radial force calculation).

### 9.3 Render Budget

- **Target:** 60fps on WebGL2 (no WebGPU requirement)
- **Triangle budget:** 50K triangles for all 13 engines combined (at medium LOD)
- **Draw calls:** Max 30 for the East Wing constellation (instanced geometry where possible)
- **Splat budget:** 5,000 total Gaussian Splats allocated to engine visual effects (shared pool)

---

## 10. Bonus Engines: Selemene-Absorbed Artifacts (Engines 14-18)

These 5 engines are absorbed from Selemene's existing calculation platform. They expand the OASIS from 13 to 18 engines, adding personality analysis, geometric visualization, biofield sensing, facial physiognomy, and sound resonance.

### 10.1 Engine 14: Enneagram Compass

**Selemene Engine ID:** `enneagram` (TypeScript)

**3D Visual Form:** A 9-pointed star (enneagram figure) rendered as a metallic artifact with interconnecting lines showing integration/disintegration paths. Each point represents a personality type and glows according to the user's type assessment. The inner triangle and hexad lines are rendered as translucent energy conduits.

**Material & Shader:**
- Star frame: Bone (`#F5F0E8`) wireframe geometry
- Active type node: Aged Gold (`#B8860B`) with bloom
- Wing nodes: Stone Grey (`#6B6B6B`) at 80% opacity, shifting toward Gold on proximity
- Growth direction line: Aged Gold, animated flow toward integration point
- Stress direction line: Terracotta (`#C65D3B`), subtle pulse

**Interaction Mechanic:**
- **Proximity (< 3 units):** Star rotates to face the user, active type node enlarges
- **Grab (any point):** Reveals type description, wing influence, instinctual stacking
- **Orbit:** User can rotate the figure to explore all 9 types and their interconnections

**Backend Trigger:**
```typescript
const onEnneagramQuery = async (birthData: UserBirthData) => {
  const response = await fetch('/api/engines/enneagram', {
    method: 'POST',
    body: JSON.stringify({
      birth_date: birthData.datetime,
      full_name: birthData.name,
    })
  });
  return response.json() as Engine3DResponse;
};
```

**Output Display:** Type description, wing, and growth/stress paths rendered as floating text particles orbiting the active node. Instinctual stack (Self-Preservation, Social, Sexual) shown as three concentric rings around the active point.

**Spatial Hints:** `{ type, wing, instinct_stack, growth_direction, stress_direction, center }`

---

### 10.2 Engine 15: Sacred Geometry Matrix

**Selemene Engine ID:** `sacred_geometry` (TypeScript)

**3D Visual Form:** A morphing geometric form that transitions between sacred patterns — Flower of Life, Metatron's Cube, Sri Yantra, Vesica Piscis. The pattern is generated procedurally using golden ratio proportions. It hovers and slowly rotates, casting light patterns through its translucent faces.

**Material & Shader:**
- Geometry edges: Aged Gold (`#B8860B`) wireframe with glow
- Faces: Deep Ink (`#1A1A2E`) at 20% opacity, refractive
- Vertices: Bone (`#F5F0E8`) point lights
- Golden ratio spiral: Terracotta (`#C65D3B`) animated trace line

**Interaction Mechanic:**
- **Proximity (< 5 units):** Pattern begins morphing toward the user's harmonic pattern
- **Grab (vertex):** Pulls the vertex, distorting the geometry — it self-corrects toward golden ratio proportions over 2 seconds
- **Breathe-Sync:** Pattern expands/contracts with breath phase. At coherence > 70, pattern stabilizes into the user's primary sacred geometry form

**Backend Trigger:**
```typescript
const onSacredGeometryQuery = async (birthData: UserBirthData) => {
  const response = await fetch('/api/engines/sacred-geometry', {
    method: 'POST',
    body: JSON.stringify({
      birth_date: birthData.datetime,
      intention: 'discover_pattern',
    })
  });
  return response.json() as Engine3DResponse;
};
```

**Output Display:** Procedural geometry rendered in real-time. Pattern name and mathematical properties shown as orbital text. Golden ratio measurements highlighted at key intersections.

**Spatial Hints:** `{ pattern_type, vertices, edges, rotation_phase, golden_ratio_points }`

**Integration:** Sacred Geometry output feeds into the Cartographer's Compass visual synthesis layer.

---

### 10.3 Engine 16: Biofield Scanner

**Selemene Engine ID:** `biofield` (Rust)

**3D Visual Form:** A translucent, layered aura visualization surrounding the user's Vessel. Multiple concentric field layers (etheric, emotional, mental, spiritual) rendered as animated shell geometries with varying opacity and color based on biofield analysis.

**Material & Shader:**
- Field layers: Custom `ShaderMaterial` with Fresnel edge glow
- Healthy zones: Aged Gold (`#B8860B`) with soft radiance
- Anomaly zones: Terracotta (`#C65D3B`) pulsing at anomaly intensity
- Coherent field: Bone (`#F5F0E8`) smooth gradient
- Incoherent field: Stone Grey (`#6B6B6B`) with noise displacement

**Interaction Mechanic:**
- **Proximity:** Biofield layers expand to become visible around the Vessel
- **Hover (raycasting on field layer):** Shows layer name, intensity, and anomaly data
- **Breathe-Sync (coherence > 60):** Field layers smooth out, colors shift toward Gold, anomaly zones shrink

**Backend Trigger:**
```typescript
const onBiofieldScan = async (pipMetrics: PIPMetrics) => {
  const response = await fetch('/api/engines/biofield', {
    method: 'POST',
    body: JSON.stringify({
      coherence: pipMetrics.coherence,
      entropy: pipMetrics.entropy,
      breath_phase: pipMetrics.breath_phase,
      lqd: pipMetrics.lqd,
    })
  });
  return response.json() as Engine3DResponse;
};
```

**Output Display:** Real-time biofield visualization overlaid on the Vessel. Field layer descriptions appear as floating text when hovered. Anomaly zones are highlighted with directional arrows suggesting somatic attention.

**Spatial Hints:** `{ field_layers: {name, intensity, color}[], anomaly_zones, coherence_map }`

**Note:** Pairs with PIP bio-feedback data. Requires active webcam for full functionality. Non-webcam users see a default "dormant field" visualization.

---

### 10.4 Engine 17: Face Reading Mirror

**Selemene Engine ID:** `face_reading` (Rust)

**3D Visual Form:** A circular mirror artifact (2 units diameter) hovering at face height. When activated, the mirror surface renders a stylized, abstract version of the user's face with regional overlays showing physiognomic readings. Not a literal mirror — an interpreted, artistic rendering.

**Material & Shader:**
- Mirror frame: Bone (`#F5F0E8`) with ornate edge geometry
- Mirror surface: Reflective `MeshPhysicalMaterial` with metalness 0.9
- Face regions: Color-coded overlays (Aged Gold for positive, Terracotta for attention areas)
- Element indicators: Five element colors mapped to face zones

**Interaction Mechanic:**
- **Proximity (< 2 units):** Mirror activates, begins analyzing MediaPipe face mesh (468 landmarks)
- **Hold still for 3 seconds:** Reading stabilizes, regional overlays appear
- **Orbit:** User can tilt the mirror to see different analysis angles

**Backend Trigger:**
```typescript
const onFaceReading = async (faceLandmarks: Float32Array) => {
  const response = await fetch('/api/engines/face-reading', {
    method: 'POST',
    body: JSON.stringify({
      landmarks_468: Array.from(faceLandmarks),
      analysis_type: 'full_physiognomy',
    })
  });
  return response.json() as Engine3DResponse;
};
```

**Output Display:** Face regions highlighted with readings. Element balance (Wood, Fire, Earth, Metal, Water) shown as a pentagonal radar chart floating beside the mirror. Regional readings appear as tooltip text when hovering over face zones.

**Spatial Hints:** `{ face_regions: {zone, reading, intensity}[], element_balance, landmarks_468 }`

**Note:** Requires MediaPipe Face Mesh (already loaded for Vessel rendering). Reuses the existing 468-landmark data from the Web Worker.

---

### 10.5 Engine 18: Nada Brahman Resonator

**Selemene Engine ID:** `nadabrahman` (Rust)

**3D Visual Form:** A resonating sound bowl artifact (1.5 units diameter) that responds to audio input and generates harmonic visualizations. Concentric ripple rings emanate from the bowl when activated. Chakra alignment indicators are arranged vertically above the bowl.

**Material & Shader:**
- Bowl geometry: Aged Gold (`#B8860B`) metallic with high reflectance
- Ripple rings: Bone (`#F5F0E8`) animated displacement rings
- Chakra indicators: 7 spheres, colored per traditional chakra mapping, brightness driven by alignment score
- Harmonic visualizations: Custom `ShaderMaterial` with audio-reactive frequency bands

**Interaction Mechanic:**
- **Strike (THROW at bowl with velocity > 5 u/s):** Bowl resonates, frequency analysis begins
- **Proximity:** Bowl hums at user's base frequency, subtle vibration animation
- **Breathe-Sync:** Sustained coherent breath (> 60, 3 cycles) triggers harmonic series visualization

**Backend Trigger:**
```typescript
const onNadaBrahmanQuery = async (birthData: UserBirthData, audioData?: AudioAnalysis) => {
  const response = await fetch('/api/engines/nadabrahman', {
    method: 'POST',
    body: JSON.stringify({
      birth_date: birthData.datetime,
      audio_frequency: audioData?.dominantFrequency,
      harmonic_profile: audioData?.harmonicSeries,
    })
  });
  return response.json() as Engine3DResponse;
};
```

**Output Display:** Frequency value and harmonic series rendered as orbital rings around the bowl. Chakra alignment shown as vertical column of 7 glowing spheres. Resonance score displayed as floating text.

**Spatial Hints:** `{ frequency_hz, harmonic_series, chakra_alignment, resonance_score }`

**Integration:** Pairs with the spatial audio system (Doc 05). Audio sources from this engine count against the 8-source audio budget.

---

## 10b. Performance Update: 18-Engine Budget

With 5 additional engines, the performance budgets from Section 9 need adjustment:

| Metric | Original (13 engines) | Updated (18 engines) |
|--------|----------------------|---------------------|
| Triangle budget | 50K for all engines | 65K for all engines (bonus engines use simpler geometry) |
| Draw calls | Max 30 for East Wing | Max 40 (bonus engines use instanced geometry) |
| Splat budget | 5,000 allocated to engines | 6,500 (300 per bonus engine) |
| Active physics | Nearest 3 engines | Nearest 3 engines (unchanged — bonus engines follow same LOD) |

**Bonus engine LOD strategy:** Same 4-tier system (Full / Medium / Low / Icon). Bonus engines are placed in less-trafficked zones and default to Low LOD until approached.

---

## 11. Design Philosophy: The Engines as Teachers

> "The 13 Engines are not oracles that tell you what to do. They are mirrors that show you what you already know but have not yet articulated. The Tarot does not predict the future; it surfaces the pattern you are living. The I-Ching does not divine fate; it reflects the quality of the question you asked. The Cartographer does not map new territory; it shows you the territory you have already crossed."

The ultimate measure of success is not engagement time or reading count. It is the moment the user looks at the Decision Mirror and recognizes their own pattern without needing to consult it. At that point, the system has succeeded. The user no longer needs it.

**Dependency is Failure. Recognition is the goal.**

---

*End of Eighteen Engines Artifact Specification (13 Core + 5 Bonus via Selemene)*
