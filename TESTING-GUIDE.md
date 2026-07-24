# Spatial Anubis — Local Testing Guide

**Date:** 2026-02-12
**Status:** ✅ Frontend Running on http://localhost:3001

---

## 🎯 What's Been Built

### **Phase 3 Sprint 3 (P3-S3) — Complete**
✅ 13 Divination Engines
- Cartographer's Compass (meta-engine)
- Field Journal with PostgreSQL persistence
- Spatial audio system
- LOD optimization & instanced rendering
- 15 polish features (achievements, PDF export, streaks, etc.)

### **Phase 4 Sprint 1 (P4-S1) — Complete**  
✅ Ritual & Sigil System
- Stone of Intention with physics
- Fire Circle ignition mechanics
- Crystal spawning animations
- Sigil Forge (anvil system)
- 3D sigil display

### **Phase 4 Sprint 2 (P4-S2) — Complete**
✅ Accessibility (WCAG AA)
- Screen reader support
- Keyboard navigation (Alt+A for overlay)
- 3 color blind modes
- High contrast mode
- Reduced motion support
- Tab synchronization

---

## 🧪 Testing Checklist

### **1. Basic Functionality**
- [ ] Page loads without console errors
- [ ] 3D scene renders (Three.js canvas visible)
- [ ] Camera controls work (orbit/pan/zoom)
- [ ] Performance monitor shows FPS

### **2. Accessibility Features** (Press Alt+A)
- [ ] Accessibility overlay opens
- [ ] Toggle reduced motion
- [ ] Switch color blind modes (3 types)
- [ ] Enable high contrast
- [ ] Adjust font size (80-150%)
- [ ] Test keyboard navigation
  - Tab to cycle through elements
  - 1-4 keys for directional movement
  - E to engage engines
  - Escape to close overlays

### **3. Ritual System** (P4-S1)
- [ ] Find the Stone of Intention
- [ ] Approach the Fire Circle (West zone at -35, 0, 0)
- [ ] Watch stone damping increase with distance
- [ ] Trigger ignition particle effect
- [ ] See crystal spawn after burn complete
- [ ] Interact with Sigil Forge anvil
- [ ] Test sweet spot detection
- [ ] View 3D sigil display

### **4. Engine System** (P3-S3)
- [ ] Navigate to engine locations
- [ ] Engage with engines (proximity-based)
- [ ] Hear unique activation tones
- [ ] Complete readings
- [ ] Check Field Journal (slides from right)
- [ ] Test achievements/badges system
- [ ] Export reading as PDF
- [ ] Check reading statistics

### **5. Audio System**
- [ ] Spatial audio works
- [ ] 13 unique engine tones
- [ ] Distance-based attenuation
- [ ] Completion sounds
- [ ] Audio toggle works

### **6. Performance**
- [ ] FPS stays above 60 (or 30 on lower-end hardware)
- [ ] LOD system activates (engines change detail level with distance)
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Smooth physics interactions
- [ ] No stuttering during navigation

---

## 🐛Known Issues

### **TypeScript Errors (Non-blocking)**
The app runs despite these compilation warnings:

1. **Missing Type Exports** (3 files)
   - `ProgressiveWorldLoaderProps`
   - `GroundRippleMeshProps`
   - `CardinalGlowsProps`

2. **ZoneUnlockMachine Type Issues**
   - Property 'zones' not found in store
   - Duplicate identifier 'ZoneUnlockState'

3. **Unused Variables** (TS6133 warnings)
   - Non-critical, can be cleaned up later

4. **Module Resolution**
   - Some Rapier/Three.js type mismatches

**Impact:** None—these don't prevent the app from running.

---

## 🔧 Backend Setup (Optional)

The frontend works standalone, but for full functionality:

### **Requirements**
- PostgreSQL 15+
- Python 3.11+

### **Setup**
```bash
# 1. Create database
createdb spatial_anubis

# 2. Install Python dependencies
cd backend
pip install -r requirements.txt

# 3. Run migrations
alembic upgrade head

# 4. Start backend
uvicorn app.main:app --reload --port 8000
```

### **Backend Features**
- World generation pipeline
- Field Journal persistence
- Reading history
- User authentication
- Rate limiting

### **Backend API Docs**
Once running: http://localhost:8000/docs

