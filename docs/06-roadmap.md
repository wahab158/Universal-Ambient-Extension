# 06 — Roadmap & Milestones

Each milestone ships a **working, testable extension**. Not a stack of unfinished modules. Definition-of-Done for every phase is in [Testing & Acceptance](./11-testing-acceptance.md).

## Phase 0 — Repository audit & technical foundation

**Mandatory first phase. No user-visible changes.**

Deliverables:
- [ ] Extension clone builds successfully (`npm install && npm run build`)
- [ ] Verified licence (ISC) and dependency versions documented
- [ ] Entry-point map: `background.js`, `content.js`, `content-main.js`, `injected.js`, `options.js` — every file's responsibility written down
- [ ] Dependency graph of `ambientlight.js` (3,925 LOC) → every other lib
- [ ] **YouTube DOM touch-point inventory**: every selector in `content-main.js`, `injected.js`, `ambientlight.js` that references a YouTube-specific class or ID
- [ ] Identify code to retain as-is, wrap as an adapter, or generalise
- [ ] Baseline performance test — record FPS, GPU/CPU cost on a defined hardware tier
- [ ] Platform capability matrix — start with YouTube, sketch the others
- [ ] Test inventory — none exist today; establish minimum harness
- [ ] Written refactoring plan mapping every existing file → target structure in [Architecture](./08-architecture.md)

**Biggest technical risks to resolve in Phase 0** (from the product spec §13):

| Risk | Question we must answer |
|------|------------------------|
| Existing renderer coupling | Can `ambientlight.js` + `projector-*.js` accept an arbitrary HTML video element, or do they hard-depend on `ytd-app` / `.ytp-*` structure? |
| Audio capture feasibility | Which platforms expose audio through Web Audio? Which need `tabCapture`? What does Firefox support? |
| Multiple players on one page | Can the rendering lifecycle handle Instagram/Facebook-style dynamic player replacement? |
| Cross-browser compatibility | Does the abstraction hold up on Firefox once we add `tabCapture` and optional permissions? |
| DRM | Which protected platforms actually allow any form of sampling? |
| Build + extension identity | How does the fork retain attribution, licence, update behaviour, and its own extension ID? |

**Outcome: the audit doc becomes the input to Phase 1's design.** No code changes ship to users in Phase 0.

## Phase 1 — Universal media core

Establish the abstraction layer **without breaking YouTube**.

Deliverables:
- [ ] `MediaSession` shape defined (JS + JSDoc)
- [ ] `PlatformAdapter` interface defined
- [ ] Media discovery service
- [ ] Active-player selection service (single-session for now; multi-session API in Phase 6)
- [ ] Shared playback state + metadata model
- [ ] `YouTubeAdapter` extracted from `content-main.js` + `injected.js` YouTube-specific branches
- [ ] Existing `Ambientlight` renderer refactored to consume a `MediaSession` — not raw DOM
- [ ] Basic **diagnostics view** in the options page showing active platform, media state, capabilities

**Definition of Done:** The extension runs on YouTube. Ambilight turns on and off. Navigating between videos works. Fullscreen enter/exit works. All existing settings behave identically. Underneath, the code goes through the new `MediaSession` layer.

## Phase 2 — Universal video Ambience

Generalise the video pipeline beyond YouTube.

Deliverables:
- [ ] Frame sampling decoupled from `video.html5-main-video` — driven by `MediaSession.element`
- [ ] Multi-zone colour extraction reusable across sites
- [ ] Expanded blurred background — generic placement API (not `ytd-app` override)
- [ ] Player-relative positioning that reads `MediaSession.bounds`
- [ ] Handling for player resize, SPA navigation, fullscreen transitions
- [ ] Generic HTML5-video adapter shipped
- [ ] Vimeo adapter validated (Tier-3 early proof)
- [ ] Twitch adapter validated (Tier-3 early proof)

**Definition of Done:** The extension provides a working Video Ambience on YouTube, Vimeo, and Twitch, with the same visual quality and performance.

## Phase 3 — Audio engine + music platforms

Greenfield work. **No audio code exists today.**

Deliverables:
- [ ] `AudioSource` abstraction — media-element OR tab-capture
- [ ] Analyser pipeline: FFT, smoothing, normalised frequency bins, bass/mid/treble splits, beat-detection (basic energy-based)
- [ ] `tabCapture` fallback with user-gesture flow — Chromium only
- [ ] All **six visualizers** shipped: spectrum, waves, circular, particles, liquid, minimal
- [ ] Album-artwork colour extraction
- [ ] YouTube Music adapter (music + video hybrid paths)
- [ ] Spotify adapter (artwork + audio, tab-capture where needed)
- [ ] SoundCloud adapter (waveform-friendly minimal visualizer + artwork)

