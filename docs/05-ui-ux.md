# 05 — UI / UX Plan

## Reality check on the current UI

Before designing the new surface, note what actually exists today in the fork:

| Surface | What it is today | What the plan proposes |
|---------|-----------------|----------------------|
| **Settings UI** | Injected as a button + dropdown menu **inside the YouTube video player** (added into `.ytp-right-controls`). Full settings live in `settings.js` + `settings-config.js`. | Move to the **extension popup** as the primary surface. Keep a slim **in-player toggle button** that opens the popup. |
| **Options page** (`options.html`) | Only import/export + crash-consent checkboxes. | Becomes the **full settings page** (sidebar, advanced controls, presets, platforms, diagnostics). |
| **Browser action click** (`background.js`) | Opens the current minimal `options.html`. | Opens the popup by default. |
| **Diagnostics** | Only in-page stats overlay (FPS, frametime graph). | In-page overlay **plus** a Diagnostics section inside the options page. |
| **Per-platform profiles** | Do not exist. | Options page has a Platforms tab with per-site overrides. |

This is the single biggest UX pivot in the fork. It must be introduced gradually so existing users do not lose their muscle-memory.

## UX principles

1. **Progressive disclosure.** Simple mode by default. Advanced settings behind a toggle. Never overwhelm on first open.
2. **Honest capability display.** If a site can't do audio visualizers, show that. Never silently no-op.
3. **Zero-click defaults.** Fresh install must produce a tasteful result on YouTube without any configuration — same as upstream today.
4. **Continuity across platforms.** Same popup structure on every site. Only contents change.
5. **Reversibility.** Every automatic action has a manual override, and every override has a "reset to preset" escape hatch.
6. **Calm visual language.** No flashy gradients, no "boosted" marketing copy. The extension is about ambient calm — the UI should reflect it.

## Layout: the popup

Compact (browser action). Purpose: **quick control + status**, not full configuration.

```
┌─────────────────────────────────────┐
│  Universal Media Ambience       ●●●  │  header + master toggle
├─────────────────────────────────────┤
│  Now playing                        │
│  YouTube · Video · Playing          │  platform + type + state chips
│  "Title of current video"           │
│                                     │
│  Capabilities: Video ✅  Audio 🟡   │  from MediaSession.capabilities
├─────────────────────────────────────┤
│  Visual mode                        │
│  ◉ Video   ○ Audio   ○ Hybrid  ○ Off│
├─────────────────────────────────────┤
│  Active effect                      │
│  [ Dynamic Ambilight         ▾  ]   │
├─────────────────────────────────────┤
│  Preset                             │
│  [ Cinema ▾ ]   [ Save as … ]       │
├─────────────────────────────────────┤
│  Intensity  ─────●─────────  75%    │
│  Performance  [ Balanced ▾ ]        │
├─────────────────────────────────────┤
│  Open settings →                    │
└─────────────────────────────────────┘
```

### Popup behaviour

- The **Visual mode** row hides any option the current platform's capabilities don't support.
- The **Active effect** row is populated by the Smart Media Modes engine (System E) unless the user overrides manually.
- The **Intensity** slider is a single global control that scales the currently active engine's overall amplitude, brightness, density together. Fine-grained control lives in the options page.
- If a capability is unavailable, we show a **status chip** explaining *why* (e.g. "Audio: unavailable — CORS blocked. Try tab capture (experimental)").
- Master toggle persists per-tab session (via existing `storage.sync`) *and* globally (via `storage.local`).

## Layout: the options page

Tabbed sidebar, opened from the popup or the browser action.

| Section | Contents |
|---------|----------|
| **General** | Master defaults, automatic modes, keyboard shortcuts, telemetry / crash consent |
| **Video Ambience** | Placement, blur, spread, edge lighting, colour sources (video / artwork / manual), fallback gradient |
| **Audio Visualizers** | All six visualizers with their own sub-panels; sensitivity, smoothing, frequency range, animation speed |
| **Hybrid Effects** | Composable effects that mix audio + video/artwork |
| **Presets & Themes** | Built-in and custom presets; save / duplicate / rename / export / import |
| **Platforms** | Per-site enable / disable, per-site preset overrides, per-site capability view |
| **Performance** | Quality profile, FPS cap, sampling resolution, GPU toggle (WebGL / Canvas 2D) |
| **Diagnostics** | Active media, engine state, recent errors, FPS graph, draw-time graph |
| **About** | Version, licence, privacy policy, upstream attribution, donate link |

## In-player / in-page controls

