# 07 — Current Codebase Audit

**Read this before touching any code.** The point of this document is to prevent us from re-building anything that already exists.

## Repository identity

| Property | Value |
|----------|-------|
| Repo | `wahab158/Universal-Ambient-Extension` |
| Origin | fork of *YouTube Ambilight* (attribution preserved in `LICENSE` and README tribute) |
| Default branch | `develop` |
| Package version (as cloned) | `2.38.17` |
| Licence file | MIT (see `LICENSE`) |
| Minimum Chrome | 121 · Minimum Firefox | 121 |

Upstream's public Chrome / Edge / Firefox / Opera listing IDs are intentionally not carried into this fork; we will publish under our own listings when ready.

## File map (44 source files)

```
d:\Ambient\
├── package.json                       scripts + dev dependencies (no runtime deps)
├── rollup.config.js                   6 IIFE bundles: background, options, content,
│                                       content-main, injected, live-chat
├── manifest-copy.js                   build-time manifest processing
├── sourcemaps-copy.js                 Sentry sourcemap step
├── eslint.config.js
├── .env / .prettierrc / .npmrc / .vscode / .github
├── PRIVACY-POLICY.md · README.md · TROUBLESHOOT.md · FUNDING.yml · LICENSE
│
├── assets/                            readme images, browser icons, screenshots
│
└── src/
    ├── manifest.json                  MV3, minimal — see "Manifest reality" below
    ├── options.html                   import/export + crash consent only
    ├── images/                        icons, noise textures, donate
    │
    ├── styles/
    │   ├── content.scss    (3,450)    the in-page Ambilight styles
    │   ├── live-chat.scss    (129)
    │   └── options.css     (231)
    │
    └── scripts/
        ├── background.js     (17)     service worker: install/update + click-to-open-options
        ├── content.js       (263)     loader: injects CSS + `injected.js`, then dynamic-imports content-main
        ├── content-main.js  (472)     YouTube-aware orchestrator: builds Ambientlight
        ├── injected.js      (348)     page-context glue: theme, immersive, HDR, VR, Chromium bug workaround
        ├── live-chat.js      (35)
        ├── options.js       (324)     import/export + crash-consent handlers
        ├── intros/console.js (25)
        └── libs/
            ├── ambientlight.js       (3,924)  ★ the main renderer + lifecycle
            ├── projector-webgl.js    (1,693)  ★ WebGL Ambilight projector
            ├── projector-2d.js         (159)  ★ Canvas 2D fallback
            ├── projector-shadow.js     (274)  ★ shadow layer
            ├── canvas-webgl.js         (890)  OffscreenCanvas + WebGL context management
            ├── bar-detection.js      (1,801)  ★ black-bar detection (huge, working)
            ├── static-image-detection.js (361) energy-saver on static frames
            ├── settings.js           (2,190)  settings persistence + defaults
            ├── settings-config.js      (917)  ~100 fields, declarative config
            ├── storage.js              (140)  chrome.storage wrapper
            ├── sync-storage.js          (98)  cross-tab sync
            ├── theming.js              (319)  dark / light
            ├── stats.js              (1,221)  FPS / frametime / draw-time diagnostics
            ├── generic.js              (557)  event helpers, feature detection, watchSelectors
            ├── worker.js                (88)  Web Worker for background tasks
            ├── utils.js                 (79)  version + browser detection
            ├── errors/
            │   ├── ambient-light-error.js  (6)
            │   ├── dom.js                  (126)  DOM tree capture for Sentry
            │   ├── events.js               (104)
            │   └── sentry-reporter.js      (561)  opt-in crash reporting
            └── messaging/
                ├── content.js             (74)  page ↔ content
                ├── injected.js           (107)
                └── utils.js                (5)
```

## Runtime architecture today

Three-context model:

