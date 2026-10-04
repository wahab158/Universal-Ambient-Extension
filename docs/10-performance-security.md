# 10 — Performance & Security

## Non-negotiable: performance is a product feature

The upstream README warns users explicitly that a GPU scoring below 1000 PassMark will experience stuttering. That warning was earned. Our job is to keep it *true* after adding audio, hybrid, and more platforms.

A visual extension that makes videos stutter is not a successful product.

## Performance policy (behaviour per situation)

| Situation | Expected behaviour |
|-----------|-------------------|
| Playing video | Sample at configured interval, not every frame |
| Playing audio | Analyse at controlled FFT rate |
| Paused | Stop sampling; fade effects out over ~200 ms |
| Buffering | Reduce to idle state (no sampling, dim overlay) |
| Ended | Stop engines, release overlay |
| Static video (near-zero frame diff) | Drop to 1 fps — existing `energySaver` path |
| Tab hidden | Lower processing profile; consider full pause after 30 s |
| Fullscreen enter / exit | Resize render surface atomically; no visible flash |
| Player removed | Dispose observers, canvases, WebGL contexts, AudioContext |
| Multiple `<video>` on page | Prioritise the active session; do not sample all |
| Low-resource device | Efficient rendering profile (Canvas 2D, fewer zones, lower FPS) |
| Reduced-motion OS preference | Default preset to lower-intensity mode |
| Extension disabled | Zero ongoing CPU / GPU / memory activity |

## Initial engineering targets

To be measured on a defined test hardware tier (see Testing plan):

| Metric | Capable hardware (Tier A) | Mid hardware (Tier B) | Low hardware (Tier C) |
|--------|--------------------------|----------------------|----------------------|
| Video Ambience FPS | 60 | 60 | 30 |
| Audio visualizer FPS | 60 | 60 | 30 |
| Hybrid FPS | 60 | 45 | 30 |
| CPU cost (idle media) | 0 % | 0 % | 0 % |
| CPU cost (playing) | ≤ 5 % one core | ≤ 10 % one core | ≤ 15 % one core |
| GPU cost (playing) | ≤ 8 % | ≤ 15 % | ≤ 25 % |
| Memory after 60 min | Stable | Stable | Stable |
| Time to first ambience frame after play starts | < 100 ms | < 150 ms | < 250 ms |

Definitions of the tiers are in [Testing & Acceptance](./11-testing-acceptance.md).

## Hard rules

- **No continuously running analyser when idle.** Both `AnalyserNode` and the video sampler must stop when `state !== 'playing'`.
- **No accumulating event listeners.** Every `addEventListener` has a matched `removeEventListener` on session teardown. Enforced via ESLint rule (added in Phase 1).
- **No accumulating WebGL contexts.** Every canvas allocated for a session is `loseContext()`'d when the session ends. Chrome limits simultaneous contexts.
- **Fast activation and clean deactivation.** Master toggle must complete within 16 ms (one frame). Any cleanup work that cannot fit into 16 ms is deferred and shown as "turning off…" in the UI.
- **Graceful degradation.** WebGL unavailable → Canvas 2D. Audio capture blocked → visualizer option hidden. Frame sampling blocked → gradient fallback.

## Sampling budget

Given the existing `resolution` setting (6.25 % → 400 %), each quality profile maps to a hard budget:

| Profile | Sampling resolution | Framerate cap | Zones | Effects enabled |
|---------|--------------------|--------------|-------|----------------|
| Quality | 200 % | 60 | 4-way multi-zone | All WebGL effects, liquid shaders |
| Balanced | 100 % | 60 | 4-way | WebGL projector + standard visualizers |
| Efficient | 50 % | 30 | 2-way | Canvas 2D projector, minimal + waves visualizers |

Users can override any individual field — profiles are shortcuts, not locks.

## Security & privacy requirements

### Data processing rule
**Everything local, everything ephemeral.** Video frames, audio samples, colour palettes, frequency data — all computed in-page and never leave the browser tab.

