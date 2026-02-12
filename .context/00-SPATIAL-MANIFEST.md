# Spatial Anubis — Architecture Manifest
## Triambhakam OASIS // NOESIS: The Spatial Field

---

## Project Identity

**Name:** Spatial Anubis (codename for the 3D OASIS implementation)
**Parent:** Triambhakam NOESIS — A Living System for Self-Authored Meaning
**Purpose:** Transform the NOESIS experience from a 2D web plane into a persistent, physics-enabled, bio-responsive 3D environment.

**Core Paradigm Shift:** From "website" to "spatial field." The user does not browse pages — they inhabit a generated world, navigate through zones using their body, and interact with divination artifacts through kinetic physics.

---

## Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **World Generation** | World Labs (Marble) | Procedural 3D environment creation from text/image prompts |
| **Rendering (Splats)** | SparkJS + gsplat | Gaussian Splatting renderer integrated with Three.js |
| **Rendering (Scene)** | Three.js / React-Three-Fiber | 3D scene graph, camera, lighting, post-processing |
| **Physics** | Rapier.js | Real-time collision, gravity, forces, rigid body simulation |
| **Body Tracking** | MediaPipe (Selfie Segmentation + Face Mesh) | Webcam-based vessel rendering and head-tilt navigation |
| **Bio-Feedback** | PIP Analysis Engine | Breath rate, coherence, entropy, LQD metrics |
| **Frontend** | React 18 + TypeScript + Vite + Bun | Application framework and build system |
| **Calculation Engine** | Selemene (Rust + TypeScript) | 15 divination engines (10 Rust, 5 TS), sub-ms calculations, deployed at selemene.tryambakam.space |
| **BFF (Backend-for-Frontend)** | Bun + Hono + Drizzle ORM | API proxy to Selemene, response transformation, session state, PostgreSQL persistence |
| **Database** | PostgreSQL | User profiles, engine readings (Field Journal), sessions, world metadata |
| **Styling** | Tailwind CSS | UI overlay styling |

---

## Document Index

| # | File | Domain | Words | Status |
|---|------|--------|-------|--------|
| 00 | `00-SPATIAL-MANIFEST.md` | Index & Navigation | — | Active |
| 01 | `01-SPATIAL-ARCH-LATENT-TEMPLE.md` | Environment & World Generation | ~1,700 | Draft |
| 02 | `02-VESSEL-INTERFACE-CRYSTALLINE-SHIP.md` | User Representation & Bio-Feedback | ~1,300 | Draft |
| 03 | `03-KINETIC-RITUAL-PROTOCOLS.md` | Physics & Interaction | ~5,300 | Draft |
| 04 | `04-THIRTEEN-ENGINES-ARTIFACT-SPEC.md` | Divination Engine Artifacts | ~7,000 | Draft |
| 05 | `05-TECHNICAL-PIPELINE-VOID-TO-FORM.md` | Integration Architecture | ~6,000 | Draft |
| 06 | `06-THRESHOLD-SEQUENCE-3D-ONBOARDING.md` | 3D Onboarding & Entry | ~6,300 | Draft |

**Total Specification:** ~27,600 words across 6 documents.

---

## Reading Order (For AI/IDE Context Loading)

### Full Context (New to project)
Read in order: `00` → `01` → `02` → `05` → `03` → `04` → `06`

### By Task

| Task | Load These Documents |
|------|---------------------|
| **World Generation** | 01 (Biome Prompts, Zone Logic) + 05 (API Pipeline) |
| **User Vessel / Avatar** | 02 (Crystalline Ship) + 05 (MediaPipe Integration) |
| **Physics & Interaction** | 03 (Kinetic Rituals) + 01 (Gravity Zones) |
| **Engine Artifacts** | 04 (Thirteen Engines) + 03 (Interaction Verbs) |
| **Onboarding / Entry** | 06 (Threshold Sequence) + 02 (Calibration) |
| **Performance Optimization** | 05 (Budgets, LOD, Degradation) |
| **Shader Development** | 01 (Lighting, Post-Processing) + 05 (Shader Integration) + 02 (Breathfield Uniforms) |
| **Backend API** | 04 (Engine API Triggers) + 05 (BFF + Selemene Architecture) + `agent-backend.md` |

---

## Cross-References to Sibling Projects

