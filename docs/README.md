# Universal Media Ambience — Project Documentation

> Working name. Rebrand from *YouTube Ambilight* to a universal browser media enhancement built on top of the existing fork foundation (see the `LICENSE` and README tribute for attribution).

This folder is the **single source of truth** for what we are building, why, and in what order. It is written to be re-read before every implementation session so the codebase and the plan stay in lockstep.

## Reading order

| # | File | Answers |
|---|------|---------|
| 01 | [Product Vision](./01-product-vision.md) | What we are building, who it is for, what "good" looks like |
| 02 | [Scope](./02-scope.md) | What is in, what is out, what is explicitly deferred |
| 03 | [Features](./03-features.md) | Every feature by system (A–F), and whether it is *new* or *preserved* |
| 04 | [Platforms](./04-platforms.md) | The nine target sites, the adapter contract, and the phased order |
| 05 | [UI / UX Plan](./05-ui-ux.md) | Popup, options page, in-player controls, presets, themes |
| 06 | [Roadmap & Milestones](./06-roadmap.md) | Phase 0 through 8, what each one must ship |
| 07 | [Current Codebase Audit](./07-current-codebase.md) | What already exists in the fork — **read before touching code** |
| 08 | [Target Architecture](./08-architecture.md) | Layered design: adapters, core, engines, rendering, storage |
| 09 | [Settings & Data Model](./09-settings-data-model.md) | Versioned schema, storage layout, preset shape, migrations |
| 10 | [Performance & Security](./10-performance-security.md) | Budgets, permissions model, privacy rules, DRM constraints |
| 11 | [Testing & Acceptance](./11-testing-acceptance.md) | What "done" means per milestone; test matrix |

## Cardinal rules for contributors

1. **Do not rewrite what works.** The existing Ambilight renderer, black-bar detection, WebGL projector, and settings pipeline are production-quality and shipped to hundreds of thousands of users. Extend, wrap, adapt — do not replace.
2. **Do not migrate to TypeScript, React, or Vite for stylistic reasons.** The original build pipeline (Rollup + Sass + npm-run-all) is retained until a concrete requirement justifies a change. The plan's TypeScript contracts are *illustrative interfaces*, not a language mandate.
3. **Every platform must go through an adapter.** No `if (window.location.host === 'spotify.com')` sprinkled across engines. Adapters translate site-specific DOM into a shared media-session contract.
4. **No silently-broken controls.** If a platform does not support an effect, the UI must show that — the popup must reflect *actual available modes*, not a universal ideal set.
5. **Least privilege.** Every new permission (especially audio capture) requires a written justification in [Performance & Security](./10-performance-security.md) before it enters the manifest.
6. **Preserve original licence + attribution.** This is a fork of an ISC-licensed project. Every published artefact retains upstream attribution.

## Status

| Track | Status |
|-------|--------|
| Product spec signed off | ✅ Yes (see this folder) |
| Phase 0 code audit | ⏳ Pending — first implementation milestone |
| YouTube functionality preserved | ✅ Yes (this is the fork's starting state) |
| Universal media core | ⏳ Not yet designed in code |
| Audio engine | ⏳ Greenfield — nothing exists yet |
| Non-YouTube platform adapters | ⏳ Greenfield |
| Hybrid engine, Smart Modes, Presets | ⏳ Greenfield |
| Ambient Control Bar / desktop companion | 🚫 Explicitly deferred — future phase |

## Open decisions to close in Phase 0

- Confirm the renderer's dependency surface on YouTube's DOM (list every selector in `content-main.js` + `ambientlight.js`) so we know the exact size of the abstraction seam.
- Choose how the popup relates to the existing in-player menu: replace it, coexist with it, or use the popup as a launcher that opens the in-player menu.
- Decide the extension identity: rename / rebrand / keep two extensions (upstream + fork) side-by-side during transition.
