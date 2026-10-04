# 01 — Product Vision

## Tagline

> **One extension. Multiple media platforms. Three visual experiences.**

## Definition

Universal Media Ambience is a browser extension that turns any supported video or music playback into a customisable visual experience — light that surrounds the player, motion that reacts to sound, colour that comes from the artwork.

It is a **personal, aesthetic, real-time layer** over media pages the user already loves. It is not a player replacement, not a video editor, not a recommendation engine, not a social product.

## The three experiences

Every feature in the product maps to one of three headline experiences. They share a common media and rendering foundation.

### 1. Video Ambience
The existing YouTube Ambilight experience, extended to every compatible video player on the web. Colour bleeds from the video frame onto the surrounding page. Around the player edges, and/or as a soft blurred background.

### 2. Audio Visualisation
Music-reactive effects for audio-only players. Six visualizers share one analysis pipeline: **spectrum, waves, circular, particles, liquid, minimal**. Colours come from album artwork or a user palette.

### 3. Hybrid Ambience
Video- or artwork-derived colour combined with audio-reactive motion. The ambience itself breathes with the music.

## Who it is for

| Persona | Need | Experience they'll reach for first |
|---------|------|------------------------------------|
| The **existing Ambilight user** | "Don't break what already works, and give me more sites." | Video Ambience |
| The **desktop-music listener** (Spotify, YouTube Music, SoundCloud) | "Make my screen feel like the room is part of the song." | Audio Visualisation |
| The **twitch / live watcher** | "I want the ambient light to follow the stream, not a fixed overlay." | Video Ambience (live) |
| The **reels scroller** (Instagram, Facebook) | "I want the effect to follow the currently visible video, silently." | Video + Hybrid, automatic |
| The **cinephile / aesthetic user** | "Softer, warmer, calmer — treat it like room lighting." | Presets, hybrid |

## Product outcomes we are optimising for

1. **Continuity.** A user moving from YouTube to Spotify to Twitch should feel like they are still in one product.
2. **Calmness by default.** The default experience must be subtle, low-cost, and never intrusive on the underlying page.
3. **Depth for those who want it.** Power users can open the advanced settings and reach every engine knob — but they don't have to.
4. **Honest capability reporting.** If a site doesn't allow audio capture or video sampling, the UI must say so — never silently no-op.
5. **Zero performance regression.** The extension must not cause visible stutter, dropped frames, or fan-spin on the platforms we touch. Existing users on capable GPUs stay at 60 FPS.
6. **Privacy-preserving architecture.** All frame sampling, colour extraction, audio analysis happens locally, in-page. Nothing uploaded. Nothing tracked beyond opt-in crash reports.

## What we are deliberately not doing

| Not in the product | Reason |
|--------------------|--------|
| AI scene detection, ML colour suggestions | Not needed for real-time visual processing; cost & latency don't justify it |
| Cloud sync of presets across browsers | Handled by the existing import/export + browser-account cloud flow; adding our own server is out-of-scope |
| A mobile / tablet UI | Browsers on mobile don't support the extension surface we depend on |
| Recording, screenshotting, or exporting effects | Users want ambient light, not a video editor |
| A desktop control bar / companion app in initial releases | Architecturally compatible, but explicitly deferred to a later phase |
| External RGB lighting (Philips Hue, Govee, etc.) | Future expansion, not part of this spec |
| Replacing the video player or its controls | We layer *around* the player, never in front of its native controls |

## Success criteria for v1 (all 9 platforms + 3 experiences shipped)

- A user who installed the current YouTube Ambilight can upgrade to this fork and lose nothing.
- A user who opens Spotify or YouTube Music sees an obvious, tasteful default visualizer working with album-artwork-derived colours within 5 seconds of playback starting.
- A user with a mid-tier GPU (PassMark ≥ 1000) can play 1080p60 on any supported site with no perceptible dropped frames.
- No unhandled exception reaches the page's own console. Every engine failure degrades gracefully and is visible in diagnostics.
- The extension requests only the minimum permissions required, and each permission has a written justification.

## Brand voice

- **Descriptive, not hyperbolic.** "Audio-reactive edge lighting" not "Mind-blowing immersive magic."
- **Precise.** We name what a feature does. Spectrum, waves, circular, particles, liquid, minimal — not "party mode."
- **Respectful of the host site.** We enhance YouTube, Spotify, Twitch — we do not pretend to replace them.

## How the product evolved from the fork

```
youtube-ambilight (upstream)          Universal Media Ambience (this project)
─────────────────────────────          ─────────────────────────────────────
Video Ambience on YouTube       →      Video Ambience on 9 platforms
(no audio engine)                →      Audio Visualisation on 3+ music sites
(no hybrid composition)          →      Hybrid engine across video + audio
(flat settings, no presets)      →      Preset model, per-platform profiles
(menu inside YouTube player)     →      Popup + options page + slim in-player toggle
```

The right column is not a rewrite — it is the same rendering core wearing a universal-media skeleton around it.
