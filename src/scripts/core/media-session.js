/**
 * @file MediaSession data model.
 *
 * A `MediaSession` is the platform-agnostic description of "one playable
 * thing on this page" — the video/audio element the ambience engine should
 * sample. Platform adapters produce sessions; the renderer (`Ambientlight`
 * today, plus visualizers tomorrow) consumes them.
 *
 * Nothing in this file does any DOM query. Keep it pure so the shape can be
 * exercised in tests and by the future popup without loading a page.
 */

/**
 * @typedef {'youtube'|'vimeo'|'twitch'|'netflix'|'spotify'|'youtube-music'
 *   |'soundcloud'|'instagram'|'facebook'|'generic'} PlatformId
 */

/**
 * @typedef {'watch'|'theater'|'fullscreen'|'embed'|'shorts'|'feed'|'list'
 *   |'idle'} PageLayout
 */

/**
 * Viewport-space rectangle of the media content area (post-black-bar, if
 * the adapter knows about bars). Adapters own the interpretation.
 * @typedef {Object} MediaBounds
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} MediaMetadata
 * @property {string} [title]
 * @property {string} [artist]
 * @property {string} [album]
 * @property {string|null} [artworkUrl]  Album / show artwork, if any.
 * @property {string|null} [videoId]
 * @property {Record<string,string>} [extra] Any platform-specific fields
 *   worth surfacing to diagnostics / presets.
 */

/**
 * @typedef {Object} MediaCapabilities
 * @property {boolean} videoFrameSampling  Can we drawImage() the video into
 *   a canvas without the canvas becoming tainted? Adapters set this from
 *   what they know about the platform's CORS / DRM posture. The renderer
 *   must still verify at draw time.
 * @property {boolean} audioAnalyser       Can we attach this element to a
 *   Web Audio `MediaElementAudioSourceNode` and read an AnalyserNode?
 * @property {boolean} audioTabCapture     Is `chrome.tabCapture` a valid
 *   fallback for this page? Chromium only.
 * @property {boolean} artworkAvailable    Album / show artwork exists on
 *   the page and is safe to sample.
 * @property {boolean} fullscreenApi       Real fullscreen state we can
 *   observe (`fullscreenchange` or a platform event).
 * @property {boolean} spaNavigation       We need SPA navigation events
 *   (not just URL changes) to know the media changed.
 * @property {string} notes                Free-text for the diagnostics view.
 */

/**
 * @typedef {Object} MediaSession
 * @property {string} id                   Unique per session on this page.
 * @property {PlatformId} platformId
 * @property {PageLayout} layout
 * @property {HTMLMediaElement} element    The `<video>` / `<audio>` node.
 * @property {MediaBounds} bounds
 * @property {MediaMetadata} metadata
 * @property {MediaCapabilities} capabilities
 * @property {boolean} isPlaying
 * @property {boolean} isMuted
 * @property {number} volume               0..1
 * @property {number} currentTime          seconds
 * @property {number} duration             seconds, or `Infinity` for live
 * @property {boolean} isHdr
 * @property {boolean} isVr
 * @property {Object} [platformSpecific]   Escape hatch — the adapter can
 *   attach anything the renderer may need that isn't covered above.
 */

/**
 * @typedef {Object} AdapterContext
 * @property {Document} document
 * @property {Window} window
 * @property {(ex: unknown) => void} [reportError]
 */

/**
 * Build a MediaSession from a partial seed. Any unset field falls back to a
 * neutral default — callers should treat missing capabilities as "not
 * available" so nothing dangerous happens if an adapter forgets to declare.
 *
 * @param {Partial<MediaSession> & { element: HTMLMediaElement, platformId: PlatformId, id: string }} seed
 * @returns {MediaSession}
 */
export function createMediaSession(seed) {
  return {
    layout: 'idle',
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    metadata: {},
    capabilities: {
      videoFrameSampling: false,
      audioAnalyser: false,
      audioTabCapture: false,
      artworkAvailable: false,
      fullscreenApi: false,
      spaNavigation: false,
      notes: '',
    },
    isPlaying: false,
    isMuted: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    isHdr: false,
    isVr: false,
    ...seed,
  };
}

/**
 * Viewport bounds of any element via `getBoundingClientRect`. Respects CSS
 * transforms. Callers that need clipping against the visible viewport must
 * intersect separately — we deliberately do not clamp here.
 *
 * @param {Element} element
 * @returns {MediaBounds}
 */
export function computeBounds(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Copy of `a` merged into `b` where `b` reports meaningful differences.
 * Used by the registry to decide whether to broadcast a session update.
 * Returns `true` when something changed and callers should re-emit.
 *
 * @param {MediaSession} a
 * @param {MediaSession} b
 * @returns {boolean}
 */
export function sessionHasChanged(a, b) {
  if (a === b) return false;
  if (!a || !b) return true;
  if (a.element !== b.element) return true;
  if (a.platformId !== b.platformId) return true;
  if (a.layout !== b.layout) return true;
  if (a.isPlaying !== b.isPlaying) return true;
  if (a.isMuted !== b.isMuted) return true;
  if (a.bounds.width !== b.bounds.width) return true;
  if (a.bounds.height !== b.bounds.height) return true;
  if (a.bounds.x !== b.bounds.x) return true;
  if (a.bounds.y !== b.bounds.y) return true;
  return false;
}