---

## 📊 Test Scenarios

### **Scenario 1: First-Time User Flow**
1. Load app → See onboarding/descent sequence
2. Complete calibration
3. Discover first engine
4. Complete first reading
5. Check Field Journal
6. Unlock "First Reading" achievement

### **Scenario 2: Ritual Completion**
1. Navigate to West zone
2. Find Stone of Intention
3. Throw stone into Fire Circle
4. Watch ignition animation
5. Crystal spawns
6. Interact with Sigil Forge
7. Complete sigil creation

### **Scenario 3: Accessibility User**
1. Press Alt+A
2. Enable high contrast
3. Turn on reduced motion
4. Increase font size to 120%
5. Navigate with keyboard only
6. Complete reading using Tab/Enter/Space

### **Scenario 4: Power User**
1. Complete readings from all 13 engines
2. Unlock Cartographer's Compass
3. See meta-reading synthesis
4. Export all readings to PDF
5. Check statistics dashboard
6. Achieve 7-day reading streak

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Alt+A** | Toggle accessibility overlay |
| **1-4** | Directional teleport (N/S/E/W) |
| **E** | Engage engine |
| **Escape** | Close overlay/modal |
| **Tab** | Cycle focus |
| **Space** | Confirm action |
| **Arrow Keys** | Roving tab navigation (in toolbars) |

---

## 🚀 Next Steps

### **Fix TypeScript Errors**
```bash
# Run type check
bun run type-check

# Fix export issues in:
# - src/world/components/ProgressiveWorldLoader.tsx
# - src/world/components/GroundRippleMesh.tsx
# - src/world/components/CardinalGlows.tsx
# - src/world/zones/ZoneUnlockMachine.ts
```

### **Run E2E Tests**
```bash
# Install Playwright
bun run test:e2e:chromium

# Smoke test
bun run test:e2e:smoke

# Interactive UI mode
bun run test:e2e:ui
```

### **Build for Production**
```bash
bun run build
bun run preview
```

---

## 📝 Development Log

| Date | Phase | Items | Status |
|------|-------|-------|--------|
| 2026-02-12 | P4-S2 | Accessibility (12 files) | ✅ Complete |
| 2026-02-12 | P4-S1 | Rituals & Sigil (9 files) | ✅ Complete |
| 2026-02-11 | P3-S3 | Meta-engine (36 tasks) | ✅ Complete |

---

## 🔍 Debugging Tools

### **Chrome DevTools**
- Console: Check for runtime errors
- Performance: Profile frame rates
- Memory: Check for leaks
- Network: Monitor API calls (if backend running)

### **React DevTools**
- Component tree inspection
- State debugging (Zustand stores)
- Performance profiling

### **Three.js DevTools**
- Object3D inspection
- Geometry/Material stats
- Render statistics

---

## ✅ Testing Report Template

```markdown
## Test Session Report
**Date:** YYYY-MM-DD
**Tester:** Your Name
**Browser:** Chrome/Firefox/Safari
**OS:** macOS/Windows/Linux

### Passed ✅
- Item 1
- Item 2

### Failed ❌
- Issue 1: Description + Steps to reproduce
- Issue 2: Description + Steps to reproduce

### Performance
- Average FPS: 
- Memory usage:
- Load time:

### Notes
- Additional observations
```

---

## 🎬 Demo Video Topics

1. **Accessibility Showcase** (Alt+A features)
2. **Ritual Completion** (Stone → Fire → Crystal → Sigil)
3. **Engine Navigation** (All 13 engines tour)
4. **Field Journal** (Reading history, achievements)
5. **Performance** (60fps with 500k splats)

---

## 🆘 Troubleshooting

### **Port Already in Use**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
bun run dev
```

### **Dependencies Out of Sync**
```bash
rm -rf node_modules bun.lockb
bun install
```

### **PostgreSQL Not Found**
```bash
# Install via Homebrew (macOS)
brew install postgresql@15
brew services start postgresql@15
```

### **White Screen / No Render**
- Check browser console for errors
- Verify WebGL support: https://get.webgl.org/
- Try clearing cache (Cmd+Shift+R)

---

**Happy Testing! 🚀**

Questions? Check [PROGRESS.md](PROGRESS.md) for detailed implementation notes.