| Resource | Path | Use For |
|----------|------|---------|
| Brand Documentation (26 files) | `../Website/.brand/` | Voice, color palette, persona, messaging |
| Visual Identity Guide | `../Website/.brand/06-visual-identity.md` | Color codes, typography, imagery |
| Product Description | `../Website/.brand/04-detailed-product-description.md` | 6 core offerings mapping |
| Buyer Persona | `../Website/.brand/01-buyer-persona.md` | Seeker Simon UX decisions |
| Effects Library | `../Website/.context/effects_library/` | Shader patterns, particle systems |
| Implementation Plan | `../Website/IMPLEMENTATION_PLAN.md` | Existing React + R3F stack |
| Wiki Architecture | `../wiki/.context/` | Documentation patterns |
| Reference Implementations | `../_archive-reference/singularity/` | Three.js world structure |

---

## Brand Palette (Quick Reference)

| Name | Hex | Usage |
|------|-----|-------|
| Deep Ink | `#1A1A2E` | Backgrounds, void, baseline state |
| Bone | `#F5F0E8` | Light elements, structural geometry |
| Aged Gold | `#B8860B` | Interactive artifacts, high coherence |
| Stone Grey | `#6B6B6B` | Secondary elements, inactive states |
| Terracotta | `#C65D3B` | Warning, high entropy, stress states |

---

## Key Architectural Principles

1. **"Difficulty as Feature"** — Interaction requires kinetic effort, not clicks. The physics engine IS the interface.
2. **"Body as Sensor"** — Navigation via head-tilt, interaction via gesture, feedback via breath. The webcam is not optional enhancement — it is the primary input.
3. **"Dependency is Failure"** — The system succeeds when the user no longer needs it. Progression leads to independence.
4. **"No Tutorials. Only Thresholds."** — The onboarding is a ritual, not an explanation. Discovery over instruction.
5. **"Viscosity of Consciousness"** — Bio-coherence controls movement speed. Regulation earns fluidity. Dysregulation earns friction.

---

## Development Phase Overview

| Phase | Focus | Docs | Weeks |
|-------|-------|------|-------|
| 1. The Void | Three.js + Rapier + Deep Ink skybox | 01, 05 | 1-2 |
| 2. The Mirror | MediaPipe → SparkJS vessel rendering | 02, 05 | 3-4 |
| 3. The Generation | World Labs API + progressive loading | 01, 05 | 5-6 |
| 4. The Physics | Viscosity/coherence + kinetic verbs | 03, 01 | 7-9 |
| 5. The Rituals | I-Ching, Tarot, Forge interactions | 03, 04 | 10-12 |
| 6. The Engines | Full 18-engine constellation (13 core + 5 bonus via Selemene) | 04 | 13-16 |
| 7. The Threshold | 3D onboarding sequence | 06 | 17-18 |
| 8. Integration | Full pipeline, performance tuning | 05, All | 19-22 |

---

## JSON Handoff

```json
{
  "meta": {
    "project": "spatial-anubis",
    "parent": "Triambhakam NOESIS",
    "version": "1.0.0-alpha",
    "document_count": 7,
    "total_words": 27600
  },
  "tech_stack": {
    "generation": "World Labs Marble",
    "rendering_splats": "SparkJS + gsplat",
    "rendering_scene": "Three.js / React-Three-Fiber",
    "physics": "Rapier.js",
    "body_tracking": "MediaPipe",
    "bio_feedback": "PIP Analysis Engine",
    "frontend": "React 18 + TypeScript + Vite + Bun",
    "calculation_engine": "Selemene (Rust + TypeScript, 15 engines, sub-ms)",
    "bff": "Bun + Hono + Drizzle ORM (proxy + transform + persist)",
    "database": "PostgreSQL"
  },
  "documents": {
    "00": "Manifest & Index",
    "01": "Spatial Architecture (Latent Temple)",
    "02": "Vessel Interface (Crystalline Ship)",
    "03": "Kinetic Ritual Protocols",
    "04": "Thirteen Engines Artifact Spec",
    "05": "Technical Pipeline (Void to Form)",
    "06": "Threshold Sequence (3D Onboarding)"
  },
  "brand_palette": {
    "deep_ink": "#1A1A2E",
    "bone": "#F5F0E8",
    "aged_gold": "#B8860B",
    "stone_grey": "#6B6B6B",
    "terracotta": "#C65D3B"
  }
}
```

---

*Everything begins in the Void. Everything returns to the Threshold.*
