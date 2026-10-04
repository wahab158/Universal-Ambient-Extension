# 02 — Scope

This document defines what the project commits to across the current product arc, and — as importantly — what we deliberately do *not* build yet.

## In-scope for the full product

The complete product is organised around **six functional systems**. Every feature in [03-features.md](./03-features.md) belongs to exactly one system.

| System | Name | Status at fork | Delivered by phase |
|--------|------|----------------|--------------------|
| **A** | Universal Video Ambience | YouTube-only today | Phase 2 |
| **B** | Audio Visualizer Engine | Greenfield (0 code exists) | Phase 3 |
| **C** | Hybrid Effects Engine | Greenfield | Phase 4 |
| **D** | Album Artwork Ambience | Greenfield | Phase 3 |
| **E** | Smart Media Modes | Greenfield (implicit YouTube-only behaviour) | Phase 5 |
| **F** | Presets & Customisation | Flat settings exist; no preset or profile model | Phase 5 |

Nine target platforms, in the tier order they enter:

- Tier 1: **YouTube** (foundation — already works, must keep working)
- Tier 2 (music): **YouTube Music → Spotify → SoundCloud**
- Tier 3 (video): **Vimeo → Twitch**
- Tier 4 (social feeds): **Instagram → Facebook**
- Tier 5 (experimental): **Netflix**

## Delivery model

Full product scope ≠ shipping everything at once. It means:

- We design the full architecture up-front (this folder).
- We build and validate it **in controlled milestones**. Each milestone must produce a working, testable extension — not a stack of unfinished modules.
- Every phase's Definition-of-Done is written in [11-testing-acceptance.md](./11-testing-acceptance.md).

## Explicitly out-of-scope for now

These belong to the product's future arc, not its initial releases. We architect so they *can* be added, but we do not build them.

| Out-of-scope | Handling |
|--------------|----------|
| **Ambient Control Bar** (floating overlay UI) | Design the media-session + command interfaces so a control bar could consume them later. Do **not** implement the bar. Do not duplicate media detection into it. |
| **Desktop companion app** | Deferred. The extension remains self-sufficient. |
| **External RGB lighting** (Philips Hue, Govee, nanoleaf, Adalight, etc.) | Deferred. Requires its own product spec, permission model, and pairing UX. |
| **Mobile / tablet support** | Not viable — Firefox for Android has a limited extension surface; Safari iOS is a different project. |
| **Cloud service / accounts / sync server** | The existing browser-account cloud import/export is sufficient. |
| **Analytics / telemetry beyond crash reports** | Never. Existing opt-in Sentry crash reporting is preserved; we do not add product analytics. |
| **Rewriting the renderer** | The existing WebGL projector (`projector-webgl.js`) and Canvas fallback (`projector-2d.js`) are retained. |
| **Migrating to TypeScript / React / Vite** | Build pipeline stays Rollup + Sass + npm-run-all. See Cardinal rule #2 in [README](./README.md). |
| **Subtitles, translation, ad-blocking, downloaders** | Different product. Not a feature here. |

## Deferred but architecturally compatible

The plan must not paint us into a corner on these — they should become possible without re-architecture.

- Preset marketplace or sharing (JSON import/export path already exists)
- Per-site override profiles that live in a future user account
- Ambient Control Bar (floating, OS-level)
- A desktop companion that consumes local IPC from the extension
- Screen-wide ambience (not just page-level) on desktop — requires native-messaging permission

## Scope per milestone (summary; details in [06-roadmap.md](./06-roadmap.md))

| Milestone | Ships | Scope |
|-----------|-------|-------|
| **0** | Internal build | Repository audit, capability matrix, dependency map, baseline perf test. No user-visible changes. |
| **1** | Working fork | Universal media core. YouTube still works exactly as before, but through the new `MediaSession` abstraction. Diagnostics view added. |
| **2** | Universal Video | Video Ambience on YouTube + a generic video adapter. Vimeo + Twitch validated as Tier-3 early proof. |
| **3** | Music | Audio engine + all six visualizers + artwork ambience. YouTube Music, Spotify, SoundCloud. |
| **4** | Hybrid | Effects that combine video/audio. Composable effects engine. |
| **5** | Customisation | Presets, per-platform profiles, Smart Media Modes, advanced settings. |
| **6** | Social | Instagram + Facebook, active-player selection, multiple simultaneous media. |
| **7** | Netflix experiment | Honest compatibility report + any viable integration. |
| **8** | Release | Cross-browser, memory-leak audit, long-session, performance benchmarking, store prep. |

## Decision log (locked)

| Decision | Choice | Alternative rejected | Reason |
|----------|--------|--------------------|--------|
| Product architecture | One shared core + platform adapters | Nine forks / nine isolated codebases | Reuse; single UX; single release cadence |
| Existing Ambilight | Preserve, wrap, do not replace | Rewrite in a fresh renderer | Proven; ships to real users today |
| Rendering | Reuse WebGL; add Canvas 2D + shaders as needed | Adopt Three.js / PixiJS | Adds bundle weight we don't need |
| Audio | Separate engine + shared normalised frequency data | Analyser per visualizer | Cost, determinism, testability |
| Hybrid | Dedicated compositional engine | Every effect duplicates audio/video lookups | Composability; new effects without duplicating plumbing |
| Settings | Versioned schema + global defaults + per-platform overrides | Flat settings + hard-coded behaviour | Migration is a product requirement |
| Permissions | Least privilege; optional host permissions | Broad `<all_urls>` install | Trust, review, store policy |
| Desktop bar | Not built now | Build it as a UI surface for everything | Duplicates detection/analysis if not architected carefully |
| Build tooling | Retain Rollup + Sass initially | Migrate to Vite + React + TS | No user-visible win justifies the churn |
| AI / ML | None | Scene detection / colour suggestion | Latency, cost, no real user need |
| Extension identity | Fork retains upstream attribution | Silently rebrand | Licence obligations (ISC), community trust |

## Non-negotiable release constraints

Every phase must satisfy all of these before merging:

1. **YouTube functionality is intact.** No regression to existing users.
2. **No new permission is added to the manifest without a written justification** in [10-performance-security.md](./10-performance-security.md).
3. **Frame and audio sampling stop when paused, ended, or the tab is hidden.**
4. **No memory growth in a 60-minute session** with playback running.
5. **No uncaught exceptions leak into the host page's console.** Existing error wrapper is preserved.
