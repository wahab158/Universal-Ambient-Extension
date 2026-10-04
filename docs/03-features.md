# 03 — Features

Every feature lives in exactly one of six systems. Each row states whether it is **Preserved** (already in the fork), **Generalised** (exists in the fork but currently YouTube-only), or **New** (greenfield).

Legend: 🟢 Preserved · 🟡 Generalised · 🔴 New

---

## System A — Universal Video Ambience

Extends the existing Ambilight renderer to any compatible video player.

### A1. Player-relative Ambilight

| Feature | Status | Note |
|---------|--------|------|
| Render lighting around the active video player | 🟡 | Already exists on YouTube; needs to move to adapter-supplied player rect |
| Top / bottom / left / right edges | 🟢 | `projector-webgl.js` already handles this |
| Per-edge thickness and brightness | 🟢 | Existing settings `outerStrength*`, `innerStrength*`, etc. |
| Corner blending | 🟢 | `projector-shadow.js` |
| Multi-zone colours per edge | 🟢 | Existing renderer |
| Adapt to player dimensions and aspect ratio | 🟡 | Currently wired to YouTube's `#player` container |
| Respect fullscreen and theatre modes | 🟡 | Handled today via `VIEW_THEATER`/`VIEW_FULLSCREEN` — needs a generic view-state API |
| Keep native playback controls accessible | 🟢 | Renderer sits behind the player, not in front |

### A2. Expanded ambient background

| Feature | Status | Note |
|---------|--------|------|
| Expand dominant video colours into the surrounding page | 🟡 | YouTube-only today via `data-ambientlight-enabled` on `<html>` |
| Generate a blurred video background | 🟡 | Same — currently via `.ytd-app` background override |
| Independent blur / brightness / saturation for the background | 🟡 | Currently combined into YouTube-specific theme overrides |
| Gradient fallback if video sampling is unavailable | 🔴 | Needed for cross-origin / protected video sources |
| Do not obscure page controls or other content | 🟡 | Behavior exists — must be re-derived per site |

### A3. Colour processing

| Feature | Status | Note |
|---------|--------|------|
| Dominant colour extraction | 🟢 | Existing in `projector-*.js` |
| Edge-based colour extraction | 🟢 | Existing |
| Multi-zone colour sampling | 🟢 | Existing |
| Colour smoothing / temporal blending | 🟢 | `averageVideoFramesDifference` |
| Brightness / saturation adjustment | 🟢 | Existing settings |
| Noise reduction / debanding (LCD + OLED modes) | 🟢 | `debandingBlendMode` |
| Manual colour / gradient override | 🔴 | Currently no user palette override |
| Warm / cool colour profiles | 🔴 | Presets in System F |

### A4. Intelligent rendering

| Feature | Status | Note |
|---------|--------|------|
| Adaptive sampling resolution | 🟢 | `resolution` setting (6.25% → 400%) |
| Quality based on available resources | 🟢 | WebGL vs Canvas 2D toggle (`webGL` setting) |
| Stop processing when paused | 🟡 | Works on YouTube; needs a generic playback-state signal |
| Detect mostly static frames | 🟢 | `static-image-detection.js`, `energySaver` setting |
| Reduce processing when tab is hidden | 🟡 | Present via lifecycle; must be adapter-agnostic |
| Recover after fullscreen transitions and player replacement | 🟡 | Currently YouTube-only recovery logic |

### A5. Existing features explicitly preserved

