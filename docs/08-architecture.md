# 08 — Target Architecture

## Guiding principle

> **One shared core with isolated platform adapters.** Engines never know which website they run on. Adapters never render pixels. Rendering never knows about DOM.

## Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  UI LAYER                                                       │
│   Popup (quick controls)  ·  Options (full settings)            │
│   In-page slim toggle     ·  Diagnostics view                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ settings + commands + reports
┌────────────────────────────┴────────────────────────────────────┐
│  EXTENSION BACKGROUND                                           │
│   Service worker · Message router · Permission manager          │
└────────────────────────────┬────────────────────────────────────┘
                             │ chrome.runtime messaging
┌────────────────────────────┴────────────────────────────────────┐
│  CONTENT RUNTIME (per tab)                                      │
│   Content entry · Runtime lifecycle · Overlay manager           │
└────────────────────────────┬────────────────────────────────────┘
                             │ discovers media sessions
┌────────────────────────────┴────────────────────────────────────┐
│  MEDIA DISCOVERY + PLATFORM ADAPTERS                            │
│   MediaSession Manager · Active Player Selector                 │
│   YouTubeAdapter · SpotifyAdapter · YoutubeMusicAdapter · …     │
└────────────────────────────┬────────────────────────────────────┘
                             │ normalised MediaSession stream
┌────────────────────────────┴────────────────────────────────────┐
│  UNIVERSAL MEDIA CORE                                           │
│   Playback State · Metadata · Capabilities · Policy             │
└──┬──────────────────┬──────────────────┬──────────────────┬─────┘
   │                  │                  │                  │
┌──┴────┐        ┌─────┴─────┐      ┌─────┴─────┐       ┌────┴──────┐
│ Video │        │   Audio   │      │ Artwork   │       │  Hybrid   │
│Engine │        │  Engine   │      │  Engine   │       │  Engine   │
└──┬────┘        └─────┬─────┘      └─────┬─────┘       └────┬──────┘
   │  palette         │  freq data        │  palette         │ composed
   └──────────┬───────┴─────────┬─────────┘                  │
              ↓                 ↓                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  RENDERING LAYER                                                │
│   WebGL · Canvas 2D · CSS overlays                              │
│   Visualizers: spectrum, waves, circular, particles, liquid,    │
│                minimal, plus hybrid effects                     │
└─────────────────────────────────────────────────────────────────┘

Cross-cutting:
┌─────────────────────────────────────────────────────────────────┐
│  SETTINGS · STORAGE · PRESETS · DIAGNOSTICS · ERROR REPORTING   │
└─────────────────────────────────────────────────────────────────┘
```

## Layer responsibilities

| Layer | Owns | Does NOT know about |
|-------|------|--------------------|
| Popup / Options | UI state, quick controls, preset management | DOM of any media site, engines internals |
| Background / Service worker | Cross-tab coordination, permission grants, update flow | Rendering, media lifecycle |
| Content runtime | Per-tab lifecycle, overlay attachment | Which specific site is loaded |
| Platform adapters | Site DOM → MediaSession translation | Rendering, engines, audio analysis |
| Media-session manager | Active-session selection, event fan-out | DOM selectors |
| Universal media core | Normalised state + capability flags | Website-specific logic |
| Video engine | Frame sampling, colour extraction | Website DOM |
| Audio engine | Analysis, frequency data, beat | Which site is playing |
| Artwork engine | Palette from artwork image | Video pipeline |
| Hybrid engine | Effect composition | Own audio analyser, own DOM |
| Rendering layer | Draw effects onto a canvas / DOM overlay | Which site or which session |
| Storage / settings | Versioned schema, persistence, migration | Effects |

## Data flow for a video site (YouTube today, Vimeo tomorrow)

```
HTMLVideoElement
     │  adapter wraps → MediaSession
     ▼
MediaSession { id, platform, type: 'video', state, element, bounds, capabilities }
     │
     ▼
VideoEngine.frameSampler(session.element, session.bounds)
     │  produces palette (multi-zone colour, dominant, smoothing)
     ▼
HybridEngine (optional) ──── AudioEngine.freqData (if audio available)
     │
     ▼
Renderer.draw(palette, freqData)
     │
     ▼
<canvas class="ambient-overlay">   ← positioned via session.bounds
```

## Data flow for a music site (Spotify, YouTube Music)

```
<audio> + artwork <img>
     │  adapter wraps → MediaSession
     ▼
MediaSession { id, platform, type: 'audio', state, element, metadata.artworkUrl, capabilities }
     │
     ├──► ArtworkEngine.paletteFrom(metadata.artworkUrl)
     │
     ├──► AudioEngine.freqData(session.element)   ← may fall back to tabCapture
     │
     ▼
Visualizer.draw(freqData, palette)
     │
     ▼
