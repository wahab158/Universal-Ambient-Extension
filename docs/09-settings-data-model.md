# 09 — Settings & Data Model

## Reality of what exists today

`settings.js` (2,190 LOC) + `settings-config.js` (917 LOC, ~100 fields) is the existing settings system:

- Declarative config array with types: `checkbox`, `list`, `section`, plus `advanced`, `experimental`, `new` flags.
- Defaults are inline.
- Persistence is flat: `chrome.storage.sync` and `chrome.storage.local` (see `storage.js` + `sync-storage.js`).
- Import / export exists (JSON file + browser-account cloud).
- **No schema version number.** No migration path. If we rename a field today, users lose that value on next sync.

That last point is the biggest data-model debt to fix in Phase 1.

## Versioned schema

Every settings blob gains a `version` field. Migrations are pure functions from `v → v+1`, applied in order at load time.

```js
// settings/schema.js
export const SCHEMA_VERSION = 2;

export const migrations = {
  1: upgradeFromUpstreamV1,   // upstream youtube-ambilight → v1 (add version + wrap)
  2: upgradeFromV1ToV2,       // add audio, presets, platformProfiles
};
```

**Rule:** every field that ships to a user becomes permanent until a migration explicitly retires it. Renames are always additive + migration function, never in-place.

## Conceptual settings shape

Illustrative — the actual field list is derived by combining the ~100 upstream fields with the new universal ones.

```js
UniversalSettings {
  version: 3,

  // master state
  enabled: true,
  mode: "video" | "audio" | "hybrid" | "off",
  placement: {
    video:  "around" | "background" | "both",
    audio:  "around" | "overlay"    | "both",
  },

  // performance
  performance: {
    profile:             "quality" | "balanced" | "efficient",
    maxFps:              60,
    samplingResolution:  100,           // % of native video resolution
    preferWebGL:         true,
    energySaver:         true,
    reduceMotion:        false,          // mirrors prefers-reduced-motion
  },

  // Video Ambience (System A)
  video: {
    enabled: true,
    blur: 12, spread: 40,
    brightness: 100, saturation: 100,
    smoothing: 60,
    edges: { top: 100, right: 100, bottom: 100, left: 100 },
    colourSource: "video" | "artwork" | "manual" | "gradient",
    manualPalette: ["#hex", "#hex", "#hex"],
    debandingBlendMode: "lcd" | "oled",
    blackBarHandling: "auto" | "off",
    ...   // existing per-edge strength, gradient options, video scale,
          // frameSync, immersiveMode etc. all preserved verbatim
  },

  // Audio Visualizers (System B)
  audio: {
    enabled: true,
    visualizer: "spectrum" | "waves" | "circular" | "particles" | "liquid" | "minimal",
    sensitivity: 60,
    smoothing:   50,
    frequencyRange: [20, 20000],
    animationSpeed: 100,
    density: 60,
    position: "around" | "overlay",
    source: "media" | "tabCapture",       // may be forced by capability
    visualizerOptions: {                  // per-visualizer sub-object
      spectrum: { orientation: "vertical", barCount: 60, mirrored: false, peakHold: true },
      circular: { radius: 120, segments: 64, artworkInside: true },
      particles: { count: 400, trails: 30, glow: 50 },
      liquid:   { speed: 60, amplitude: 50 },
      waves:    { count: 3, thickness: 2, glow: 20 },
      minimal:  { thickness: 1 },
    },
  },

  // Hybrid (System C)
  hybrid: {
    enabled: false,
    effects: [                            // composable list, order = draw order
      { type: "audio-reactive-ambilight", intensity: 60 },
      { type: "edge-pulse",               intensity: 40 },
    ],
  },

  // Artwork (System D)
  artwork: {
    enabled: true,
    paletteFrom: "artwork" | "video" | "manual",
    expandToBackground: true,
    backgroundBlur: 30,
    detectTrackChanges: true,
  },

  // Smart modes (System E)
  smartModes: {
    enabled: true,
    rules: [
      { when: { type: "video", state: "playing" }, then: { mode: "video", preset: "cinema" } },
      { when: { type: "audio" },                    then: { mode: "audio", visualizer: "spectrum" } },
    ],
    manualOverrideSticky: true,
  },

  // Presets & profiles (System F)
  activePresetId: "preset:cinema",
  presets: {
    "preset:cinema":    { id, name, snapshot, builtIn: true },
    "preset:custom-01": { id, name, snapshot, builtIn: false, createdAt, updatedAt },
  },
  platformProfiles: {
    youtube:      { presetId: "preset:cinema" },
    spotify:      { presetId: "preset:music" },
    twitch:       { presetId: "preset:immersive" },
    instagram:    { presetId: "preset:minimal" },
  },

  // Diagnostics
  diagnostics: {
    showFPS: false, showFrametimes: false, showResolutions: false,
    showBarDetectionStats: false,
  },

  // Telemetry (preserved from upstream, unchanged semantics)
  crashOptions: {
    video: false, technical: false, crash: true,   // per-field consent
  },
}
```