| Feature | Where it lives today | Status |
|---------|---------------------|--------|
| Black-bar detection | `bar-detection.js` (1,801 LOC) | 🟢 Keep |
| Video scaling | `videoScale` in `ambientlight.js` | 🟢 Keep |
| Directional lighting | `projector-*.js` | 🟢 Keep |
| Existing filters (brightness/saturation/blur) | Settings + WebGL shaders | 🟢 Keep |
| WebGL effects | `canvas-webgl.js`, `projector-webgl.js` | 🟢 Keep |
| Frame synchronisation (Decoded / Display / Video) | `frameSync` setting | 🟢 Keep |
| Performance diagnostics (FPS / frametimes / drawtimes) | `stats.js` (1,221 LOC) | 🟢 Keep |
| Immersive mode / theatre adjustment | `updateImmersiveMode` in `injected.js` | 🟡 Rename to per-platform profile |
| HDR detection | `is-hdr-video` in `injected.js` | 🟢 Keep (YouTube-only today) |
| VR video handling | `init-vr-video` / `dispose-vr-video` | 🟡 Move to YouTube adapter |

---

## System B — Audio Visualizer Engine

**Zero audio code exists in the fork today.** Everything below is greenfield. All six visualizers share one analysis pipeline.

### Shared audio-analysis pipeline

```
Audio source          Media element OR tab capture
        ↓
Audio processor       Web Audio API · AnalyserNode · smoothing
        ↓
Normalised data       frequency bins · bass · mids · treble · intensity · beat
        ↓
Visualizer(s)         spectrum · waves · circular · particles · liquid · minimal
```

### B1. Spectrum bars

| Feature | Status |
|---------|--------|
| Vertical and horizontal spectrum | 🔴 |
| Frequency grouping | 🔴 |
| Adjustable bar count and spacing | 🔴 |
| Bass / midrange / treble emphasis | 🔴 |
| Gradient + per-bar colour options | 🔴 |
| Peak-hold indicators | 🔴 |
| Mirrored spectrum | 🔴 |

### B2. Audio waves

| Feature | Status |
|---------|--------|
| Single and multiple waveforms | 🔴 |
| Smooth animated lines | 🔴 |
| Amplitude-based movement | 🔴 |
| Adjustable thickness, speed, colour | 🔴 |
| Optional glow | 🔴 |

### B3. Circular spectrum

| Feature | Status |
|---------|--------|
| Full and partial circles | 🔴 |
| Frequency bars around a circle | 🔴 |
| Album artwork inside the circle | 🔴 |
| Adjustable radius / thickness / segments | 🔴 |
| Rotating or pulsing centre artwork | 🔴 |

### B4. Particles

| Feature | Status |
|---------|--------|
| Audio-reactive particle movement | 🔴 |
| Bass-reactive expansion | 🔴 |
| Adjustable particle count and density | 🔴 |
| Colour inheritance from video or artwork | 🔴 |
| Adjustable trails and glow | 🔴 |
| Performance-aware particle limits | 🔴 |

### B5. Liquid

| Feature | Status |
|---------|--------|
| Fluid wave movement | 🔴 |
| Audio-reactive distortion (shader) | 🔴 |
| Frequency-based intensity | 🔴 |
| Adjustable fluid speed and amplitude | 🔴 |
| Colour blending and gradients | 🔴 |

### B6. Minimal waveform

| Feature | Status |
|---------|--------|
| Thin waveform line | 🔴 |
| Compact horizontal visualisation | 🔴 |
| Low-resource rendering (Canvas 2D only) | 🔴 |
| Optional waveform inside the player or around its border | 🔴 |

### Shared audio settings

| Setting | Purpose | Applies to |
|---------|---------|-----------|
| Sensitivity | Response strength | All B visualizers |
| Smoothing | Reduces rapid fluctuation | All |
| Frequency range | Bass / mids / treble focus | All |
| Animation speed | Movement rate | All |
| Brightness | Visual intensity | All |
| Density | Bars / particle count | Spectrum, circular, particles |
| Position | Placement around / inside player | All |
| Audio source | Which capture method is active | All (see [Platforms](./04-platforms.md)) |

---

## System C — Hybrid Effects Engine

**Compositional.** A hybrid effect must not create its own audio analyser or its own platform detector. It requests normalised data from B and colour/palette from A or D.