```
┌──────────────────────────────────────────────────────────┐
│  Page context (main world) — src/scripts/injected.js     │
│    · Talks to YouTube's yt-player internals               │
│    · setSize, getVideoData, HDR, storyboard format, VR    │
│    · Applies html[data-ambientlight-*] attributes         │
│    · Theme override, immersive mode, live-chat theme      │
└──────────────────────┬───────────────────────────────────┘
                       │ postMessage (messaging/injected.js)
┌──────────────────────┴───────────────────────────────────┐
│  Content-script isolated world —                          │
│    content.js         loader (styles + injected + main)   │
│    content-main.js    watches ytd-app, constructs Ambientlight │
│    libs/ambientlight.js  owns canvas layer + loop          │
└──────────────────────┬───────────────────────────────────┘
                       │ chrome.runtime messaging
┌──────────────────────┴───────────────────────────────────┐
│  Service worker — src/scripts/background.js (17 LOC)     │
│    · install/update hook → sets uninstall feedback URL    │
│    · action.onClicked → opens options.html                │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  Options page (open_in_tab: false) — options.html +       │
│  options.js: settings import/export, crash-report consent │
└───────────────────────────────────────────────────────────┘
```

**The settings UI is NOT a popup and NOT the options page.** It is injected as a button + dropdown **inside YouTube's player control bar** by `ambientlight.js`. The full ~100-field menu is built from `settings-config.js` and rendered into YouTube's DOM. `options.html` is only the auxiliary page for import/export + crash consent.

## Manifest reality (`src/manifest.json`)

```jsonc
"permissions": [ "storage" ],        // that's it
"content_scripts": [
  { "matches": ["https://www.youtube.com/*"], ... },
  { "matches": ["https://www.youtube.com/embed/*"], "all_frames": true, ... },
  { "matches": ["https://www.youtube.com/live_chat*"], ... }
]
"web_accessible_resources": [ styles/content.css, scripts/content-main.js,
                              scripts/injected.js, images/noise-*.png, donate.svg ]
```

**No `tabCapture`, no `activeTab`, no `host_permissions`, no optional permissions.** Everything else in the plan requires new permissions we do not have today.

## What already exists (preserve & extend)

| Area | What's there | Notes |
|------|-------------|-------|
| Video frame sampling | `ambientlight.js` reads the video element | Tightly coupled to `video.html5-main-video` selector |
| Colour extraction | Edge / multi-zone / dominant | In `projector-webgl.js` + `projector-2d.js` shaders |
| Rendering | WebGL + Canvas 2D + shadow | Mature, tunable via `resolution`, `framerateLimit` |
| Frame sync | 3 modes: Decoded / Display / Video | `frameSync` setting |
| Static-frame detection | Energy saver | `static-image-detection.js` |
| Black-bar detection | Sophisticated (1,801 LOC) | `bar-detection.js` |
| HDR / VR flags | Detected via `getVideoData().isHdr` | `injected.js` |
| Settings system | Declarative config, ~100 fields, advanced/experimental flags | `settings-config.js` + `settings.js` |
| Storage layer | `chrome.storage` wrapper + cross-tab sync | `storage.js` + `sync-storage.js` |
| Theming | Dark / light detection + apply | `theming.js` |
| Diagnostics | FPS, frametime graph, resolution, drawtimes, bar-detection stats | `stats.js` (1,221 LOC) |
| Error reporting | Sentry, opt-in, per-field consent | `errors/sentry-reporter.js` |
| Import / export | File + browser-account cloud | `options.js` |
| Build | Rollup → IIFE, Sass → CSS, npm-run-all orchestration | `package.json` scripts |
| Fullscreen / theatre / popup view handling | Enum `VIEW_*` in `generic.js` | YouTube-aware |
| Page transitions (SPA) | `yt-navigate-finish` listener | `content-main.js` |
| Detached-video recovery | MutationObserver-based | `content-main.js` `detectDetachedVideo` |

## What does NOT exist (greenfield)

| Missing | Where it will land |
|---------|--------------------|
| Any TypeScript or JSDoc typing | Optional — we keep `.js`, may add JSDoc only |
| Any non-YouTube platform | `src/platforms/<name>/` |
| Universal `MediaSession` abstraction | `src/platforms/base/media-session.js` |
| Any audio code (Web Audio, AnalyserNode, tab capture, PCM, FFT) | `src/engines/audio/` |
| Any visualizer (spectrum, waves, circular, particles, liquid, minimal) | `src/visualizers/*` |
| Album artwork colour extraction | `src/engines/artwork/` |
| Hybrid effects compositor | `src/engines/hybrid/` |
| Smart-mode rules engine | `src/engines/smart-modes/` |
| Preset data model (save/duplicate/rename/export/import) | `src/settings/presets/` |
| Per-platform profiles | `src/settings/profiles/` |
| Extension popup UI | `src/popup/` |
| Full options-page sidebar / sections | Rewrite of `src/options.html` + `options.js` |
| Capability reporting in UI | Popup + options |
| Test harness of any kind | `tests/` — Phase 0 minimum |
| Accessibility pass on the UI | Popup + options |

