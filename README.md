# Spatial Anubis

**3D OASIS Spatial Field — Persistent, Physics-Enabled, Bio-Responsive Environment for Divination**

Part of the Triambhakam NOESIS system.

---

## Project Status

✅ **Phase P0 Sprint 1** — Foundation Infrastructure Setup (IN PROGRESS)

### Completed Tasks (P0-S1):
- ✅ P0-S1-01: Bun + TypeScript project initialization
- ✅ P0-S1-02: Vite with React plugin and HMR configured
- ✅ P0-S1-03: React 18 strict mode entry point
- ✅ P0-S1-04: ESLint with TypeScript rules
- ✅ P0-S1-05: Prettier code formatting
- ✅ P0-S1-06: TypeScript strict mode enabled
- ✅ P0-S1-07: Git repository with .gitignore
- ✅ P0-S1-08: Project folder structure (12 modules)
- ✅ P0-S1-09: Environment variable configuration

### Currently Working:
- 🔨 P0-S1-10: Three.js/R3F scene setup with 60fps target

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **World Generation** | World Labs (Marble) |
| **Rendering (Splats)** | SparkJS + gsplat |
| **Rendering (Scene)** | Three.js / React-Three-Fiber |
| **Physics** | Rapier.js |
| **Body Tracking** | MediaPipe (Selfie Segmentation + Face Mesh) |
| **Bio-Feedback** | PIP Analysis Engine |
| **Frontend** | React 18 + TypeScript + Vite + Bun |
| **Backend** | Bun + Hono + Drizzle ORM |
| **Database** | PostgreSQL |
| **Styling** | Tailwind CSS |

---

## Getting Started

### Prerequisites
- **Bun** v1.3.8 or higher
- **Node.js** v20+ (for compatibility)
- **PostgreSQL** 15+ (for backend)

### Installation

```bash
bun install
```

### Development

```bash
# Start development server (Vite)
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint

# Format code
bun run format
```

The development server will start at `http://localhost:3000` (or next available port).

---

## Project Structure

```
spatial-anubis/
├── .context/              # Architecture documentation (6 docs, ~27,600 words)
├── waves/                 # Task breakdown JSONs (P0-P4, gaps, Selemene)
├── src/
│   ├── core/             # App lifecycle, initialization, config
│   ├── physics/          # Rapier.js integration, collision handling
│   ├── rendering/        # Three.js/R3F, SparkJS, LOD management
│   ├── vessel/           # User representation, MediaPipe tracking
│   ├── engines/          # 13 divination engine artifacts
│   ├── rituals/          # Kinetic interaction verbs
│   ├── onboarding/       # Descent + Calibration sequence
│   ├── audio/            # Spatial audio, feedback sounds
│   ├── bio/              # PIP integration, breath analysis
│   ├── shaders/          # Custom GLSL shaders, materials
│   ├── state/            # Zustand stores
│   ├── utils/            # Helper functions, constants
│   ├── components/       # React UI components
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript definitions
├── package.json          # Dependencies & scripts
├── vite.config.ts        # Vite bundler configuration
├── tsconfig.json         # TypeScript compiler options
├── tailwind.config.js    # Tailwind CSS theme (brand colors)
└── task_master_plan.json # 500-task implementation plan (13 sprints, 26 weeks)
```

---

## Brand Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Deep Ink | `#1A1A2E` | Backgrounds, void, baseline |
| Bone | `#F5F0E8` | Light elements, structural geometry |
| Aged Gold | `#B8860B` | Interactive artifacts, high coherence |
| Stone Grey | `#6B6B6B` | Secondary elements, inactive states |
| Terracotta | `#C65D3B` | Warning, high entropy, stress states |

---

## Performance Targets

- **60 fps** on mid-range GPU (GTX 1660 / M1 MacBook Air)
- **500k Gaussian splats** max
- **256 MB VRAM** budget
- **4ms per-frame** MediaPipe WASM budget
- **WebGL2** target (no WebGPU)

---

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# API Endpoints
VITE_BFF_API_URL=http://localhost:8000
VITE_SELEMENE_API_URL=https://selemene.tryambakam.space
VITE_PIP_API_URL=http://localhost:8001
VITE_WORLDLABS_API_KEY=your-api-key

# Feature Flags
VITE_ENABLE_MEDIAPIPE=true
VITE_ENABLE_PHYSICS_DEBUG=false
VITE_ENABLE_PERFORMANCE_MONITOR=true
```

---

## Architecture Documentation

Full specifications available in `.context/`:

1. **00-SPATIAL-MANIFEST.md** — Index & navigation
2. **01-SPATIAL-ARCH-LATENT-TEMPLE.md** — Environment & world generation
3. **02-VESSEL-INTERFACE-CRYSTALLINE-SHIP.md** — User representation & bio-feedback
4. **03-KINETIC-RITUAL-PROTOCOLS.md** — Physics & interaction
5. **04-THIRTEEN-ENGINES-ARTIFACT-SPEC.md** — Divination engines
6. **05-TECHNICAL-PIPELINE-VOID-TO-FORM.md** — Integration architecture
7. **06-THRESHOLD-SEQUENCE-3D-ONBOARDING.md** — 3D onboarding flow

**Total:** ~27,600 words

---

## Next Steps (P0-S1)

- [ ] P0-S1-10: Three.js/R3F scene with rotating cube test
- [ ] P0-S1-11: Set scene background to Deep Ink (#1A1A2E)
- [ ] P0-S1-12: Three-light rig (Ambient, Directional, Point)
- [ ] P0-S1-13: Initialize Rapier.js physics world
- [ ] P0-S1-14: Fixed-timestep physics loop (60fps)
- [ ] P0-S1-15: Three.js ↔ Rapier sync utility

---

## License

Proprietary — Triambhakam NOESIS © 2026

---

**Status:** Foundation infrastructure complete. Beginning 3D scene setup.
