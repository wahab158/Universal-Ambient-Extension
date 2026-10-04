# 11 — Testing & Acceptance

This document defines what "done" means for every milestone and every feature area. No phase ships without satisfying its acceptance criteria.

## Definition of Done per phase

| Phase | Done means |
|-------|-----------|
| **0** | Written audit exists, YouTube DOM touch-points inventoried, capability matrix filled for YouTube, baseline perf recorded on all three hardware tiers, minimum test harness works (`npm test` green). |
| **1** | Extension still works identically on YouTube. `MediaSession` abstraction in place. `YouTubeAdapter` module exists. Diagnostics view shows current session. |
| **2** | Video Ambience works on YouTube, Vimeo, Twitch (all Tier-1 + Tier-3 platforms). Generic HTML5-video adapter proven. No regression on YouTube. |
| **3** | All six visualizers work on at least YouTube Music, Spotify, SoundCloud on Chromium. Firefox parity documented honestly (which sites degrade). Tab-capture UX flow working. |
| **4** | Hybrid mode selectable and working on every supported site. Composable effects API stable. Adding a hybrid effect requires no engine changes. |
| **5** | Presets and platform profiles persist, export, import, migrate. Smart modes rules fire correctly. Advanced settings surface complete. |
| **6** | Instagram + Facebook active-player selection works on real feed scrolling. Multi-media-element lifecycle stable. |
| **7** | Netflix report written. If any feature works, it's shipped; if none, capability flags say so and UI hides effects for that platform. |
| **8** | Cross-browser tested. No memory growth in 60-min session. Store listings prepared. Migration from upstream verified. |

## Feature-area acceptance

| Area | Acceptance criteria |
|------|--------------------|
| YouTube | Existing Ambilight settings and behaviour remain functional after every phase |
| Video engine | Correctly handles video replacement, resizing, fullscreen enter/exit, SPA navigation |
| Audio engine | Visualizers react to actual playback without disrupting the audio output itself |
| Artwork | Palette changes correctly when artwork changes |
| Hybrid | Video/artwork colours and audio intensity combine correctly; effect list is stable |
| Social feeds | Active-video selection follows scrolling and playback changes |
| Presets | Save, load, duplicate, rename, export, import, migrate |
| Performance | No persistent rendering or memory growth when disabled |
| Permissions | Only necessary access is requested; new permissions have a written justification in [Performance & Security](./10-performance-security.md) |
| Recovery | Failed capture or renderer init does not break media playback on the page |

## Test matrix (minimum)

Every phase touches at least the relevant subset:

| Scenario | Video | Audio | Hybrid |
|----------|:-----:|:-----:|:------:|
| Play / pause / resume | ✅ | ✅ | ✅ |
| Seek forward / back | ✅ | ✅ | ✅ |
| Track change (new media session) | ✅ | ✅ | ✅ |
| Buffering then resuming | ✅ | — | ✅ |
| Ended → auto-next | ✅ | ✅ | ✅ |
| Multiple tabs with media playing | ✅ | ✅ | ✅ |
| Multiple media elements on one page | — | — | — (Phase 6) |
| Fullscreen enter | ✅ | ✅ | ✅ |
| Fullscreen exit | ✅ | ✅ | ✅ |
| Theatre mode (YouTube) | ✅ | — | ✅ |
| SPA navigation without page reload | ✅ | ✅ | ✅ |
| Hidden tab (background) | ✅ | ✅ | ✅ |
| Tab re-shown | ✅ | ✅ | ✅ |
| Audio capture permission failure | — | ✅ | ✅ |
| Cross-origin / embedded video | ✅ | — | ✅ |
| WebGL unavailable → Canvas 2D fallback | ✅ | ✅ | ✅ |
| Long playback session (60 min) | ✅ | ✅ | ✅ |
| Settings migration from upstream | ✅ | ✅ | ✅ |
| Extension disabled mid-playback | ✅ | ✅ | ✅ |
| Popup opened while media playing | ✅ | ✅ | ✅ |

## Hardware test tiers