## YouTube DOM coupling inventory (Phase 0 must finalise)

Selectors currently hard-coded in `content-main.js` / `ambientlight.js` / `injected.js`:

```
ytd-app                                #content.ytd-app            #masthead-container
ytd-watch-flexy                        ytd-small-player            ytd-miniplayer
ytd-live-chat-frame                    ytd-shorts                 ytd-channel-video-player-renderer
video.html5-main-video                 .html5-video-player        .html5-video-container
.ytp-right-controls                    .ytp-chrome-controls       .ytp-settings-button (implicit)
#player .html5-video-player .html5-video-container video.html5-main-video   (embed page)
#player-api video.html5-main-video     yt-player-manager video.html5-main-video
#inline-preview-player video           ytd-browse video
.stefanvdvideotop                      (other extensions' fingerprint)
#player-control-container              (mobile player bail-out)
yt-navigate-finish                     (SPA event)
```

Every one of these must move into the YouTube adapter before we can honestly say "universal media core".

## Build pipeline reality

`npm run build` runs (via `npm-run-all`):

```
build:scripts:rollup               → 6 IIFE bundles via Rollup + Babel
build:scripts:sourcemaps:inject    → sentry-cli sourcemaps inject (release = 2.38.17)
build:scripts:sourcemaps:copy      → sourcemaps-copy.js
build:styles:content               → sass → dist/styles/content.css
build:styles:live-chat             → sass → dist/styles/live-chat.css
build:styles:options               → copy options.css
build:manifest                     → node manifest-copy.js
build:html                         → copyfiles options.html
build:images                       → copyfiles src/images/*
```

Node engine pinned to `22.5.1` via volta. Dev deps only: Rollup, Babel, Sass, ESLint, Sentry CLI, dotenvx. **No runtime npm dependencies** — the extension is self-contained.

## Practical implications for the fork

1. **`ambientlight.js` at 3,924 LOC is the risk.** It owns renderer + lifecycle + settings + stats + error pipeline. The first Phase-1 refactor must break this into cohesive pieces (session-manager, renderer, lifecycle) without behaviour change.
2. **The renderer's constructor signature today is `new Ambientlight(videoElem, ytdAppElem, ytdWatchElem, mastheadElem)`.** That's a YouTube-shaped API. Phase 1 must change it to `new AmbienceRenderer(mediaSession)`.
3. **`content.js` is a loader, `content-main.js` is the actual orchestrator.** Adding new platforms means adding new orchestrators (or one universal orchestrator + adapters). Do **not** overload `content-main.js` with if-by-host logic.
4. **`injected.js` is page-context and reaches YouTube's private player API.** This must not be shared across platforms — it becomes the YouTube adapter's "main world" companion.
5. **`stats.js` + `errors/*` are already generic.** They can be reused by new engines with minimal changes.
6. **Settings migration is a product requirement.** ~100 field names + their semantics are locked by what existing users have stored. Any rename needs a migration function in the versioned schema layer.
7. **Manifest changes ripple into extension identity.** Firefox uses strict_addon ID, Chrome uses the store ID. Changing the ID during the fork would orphan existing installs. Plan this consciously.

## Test / tooling current state

- ❌ No unit tests, no integration tests, no e2e harness
- ❌ No `npm test` script
- ✅ ESLint config exists and is enforced via `@rollup/plugin-eslint` at build time
- ✅ Prettier config exists (`.prettierrc`)
- ✅ GitHub Actions / CI exists in `.github/` (verify in Phase 0 what runs)

Phase 0 must add at least a smoke test: build → load unpacked → watch a YouTube video → confirm `Ambientlight` initialises.
