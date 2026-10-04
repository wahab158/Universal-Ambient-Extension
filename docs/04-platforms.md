# 04 — Platforms

We are not building nine independent versions of the extension. We are building **one shared core + nine platform adapters**. This document defines the adapter contract, the platform roadmap, and the per-platform risks.

## The adapter principle

An adapter's job is to translate a website's DOM into a **normalised media session**. Engines never know which site they are running on — they see only `MediaSession` objects.

```
┌────────────────────────┐
│ Universal Media Core   │  knows nothing about websites
│  (engines, rendering)  │
└──────────┬─────────────┘
           │  MediaSession
           │  PlaybackState
           │  MediaMetadata
           │  MediaCapabilities
┌──────────┴─────────────┐
│  Platform Adapter      │  per-site DOM knowledge, isolated
│ (YouTube, Spotify, …)  │
└────────────────────────┘
```

## Adapter contract (conceptual)

> Illustrative interface. This is not a mandate to convert the codebase to TypeScript — the existing JS code just needs to satisfy the shape.

```ts
type MediaType = 'video' | 'audio';

type PlaybackState =
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'idle';

interface MediaMetadata {
  title?: string;
  artist?: string;
  artworkUrl?: string;
  duration?: number;
  currentTime?: number;
}

interface MediaCapabilities {
  videoFrameSampling: boolean;   // canvas.drawImage(video) works
  audioAnalysis: boolean;        // Web Audio can reach the source
  artwork: boolean;               // artwork URL / element is available
  metadata: boolean;              // title / artist is readable
  playbackEvents: boolean;        // playing/pause/seek events fire reliably
  playbackControls: boolean;      // we can programmatically control playback
}

interface MediaSession {
  id: string;                     // stable across DOM replacement
  platform: string;               // 'youtube' | 'spotify' | ...
  type: MediaType;
  state: PlaybackState;
  element: HTMLMediaElement;
  metadata: MediaMetadata;
  capabilities: MediaCapabilities;
  bounds: DOMRect;                 // for player-relative placement
}

interface PlatformAdapter {
  detect(): boolean;              // is this adapter relevant on current page?
  discoverMedia(): MediaSession[];
  getActiveMedia(): MediaSession | null;
  getMetadata(session: MediaSession): MediaMetadata;
  getCapabilities(session: MediaSession): MediaCapabilities;
  subscribe(onChange: (event) => void): () => void;   // returns unsubscribe
  destroy(): void;
}
```

**Notes on the shape:**
- `id` must be stable across SPA navigations that reuse the same underlying media — not a DOM reference.
- `MediaCapabilities` are *honest*: if audio analysis cannot be reached on this site, the flag is `false`. The UI must reflect this.
- `bounds` is the current player rect (used by player-relative Ambilight placement).
- `subscribe` handles SPA navigation and dynamic player replacement. Adapters are responsible for reporting these changes.

## Platform roadmap

### Tier 1 — Foundation

| Platform | Role | Notes |
|----------|------|-------|
| **YouTube** | Preserve everything; become the reference adapter | Extract YouTube-specific code from `content-main.js` + `injected.js` into a `YouTubeAdapter`. Existing behaviour must be bit-identical. |

### Tier 2 — Music

Establish audio analysis, artwork ambience, and music visualizers.

| Platform | Main functionality | Engineering challenge |
|----------|-------------------|----------------------|
| **YouTube Music** | Artwork, audio, music-video hybrid | Dynamic player, artwork changes, uses HTMLMediaElement — Web Audio should work |
| **Spotify** | Artwork ambience, audio visualizers | Web Audio may be blocked by CORS on some audio sources; tabCapture fallback requires user gesture |
| **SoundCloud** | Artwork, waveform, audio | Dynamic playback; several tracks may coexist in DOM |

### Tier 3 — Video platforms

Validate generic video-player compatibility.

| Platform | Main functionality | Engineering challenge |
|----------|-------------------|----------------------|
| **Vimeo** | Video Ambilight + audio | Embedded players, cross-origin iframes — need iframe-scoped adapters |
| **Twitch** | Stream Ambilight + hybrid | Live playback; player lifecycle differs from VOD |

### Tier 4 — Social feeds

Introduce active-player selection and multiple simultaneous media elements.

| Platform | Main functionality | Engineering challenge |
|----------|-------------------|----------------------|
| **Instagram** | Reels ambience + audio | Many videos in a scroll feed; active selection changes fast |
| **Facebook** | Video + Reels ambience | Multiple media elements, heavy dynamic page mutation |

### Tier 5 — Experimental

| Platform | Main functionality | Engineering challenge |
|----------|-------------------|----------------------|
| **Netflix** | Determine what is honestly feasible | DRM / protected video frames; may need to degrade to audio or artwork-only modes |

## Capability matrix (target)

This is the matrix the UI reads from. Statuses: ✅ supported · 🟡 partial · 🧪 experimental · ❌ unavailable.