**Definition of Done:** Working music visualisation with verified per-platform capabilities. Popup honestly reflects what a site supports. Firefox vs Chromium behaviour documented.

## Phase 4 — Hybrid effects

Combine video + audio pipelines through a small compositor.

Deliverables:
- [ ] Hybrid effects engine — composable, dependency-declared
- [ ] Spectrum border effect
- [ ] Audio-reactive Ambilight (glow intensity modulated by audio)
- [ ] Ambient particles + liquid effect
- [ ] Beat-reactive edge pulse
- [ ] Artwork-driven hybrid backgrounds

**Definition of Done:** Hybrid mode selectable from the popup on every supported platform. Adding a new hybrid effect requires only an effect module — no plumbing changes.

## Phase 5 — Presets & Smart Media Modes

Full customisation and automation surface.

Deliverables:
- [ ] **Versioned settings schema** with migration from upstream
- [ ] Preset management: save / duplicate / rename / export / import
- [ ] Per-platform profiles
- [ ] Automatic media-mode selection (rules engine)
- [ ] Colour palette generation from video / artwork / manual
- [ ] Advanced settings UI (sidebar, all sections)
- [ ] Diagnostics panel in options page

**Definition of Done:** A user can install the extension, get sensible defaults, pick a preset, or build their own — and every platform has a stable preset that behaves well out of the box.

## Phase 6 — Social platform adapters

Instagram + Facebook introduce multi-video pages.

Deliverables:
- [ ] Active-Reels detection for Instagram
- [ ] Video detection for Facebook / web.facebook.com
- [ ] Support for multiple simultaneous players and scrolling feeds
- [ ] Rapid player replacement handling
- [ ] Validate audio + artwork capability reporting on these sites

**Definition of Done:** Real feed navigation — scroll, autoplay, mute, seek — works correctly with active-player selection following the visible video.

## Phase 7 — Netflix compatibility experiment

Netflix is Tier-5 precisely because we do not know what will work.

Deliverables:
- [ ] Video-frame access test (assume DRM produces black canvas)
- [ ] Audio capture test
- [ ] Fullscreen + playback lifecycle test
- [ ] Determine actual feature availability from evidence
- [ ] Implement appropriate fallback (audio-only, artwork-only, or explicit unsupported state)

**Definition of Done:** An honest Netflix compatibility report — either a working integration or a documented "Netflix is not supported because X" state.

## Phase 8 — Stabilisation & release

Deliverables:
- [ ] Cross-browser testing (Chromium: Chrome + Edge + Opera; Firefox)
- [ ] Memory-leak + long-session (60 min) tests
- [ ] Performance benchmarking on low/mid/high tier GPUs
- [ ] Permission + privacy review
- [ ] Accessibility (keyboard, screen reader, reduced motion)
- [ ] Settings migration from the original extension verified end-to-end
- [ ] Store listing prep (Chrome Web Store, Edge Add-ons, Firefox AMO, Opera)
- [ ] Documentation set published

**Definition of Done:** Release candidate with documented platform support and no regressions against upstream YouTube Ambilight.

## Beyond Phase 8 (deferred, see [Scope](./02-scope.md))

- Ambient Control Bar
- Desktop companion
- External RGB lighting (Hue / Govee / nanoleaf / Adalight)

## Rough sequencing

```
        Phase 0 (audit)
             ↓
        Phase 1 (universal core)
             ↓
        Phase 2 (video generalised)
             ↓
        Phase 3 (audio + music)      ← biggest greenfield step
             ↓
        Phase 4 (hybrid)
             ↓
        Phase 5 (presets + smart modes)
             ↓
        Phase 6 (social) ── Phase 7 (Netflix experiment)
             ↓                        ↓
        Phase 8 (stabilise + release, merges both tracks)
```

Phases 6 and 7 are independent and can run in parallel once Phase 5 is stable.

## Milestone 1 — first implementation target (locked)

The first *code change* we make. Everything else waits.

**Scope:**
- Original extension builds successfully
- Existing YouTube Ambilight still works — bit-identical behaviour
- A universal media-session interface exists (JS shape + JSDoc, no TypeScript)
- YouTube is represented by its own `YouTubeAdapter` module
- The active media manager reports media state + capabilities
- The new architecture does not interfere with the original renderer
- A basic diagnostics view shows active platform, media state, supported capabilities

**Definition of Done:**
> We can run the extension on YouTube, enable and disable the existing Ambilight, navigate between videos, enter and exit fullscreen, and inspect a standardised media session without breaking the original behaviour.

This is the reliable base every subsequent engine stands on.