| Hybrid effect | Video / Artwork input | Audio input | Status |
|---------------|----------------------|-------------|--------|
| Audio-reactive Ambilight | Colour palette | Glow intensity | 🔴 |
| Dynamic Spectrum Border | Border colours | Frequency movement | 🔴 |
| Liquid Ambilight | Colour palette | Fluid distortion | 🔴 |
| Ambient particles | Particle colours | Movement + density | 🔴 |
| Edge Pulse | Edge lighting | Beat intensity | 🔴 |
| Gradient Flow | Gradient palette | Wave movement | 🔴 |
| Cinematic Pulse | Video ambience | Bass-reactive brightness | 🔴 |

**Design principle:** the hybrid engine is a small compositor. Each effect declares its dependencies (`video`, `audio`, `artwork`), and the engine feeds them from the appropriate source. Adding a new hybrid effect requires only the effect module.

---

## System D — Album Artwork Ambience

| Feature | Status |
|---------|--------|
| Extract dominant colours from album artwork | 🔴 |
| Generate 2-, 3-, and multi-colour gradients | 🔴 |
| Expand artwork into a blurred background | 🔴 |
| Match visualizer colours to artwork | 🔴 |
| Detect artwork changes when tracks change | 🔴 |
| Save artwork-derived palettes as presets | 🔴 |
| Manual palette overrides | 🔴 |

The **colour-source interface** must support, at minimum:
- Video frames
- Album artwork
- Manual palette (user-selected colours)
- Generated gradient
- Platform-provided artwork (e.g. Spotify's image URL)

This decouples music visualizers from video functionality — you can have artwork colour driving a visualizer with no video sampling at all.

---

## System E — Smart Media Modes

A **local rules engine** that maps media detection to an active effect, without user interaction.

| Rule trigger | Default effect | Status |
|--------------|----------------|--------|
| Video detected | Video Ambience with user's Cinema preset | 🟡 (implicit YouTube-only today) |
| Music playback detected | Spectrum or Circular visualizer | 🔴 |
| Artwork changes | Regenerate palette | 🔴 |
| Music video detected | Offer Hybrid mode | 🔴 |
| Playback paused | Fade / stop effects | 🟢 (present on YouTube) |
| Tab hidden | Reduce processing per performance profile | 🟡 |

Users must be able to:
- Disable automatic switching entirely
- Define custom rules per platform
- Manually override the currently selected effect (which pauses auto-switch for that session)

---

## System F — Presets & Customisation

Two levels of settings surface.

### Simple controls (default view)
- Master ambience toggle
- Mode: Video / Audio / Hybrid / Off
- Effect selection (from the active mode's list)
- Preset selection
- Brightness + intensity
- Placement
- Performance mode

### Advanced controls (behind a toggle)
- Colour palette, gradient editor
- Blur + spread, edge configuration
- Audio sensitivity, frequency range
- Particle density, rendering quality, frame-rate limit
- Platform-specific rules

### Built-in presets

| Preset | Configuration |
|--------|---------------|
| **Cinema** | Wide, soft video ambience |
| **Music** | Spectrum with artwork colours |
| **Immersive** | Strong hybrid effects |
| **Minimal** | Thin glow, low-intensity animation |
| **Aurora** | Flowing gradient + liquid movement |
| **Bass** | Bass-reactive particles + border |
| **Warm** | Warm palette + soft lighting |
| **Custom** | User-defined settings |

Presets must be **data-driven**, not hard-coded per visualizer. Users can save, duplicate, rename, export, and import presets.

---

## Cross-cutting: reporting & diagnostics

| Feature | Status |
|---------|--------|
| Per-platform capability status (supported / partial / experimental / unavailable) | 🔴 |
| Active media inspector | 🔴 |
| Engine state + last error view | 🟡 (Sentry crash reports exist; needs a user-visible surface) |
| FPS / frametime graph | 🟢 |
| Bar-detection stats | 🟢 |
| Draw-time / resolution stats | 🟢 |

The popup should show only modes that *actually work* on the current site. See [UI/UX Plan §Capability surfacing](./05-ui-ux.md#capability-surfacing).