## Storage layout (what goes where)

Chrome extension storage has hard size limits (`chrome.storage.sync`: 8 KB / item, 100 KB total). We split deliberately.

| Data | Backend | Reason |
|------|---------|--------|
| Master enable, active mode, active preset ID | `storage.sync` (small object) | Cross-tab + cross-device on same browser account |
| Full settings snapshot (may exceed 8 KB / item) | `storage.local` | Large; not needed across devices |
| Presets list (potentially big) | `storage.local` | Growth-prone; not for sync |
| Per-platform profiles | `storage.local` (keyed by platform) | Growth-prone |
| Recent diagnostics ring buffer | in-memory only, never persisted | Avoid write churn |
| Crash-report consent flags | `storage.sync` | Small + must survive |
| Cache (artwork palette, last-frame palette) | `storage.session` or in-memory | Never persisted long |

## Migration function contract

```js
/**
 * @param {any} oldData
 * @returns {any} newData  (must include `version` equal to next integer)
 */
function upgradeFromV1ToV2(oldData) { ... }
```

Rules:
- **Pure.** No I/O, no side effects, no assumptions about storage layout.
- **Additive.** Every existing field must survive. If a field is deprecated, it stays in the shape with a `deprecated: true` marker and the migration does not remove it.
- **Tested.** Every migration ships with a unit test round-tripping a real stored blob (frozen example) from `v → v+1`.

## Preset data shape

A **preset** is a snapshot of every engine + effect + placement setting *except* master enable and diagnostics. It's a diff from the built-in baseline.

```js
Preset {
  id: "preset:cinema" | user-generated UUID,
  name: "Cinema",
  builtIn: true,
  description: "Wide, soft video ambience",
  snapshot: {
    mode: "video",
    placement: {...},
    performance: {...},
    video: {...},
    audio: {...},
    hybrid: {...},
    artwork: {...},
    smartModes: { rules: [...] },
    // NO: enabled, presets map, platformProfiles, diagnostics, crashOptions
  },
  createdAt, updatedAt,
  schemaVersion: 3,
}
```

Built-in presets are **reproducible code**, not seeded into storage. If we ever want to update "Cinema" defaults, we bump them in code and users get the update.

## Import / export format

Preserve the existing file + browser-account flow. Format is:

```json
{
  "kind": "universal-media-ambience.settings",
  "version": 3,
  "exportedAt": "2026-10-04T12:00:00Z",
  "settings": { /* full UniversalSettings blob */ }
}
```

If a user imports an upstream youtube-ambilight JSON, we detect the missing `kind` field and run the "upstream v0 → v1" migration path first.

## Migration compatibility table (upstream → fork)

| Upstream field | Where it lands in the new schema |
|----------------|----------------------------------|
| `webGL` | `performance.preferWebGL` |
| `resolution` | `performance.samplingResolution` |
| `framerateLimit` | `performance.maxFps` |
| `frameSync` | `video.frameSync` (semantics unchanged) |
| `energySaver` | `performance.energySaver` |
| `debandingBlendMode` | `video.debandingBlendMode` |
| `showFPS / showFrametimes / showResolutions / showBarDetectionStats` | `diagnostics.*` |
| `headerShadowSize / headerShadowOpacity / headerImagesOpacity` | `platformProfiles.youtube.header.*` — YouTube-specific, moves into the adapter |
| Every existing per-edge strength, colour, saturation, blur setting | `video.*` (unchanged semantics) |
| `advancedSettings`, section collapse state | Preserved as UI state (not part of preset snapshot) |

## Open data-model questions

1. Do we allow **per-site overrides that include engine internals** (e.g. "on Twitch, use higher FPS cap")? Or is per-site purely a preset-selector? Current plan: **preset-selector only** — keeps the model simple.
2. Are presets **portable across versions** (schema `v3` export on a `v2` install)? Answer: no — importing a newer-version preset on an older install shows an error asking to update.
3. Do we version the built-in presets themselves? Yes — every built-in has a `codeVersion` field; when a bump changes behaviour meaningfully, migration function upgrades users' *active reference* without changing custom presets.