| Platform | Video frame sampling | Audio analysis | Artwork | Metadata | Playback events | Notes |
|----------|--------------------|---------------|---------|----------|----------------|-------|
| YouTube | ✅ | 🧪 | ✅ (thumbnails) | ✅ | ✅ | Web Audio depends on CORS on the video source; verify in Phase 3 |
| YouTube Music | 🟡 (music videos only) | 🟡 | ✅ | ✅ | ✅ | Audio may require `crossorigin` on media element; test in Phase 3 |
| Spotify | ❌ (no video) | 🧪 | ✅ | ✅ | ✅ | Web Audio blocked? TabCapture fallback |
| SoundCloud | ❌ | 🟡 | ✅ | ✅ | ✅ | Same as Spotify, plus dynamic playback |
| Vimeo | ✅ | 🟡 | 🟡 | 🟡 | ✅ | Embedded iframe boundary |
| Twitch | ✅ | 🟡 | 🟡 | ✅ | ✅ | Live vs VOD |
| Instagram | ✅ | 🟡 | ✅ | 🟡 | ✅ | Multiple videos on one page |
| Facebook | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | Multiple videos, aggressive DOM changes |
| Netflix | ❌ (expected) | 🧪 | 🟡 | 🟡 | 🟡 | DRM will likely block frame sampling — must verify, not assume |

**Rule:** a capability marked ❌ must never produce a "please try again" broken UI — it must visibly grey out the effect and explain why.

## Capability reporting in the UI

Per [UI/UX Plan](./05-ui-ux.md#capability-surfacing), the popup shows the actual available modes for the current site. The four possible statuses are:

| Status | Meaning | UI treatment |
|--------|---------|--------------|
| **Supported** | Verified functionality | Full effect list |
| **Partial** | Some features unavailable or restricted | Effect list with disabled entries + tooltip explaining |
| **Experimental** | Under active compatibility testing | Effect list with `⚠️ Experimental` badge |
| **Unavailable** | Not currently supported | Effect hidden entirely; only manual-palette fallback exposed |

## Per-platform risks to resolve in Phase 0

1. **YouTube DOM coupling in the renderer.** `content-main.js` and `injected.js` reference `ytd-app`, `ytd-watch-flexy`, `ytd-miniplayer`, `html5-main-video`, `.ytp-right-controls`, `#content.ytd-app`, `#masthead-container`, `.html5-video-container`. Extract every touch point into the YouTube adapter. Confirm the renderer can accept an arbitrary `MediaSession` with the same behaviour.
2. **Audio capture on cross-origin sources.** HTMLMediaElement with `src` from a different origin is *not* readable by Web Audio (`AnalyserNode` returns silence). This is a browser security rule, not a bug. Music sites either set `crossorigin` (uncommon) or route audio through WebRTC. **Fallback = `chrome.tabCapture`, which requires a user gesture and a `tabCapture` permission.** Test per-platform in Phase 3 before promising visualizers.
3. **Tab capture and Firefox.** Firefox has no `chrome.tabCapture`. Alternative paths: `MediaStream` from `HTMLMediaElement` when CORS allows; `audioFilter` (Firefox-specific) via `browser.audivoFilter` — limited availability. Decide per-platform whether Firefox parity is achievable or must degrade.
4. **Netflix DRM.** Protected Media Session / EME / Widevine typically produces black canvas frames when sampled. Design Netflix as **either** audio-only, artwork-only, or unsupported. Do not design features around assumed DRM-bypass behaviour.
5. **Cross-browser optional permissions.** MV3 supports optional host permissions on Chromium; Firefox supports them too but the grant flow differs. If we use optional permissions for Spotify/Twitch/etc., test both browser flows.
6. **Multiple simultaneous media elements (social feeds).** Instagram + Facebook may show dozens of videos, only one "active" — the adapter's `getActiveMedia()` must implement a policy (visible, playing, largest, most recently interacted). This is per-adapter behaviour.

## Adapter implementation checklist

Every new adapter must:

- [ ] Register in the platform registry with a `detect()` that is cheap and precise
- [ ] Provide `discoverMedia()` returning `MediaSession[]`
- [ ] Implement active-player selection when multiple sessions exist
- [ ] Emit a `MediaChange` event stream: session added / removed / state-changed / bounds-changed
- [ ] Populate `MediaCapabilities` **honestly** — verify at runtime, do not trust static assumptions
- [ ] Have at least one integration test in `tests/platform/<name>/`
- [ ] Not add any `if (platform === …)` check inside the shared core (adapters translate, they do not branch inside engines)
- [ ] Isolate YouTube-style DOM mutations to this file only

## What changes to `manifest.json` we must plan for

The current manifest is minimal (`storage` only, `youtube.com/*` host match). The full product requires:

```
content_scripts.matches            += spotify.com, music.youtube.com, soundcloud.com,
                                     twitch.tv, vimeo.com, netflix.com,
                                     instagram.com, facebook.com, web.facebook.com
permissions                        += activeTab (probably), tabCapture*
optional_permissions               = ["tabCapture", "storage.sync"?]
host_permissions                   += per-site
```

\* `tabCapture` is Chromium-only and must be gated. Firefox requires `firefox-common` build branch or degrades audio features to `HTMLMediaElement` + CORS-allowed sources only.

**No permission is added to the manifest until its Phase-0 or Phase-3 justification lands in [Performance & Security](./10-performance-security.md).**