| Tier | CPU | GPU | RAM | Represents |
|------|-----|-----|-----|-----------|
| **A** | 8+ cores modern | Discrete / high-end integrated (PassMark ≥ 3000) | 16 GB | Enthusiast |
| **B** | 4–6 cores | Integrated (PassMark 1000–3000) | 8–16 GB | Mainstream laptop |
| **C** | 4 cores older | Low integrated (PassMark < 1000) | 8 GB | Minimum recommended |

At least one Tier-A and one Tier-C machine must run the full matrix before each release. Tier-B is the "happy path" reference — used to compare metrics against the budget in [Performance & Security](./10-performance-security.md).

## Browser test matrix

| Browser | Minimum version | Notes |
|---------|-----------------|-------|
| Chrome (stable) | 121 | Primary |
| Edge | 121 | Chromium parity — should just work |
| Opera | latest | Chromium parity; store listing exists upstream |
| Firefox | 121 | tabCapture unavailable — audio must degrade or use MediaElementSource when CORS allows |
| Brave | latest | Should behave as Chromium; verify shields don't break content-script injection |

## Automated test plan

Phase 0 must establish a minimum harness. Full plan:

```
tests/
├── unit/                     ← pure logic, no DOM (colour extraction math, migration fns, rules engine)
├── integration/              ← engines wired together with jsdom or happy-dom
├── platform/                 ← per-adapter fixture HTML files (YouTube DOM, Spotify DOM, etc.)
│   ├── youtube/
│   ├── spotify/
│   └── ...
├── rendering/                ← WebGL / Canvas snapshot tests (headless-gl or Playwright)
├── performance/              ← FPS / memory budgets run on a fixed scenario
└── e2e/                      ← Playwright + real Chrome extension loading, drives real sites
```

Test runner: not enforced in Phase 0; **Vitest + Playwright** is a reasonable default given the existing Rollup tooling and no framework requirement.

### Test gate per PR (post-Phase 1)

1. Lint passes (`eslint` via Rollup's plugin, already enforced at build time)
2. `npm run build` produces a loadable `/dist`
3. `npm test` green
4. Smoke test: Playwright loads the extension, opens a YouTube video, asserts `Ambientlight` initialised
5. Migration test: import an upstream JSON export → assert every field survives

## Manual test protocol (before every release)

For each of the nine platforms × each of the four performance profiles:

1. Load extension from unpacked `/dist`
2. Enable the default preset for that platform
3. Play a media item; measure FPS for 30 s
4. Pause for 10 s; confirm sampling fully stopped
5. Fullscreen enter and exit; confirm overlay resizes
6. Navigate to another media item in the same tab; confirm session swap
7. Switch to another tab for 60 s; return; confirm processing resumed correctly
8. Disable master toggle; confirm CPU returns to baseline
9. Re-enable; confirm effect recovers without page reload

Any failure blocks release.

## Performance regression gate

Each release compares against the previous one on Tier B:

- Sampling CPU cost — no more than +1 percentage point
- FPS during 1080p60 playback — no lower than previous release
- Memory after 30 min — no more than +5 MB
- Bundle size (post-build, uncompressed JS) — no more than +25 KB total

## Static-analysis gates

- ESLint (already enforced via `@rollup/plugin-eslint`)
- Zero `any` / `@ts-ignore` in JSDoc types
- No new `chrome.*` API call without an equivalent `browser.*` check in Firefox build branch
- No direct `document.querySelector` inside `src/engines/**` or `src/visualizers/**` (enforces the adapter seam)

## Documentation gate

Every phase's PR must update:
- This folder's docs where scope / architecture / features / roadmap changes
- `docs/07-current-codebase.md` file map after any file move
- CHANGELOG.md (to be created) — user-visible change summary

## Sign-off checklist per release

- [ ] All Phase N acceptance criteria met
- [ ] Test matrix scenarios run on at least Tier A and Tier C
- [ ] No memory leak in 60-min session
- [ ] All new permissions justified in [Performance & Security](./10-performance-security.md)
- [ ] Migration tests green from upstream v0 through current
- [ ] Store listing / description / screenshots updated
- [ ] Privacy policy diff reviewed against this folder
- [ ] Upstream attribution + ISC licence intact