<canvas class="ambient-overlay">
```

## Directory target (post-Phase 1)

This is the destination, not a mandate to move every file at once. Files migrate lazily, as each phase touches them.

```
src/
├── background/
│   ├── service-worker.js       ← was background.js
│   ├── message-router.js
│   └── permission-manager.js
│
├── content/
│   ├── entry.js                ← was content.js (loader)
│   ├── runtime.js              ← was content-main.js (universal orchestrator)
│   ├── media-discovery.js
│   ├── media-session-manager.js
│   ├── active-player-selector.js
│   └── overlay-manager.js
│
├── platforms/
│   ├── base/
│   │   ├── adapter.js          ← PlatformAdapter shape (JSDoc)
│   │   ├── media-session.js
│   │   └── capabilities.js
│   ├── youtube/                ← absorbs the current YouTube DOM coupling
│   │   ├── adapter.js
│   │   ├── page-glue.js        ← was injected.js
│   │   ├── selectors.js        ← every `ytd-*` / `.ytp-*` selector lives here
│   │   ├── immersive.js
│   │   ├── hdr.js
│   │   └── vr.js
│   ├── spotify/
│   ├── youtube-music/
│   ├── soundcloud/
│   ├── twitch/
│   ├── vimeo/
│   ├── netflix/
│   ├── instagram/
│   └── facebook/
│
├── engines/
│   ├── video/                  ← absorbs today's ambientlight.js pieces
│   │   ├── frame-sampler.js
│   │   ├── color-extractor.js
│   │   ├── zone-manager.js
│   │   ├── ambilight.js        ← the classic player-relative effect
│   │   ├── black-bars.js       ← was bar-detection.js
│   │   └── static-frame.js     ← was static-image-detection.js
│   ├── audio/
│   │   ├── source.js           ← media-element OR tab-capture
│   │   ├── analyser.js
│   │   ├── frequency-data.js
│   │   └── beat-detection.js
│   ├── artwork/
│   │   ├── palette-from-image.js
│   │   └── artwork-observer.js
│   ├── hybrid/
│   │   ├── compositor.js
│   │   └── effects/*.js
│   ├── smart-modes/
│   │   ├── rules-engine.js
│   │   └── default-rules.js
│   └── rendering/
│       ├── webgl-projector.js  ← was projector-webgl.js
│       ├── canvas-projector.js ← was projector-2d.js
│       ├── shadow-projector.js ← was projector-shadow.js
│       ├── canvas-webgl.js     ← unchanged
│       └── css-overlay.js
│
├── visualizers/
│   ├── spectrum.js
│   ├── waves.js
│   ├── circular.js
│   ├── particles.js
│   ├── liquid.js
│   └── minimal.js
│
├── settings/
│   ├── schema.js               ← version + migrations
│   ├── storage.js              ← chrome.storage wrapper (unchanged role)
│   ├── sync-storage.js
│   ├── presets.js              ← new
│   ├── profiles.js             ← new (per-platform)
│   └── defaults.js
│
├── popup/                      ← new: extension action popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
│
├── options/                    ← replaces existing options.html
│   ├── options.html
│   ├── sections/*.js
│   └── options.css
│
├── diagnostics/                ← new: user-facing engine state
│   ├── panel.js
│   └── report.js
│
├── shared/
│   ├── messaging/              ← current libs/messaging
│   ├── events/
│   ├── types/                  ← JSDoc typedefs
│   └── utilities/              ← current generic.js split into pieces
│
└── manifest.json
```

## Key seams

### Adapter seam
- Adapters produce **only** `MediaSession` values and `MediaChange` events
- Adapters never touch the renderer, never read `chrome.storage.settings`, never know about presets
- Adapters may add site-specific *capability hints* (`capabilities.audioAnalysis = false` if the site's media is CORS-blocked)

### Engine seam
- Engines accept normalised input; they emit palette / frequency / intensity values
- Engines do not import from `src/platforms/*` at all — enforcement via ESLint rule to be added in Phase 1

### Rendering seam
- Renderer takes a target canvas + input data
- Renderer is stateless about media — it knows nothing about adapters or session

### UI seam
- Popup + Options talk to the content runtime via `chrome.runtime.sendMessage` only
- Popup never reaches into the page's DOM directly

## Cross-browser strategy

The upstream code already detects Chromium vs Firefox via `getBrowser()` in `utils.js`. Preserve and extend that:

| Feature | Chromium | Firefox | Fallback |
|---------|----------|---------|----------|
| `chrome.storage` | ✅ | ✅ (`browser.storage`) | n/a |
| `chrome.tabCapture` | ✅ | ❌ | HTMLMediaElement + CORS only |
| `chrome.action` | ✅ | ✅ (`browser.action`) | n/a |
| Optional permissions | ✅ | ✅ (grant flow differs) | Degrade to always-on host permissions if user grants |
| Media Session API | ✅ | ✅ | n/a |
| Web Audio `AnalyserNode` | ✅ | ✅ | n/a |

A build-time branch (`BUILD_TARGET=firefox|chromium`) is acceptable if needed for tab-capture gating.

## Extension identity in the fork

- **Keep the same extension IDs** in every browser store if at all possible, so existing installs upgrade rather than orphan.
- **Rename progressively** — the store listing can be updated in Phase 8 while the extension ID stays.
- **Preserve ISC licence header + upstream attribution** — see `LICENSE` and the `author` field in `manifest.json`.

## Why we do NOT use a framework (React/Vue/Svelte)

- Popup is a small form; Options is a form.
- The current build (Rollup + Babel + Sass) already produces small IIFE bundles that work inside the browser's extension sandbox without a runtime.
- Adding a framework would grow the popup bundle for no user-visible win. If we ever need one for the Options page specifically, we can add it there only — not to the content scripts.

## Why we do NOT use TypeScript (yet)

- Upstream code is plain JS with an established shape.
- Migration to TS would touch every file for zero functional benefit.
- JSDoc + a `types/` typedef folder gives most of the type-safety benefit without a build-pipeline change. Revisit in a later phase if scale warrants.