For continuity with upstream behaviour, YouTube retains a **single button in the player's control bar** (the existing pattern). It does not open the full menu — it opens the **popup** by simulating an action click.

Rationale: keeping a rich menu *inside* the player is a maintenance trap (the YouTube DOM breaks twice a year). The popup is a stable, one-place UI.

Non-YouTube platforms:
- **Spotify / YouTube Music** — a compact toggle button in the "now playing" bar footer.
- **Twitch / Vimeo** — a slim overlay button in the player's corner (positioned per adapter).
- **Netflix** — no in-page UI at all (to minimise any chance of ToS friction); user controls entirely via the popup.

## Interaction states

The UI reflects these media states across popup + in-page:

| State | Popup presentation |
|-------|-------------------|
| `playing` | Full colour, effects shown |
| `paused` | Effect preview dimmed, "Paused" chip |
| `buffering` | Effect dimmed, spinner |
| `ended` | Effect off, "Ended" chip, auto-fade |
| `idle` | Nothing shown; only "Enable" master toggle |
| no media detected | Popup shows "Go to a media site to begin." Nothing else. |

## Capability surfacing

This is critical — the popup must not lie. Concretely:

- Each effect entry has a **supported-for-this-platform** flag computed from `MediaSession.capabilities` × the effect's own dependency list.
- Unsupported entries appear **greyed with a tooltip explaining the missing capability** (or hidden if there are more than two unsupported in a group).
- The tooltip links to a "Why?" page in the options → Diagnostics section, describing the technical reason (e.g. "Audio: this site's `<audio>` element does not allow Web Audio analysis due to CORS. Tab capture is experimental — enable it from Settings → Platforms → Spotify.").

## Presets UI

Presets are user-facing names for a full settings snapshot.

- **Built-in presets** listed first: Cinema, Music, Immersive, Minimal, Aurora, Bass, Warm.
- **Custom presets** grouped by user name.
- Actions per preset: `Apply`, `Duplicate`, `Rename`, `Delete`, `Export`, `Import`.
- **Save current settings as preset** button — always visible in the preset section.
- Preset **scope** can be global or platform-specific (see Per-platform profiles below).

## Per-platform profiles

Users can override the global preset for a specific site without changing global defaults. Example:

- Global default: Cinema
- YouTube: Dynamic Ambilight + Cinema
- Spotify: Circular Spectrum, artwork background
- YouTube Music: Automatic Hybrid when a music video is playing
- Twitch: Stream Ambience + audio-reactive border
- Instagram: Minimal waveform for Reels

Profile precedence (highest wins):

```
Platform-specific override
     ↓
Session override (user manually picked something just now)
     ↓
Global default preset
     ↓
Built-in safe default
```

## Theme + visual style of the UI itself

- **Dark-first.** Matches the extension's aesthetic context (ambient light in a dim room). Light theme available as an option, but dark is default.
- **Compact typography.** Base 13 px.
- **Accent colour derives from active ambience.** The popup uses the current dominant colour from the video/audio palette as its accent — the UI subtly *is* the effect. Falls back to a neutral palette when no media.
- **No animations longer than 200 ms.** Everything in the UI chrome is fast; the fun animations are in the ambience layer, not the settings.
- **Icons over text where the meaning is obvious** (mode toggle: video/audio/hybrid/off icons).

## Accessibility

- Full keyboard navigation in popup + options.
- Every interactive element has an accessible name (`aria-label`).
- Colour-contrast ratio ≥ 4.5:1 for text.
- Focus ring visible on every control.
- Reduced-motion preference respected: if `prefers-reduced-motion`, ambient effects default to a lower-intensity preset (see [Performance & Security](./10-performance-security.md)).
- Popup is screen-reader friendly (semantic landmarks, not just div soup).

## What we are *not* building now (see [Scope](./02-scope.md))

- **Ambient Control Bar** (a persistent floating overlay). Architecturally compatible via `MediaSession` and command messages. Not implemented in initial releases.
- **Desktop companion app**.
- Any surface that duplicates detection or analysis outside the extension itself.

## Migration UX (existing YouTube Ambilight users)

Critical — upstream users must not feel ambushed by the new UI.

1. First launch after update shows a **welcome card** in the popup explaining the change.
2. In-player settings menu still works for **one release cycle** as an escape path.
3. All existing settings values migrate automatically via the schema versioning layer (see [Settings & Data Model](./09-settings-data-model.md)). Users' `outerStrength`, `resolution`, `frameSync`, `energySaver`, etc. all survive the fork.
4. If migration fails, `setWarning()` (already in `generic.js`) shows a friendly recovery hint pointing to the import/export path.