### Network behaviour
- The extension makes **no** network requests except:
  - Sentry crash reports (opt-in, per-field consent, anonymous, 30-day retention)
  - User-initiated preset/settings import from a file
  - User-initiated browser-account cloud sync (`chrome.storage.sync` — the browser's own infrastructure, not ours)

### Permissions inventory

Current manifest requests exactly one permission: `storage`. Every new permission requires a written justification below.

| Permission | Justification | Blocking / optional | Chrome only? | Phase added |
|-----------|--------------|--------------------|-------------|-------------|
| `storage` | Existing — persists settings, presets, sync state. | Blocking | No | Existing |
| `activeTab` | Allow ambience on the tab the user is currently on, without pre-declaring broad hosts. | Blocking | No | Phase 1 (once we broaden hosts) |
| `host_permissions` per platform | Content scripts must run on the site to see the media element. | Blocking for enabled platforms | No | Phase 2, 3, 6, 7 |
| `optional_permissions: tabCapture` | Audio analysis where CORS blocks `MediaElementSource`. **User must explicitly enable per site.** | Optional | **Yes (Chromium only)** | Phase 3 |
| `tabs` | Popup needs to know the current tab's platform to show correct capabilities. | Blocking | No | Phase 1 |
| *(not needed)* `scripting` | We already inject via manifest `content_scripts`. | — | — | — |
| *(rejected)* `<all_urls>` | Broad host access we do not need. Rejected — see Cardinal rule #5 in README. | — | — | — |

### Rejected permissions (with reasons)

- `browsingHistory` — not needed, we don't recommend, we don't profile
- `bookmarks` — not a feature
- `<all_urls>` — we prefer per-site host permissions so the user can see exactly what we reach

### User-supplied code

- **Never** execute code supplied by a webpage. The extension's page-world contact is strictly via `injected.js`'s postMessage protocol; every message is validated against a known set of types before it is trusted.
- Import / export uses JSON parsing only, no dynamic module loading.
- Preset snapshots are validated against the schema before application.

## Message validation contract

Every message between extension contexts must:

1. Declare a `type` from a closed list defined in `shared/messaging/types.js`.
2. Include the sender's context id (or `chrome.runtime.id` when cross-context).
3. Be validated by a schema check before it is trusted (JSDoc + a runtime check).
4. Never carry a raw function reference or evaluated code.

## DRM & protected media

We do not attempt to bypass DRM. Specifically:

- Netflix, Prime Video, Disney+, Hulu and any other Widevine / PlayReady site are **experiment territory** — Phase 7 documents what actually works.
- If the browser returns black or frozen frames from `drawImage(videoElement)`, we treat that as `capabilities.videoFrameSampling = false` and honestly reflect it in the UI.
- Audio capture on DRM sites is often blocked the same way; we detect at runtime and report.
- Fallbacks in priority order: **artwork palette → manual palette → gradient → "not supported for this site"**.

## Cross-origin & CORS constraints

- `HTMLMediaElement` served from a different origin is **silently un-analysable** by Web Audio (returns zeroed FFT data) unless the element has `crossorigin` and the server sends `Access-Control-Allow-Origin`.
- We do not proxy audio or rewrite CORS headers. That would be a different product with a very different privacy stance.
- Fallback for music sites is `tabCapture` on Chromium (requires user gesture + `tabCapture` permission), or explicit "not supported on Firefox for this site" reporting.

## Privacy policy delta (from upstream)

The upstream [PRIVACY-POLICY.md](../PRIVACY-POLICY.md) remains valid for anything not listed here. The following new clauses must be added before Phase 3 ships:

- **Tab audio capture** — if enabled, audio is processed locally in an `AnalyserNode`; no samples are stored, transmitted, or persisted. Capture starts only after an explicit user gesture on the site. Capture stops on pause, tab hide, and master toggle.
- **Per-platform detection** — the extension identifies the current site to apply per-platform profiles. This identification never leaves the browser.
- **Preset contents** — a preset export is a JSON file the user controls. We do not upload presets.

## Audit cadence

Every Phase 8 release includes:

- A dependency audit (`npm audit`) with zero high/critical vulnerabilities.
- A permission review — every declared permission has a justification in this document.
- A privacy diff against the previous release.

## Reduced-motion & accessibility

- `prefers-reduced-motion: reduce` disables high-amplitude effects (particles, liquid, strong pulses) by default. Users can re-enable per-platform.
- The extension itself must not add flashing / rapid strobing content that could trigger photosensitive responses. Any "beat pulse" effect has a user-visible cap of 4 Hz regardless of BPM.
- Diagnostics view is high-contrast, keyboard-navigable, and screen-reader labelled.
