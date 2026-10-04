/**
 * @file YouTube platform adapter.
 *
 * Currently a thin scaffold: it centralises every YouTube-specific selector
 * that was scattered across `content-main.js`, `injected.js`, and
 * `ambientlight.js`, and produces a MediaSession for the watch / embed page.
 *
 * Phase 1.1 will move the SPA navigation (`yt-navigate-finish`), the
 * detached-video MutationObserver, and the miniplayer / shorts / browse
 * recovery paths out of `content-main.js` into this adapter's `discover()`.
 *
 * Nothing here touches the renderer — adapters only emit sessions.
 */

import { PlatformAdapter, AdapterState } from '../../core/platform-adapter.js';
import {
  createMediaSession,
  computeBounds,
} from '../../core/media-session.js';

/**
 * Canonical set of YouTube selectors this fork depends on. Any new YouTube
 * coupling must be added here so the eventual removal of one platform
 * stays a one-file edit.
 */
export const YouTubeSelectors = Object.freeze({
  /** The main playing `<video>` element YouTube renders for /watch. */
  video: 'video.html5-main-video',
  /** Root of the YouTube SPA. */
  app: 'ytd-app',
  /** The three layouts of the /watch page. */
  watchContainers: ['ytd-watch-flexy', 'ytd-watch-fixie', 'ytd-watch-grid'],
  /** The content region that hosts the player. */
  content: '#content.ytd-app',
  /** Header, used for immersive / theater mode offsets. */
  masthead: '#masthead-container',
  /** Container the settings button is inserted into today. */
  controlsBar: '.html5-video-player .ytp-right-controls',
  /** Fallback insertion point on some layouts. */
  controlsBarAlt: '.html5-video-player .ytp-chrome-controls > *:last-child',
  /** Embedded player root (`/embed/<id>`). */
  embedRoot: '#player',
  /** Legacy player API container used by some embeds. */
  playerApi: '#player-api',
  /** Miniplayer that appears when the user scrolls away from /watch. */
  miniplayer: 'ytd-miniplayer',
  /** Vertical short-form feed. */
  shorts: 'ytd-shorts',
  /** Home / channel / playlist browse pages. */
  browse: 'ytd-browse',
  /** Channel banner player. */
  channelRenderer: 'ytd-channel-video-player-renderer',
  /** Hover preview player. */
  inlinePreview: '#inline-preview-player',
  /** Mobile web player — this extension intentionally does not run here. */
  mobileControls: '#player-control-container',
  /** YouTube's SPA navigation event. */
  navigateFinishEvent: 'yt-navigate-finish',
  /** Another extension's watermark — we back off when we see it. */
  foreignExtensionWatermark: 'video.stefanvdvideotop',
});

/** Where a video's play button lives, used for the "not on watch yet" bail. */
export const YouTubeSettingsMenuParentSelector = [
  YouTubeSelectors.controlsBar,
  YouTubeSelectors.controlsBarAlt,
].join(', ');

/** Composite selector for the primary /watch video. */
export const YouTubeWatchVideoSelector = YouTubeSelectors.watchContainers
  .map(
    (c) =>
      `${YouTubeSelectors.app} ${YouTubeSelectors.content} ${c} ` +
      `.html5-video-player .html5-video-container ${YouTubeSelectors.video}`
  )
  .join(', ');

/** Composite selector for the /embed video. */
export const YouTubeEmbedVideoSelector =
  `${YouTubeSelectors.embedRoot} .html5-video-player ` +
  `.html5-video-container ${YouTubeSelectors.video}`;

const YOUTUBE_URL_PREFIX = 'https://www.youtube.com/';

/**
 * Order matters — the more specific (higher-priority) layouts come first so
 * we do not accidentally pick up the miniplayer when the watch player is
 * still present.
 */
const VIDEO_LOCATIONS = [
  { layout: 'watch', selector: YouTubeWatchVideoSelector },
  { layout: 'embed', selector: YouTubeEmbedVideoSelector },
  {
    layout: 'embed',
    selector: `${YouTubeSelectors.playerApi} ${YouTubeSelectors.video}`,
  },
  {
    layout: 'shorts',
    selector: `${YouTubeSelectors.shorts} ${YouTubeSelectors.video}`,
  },
  {
    layout: 'feed',
    selector: `${YouTubeSelectors.miniplayer} ${YouTubeSelectors.video}`,
  },
  {
    layout: 'feed',
    selector: `${YouTubeSelectors.browse} ${YouTubeSelectors.video}`,
  },
  {
    layout: 'feed',
    selector: `${YouTubeSelectors.inlinePreview} ${YouTubeSelectors.video}`,
  },
  {
    layout: 'feed',
    selector: `${YouTubeSelectors.channelRenderer} ${YouTubeSelectors.video}`,
  },
];

export class YouTubeAdapter extends PlatformAdapter {
  static platformId = 'youtube';
  /** Beats `generic` (1000) and any other adapter we add. */
  static priority = -100;

  static canHandle(doc) {
    // Cheap: one `querySelector` and one URL prefix check.
    if (doc.querySelector(YouTubeSelectors.mobileControls)) return false;
    if (doc.querySelector(YouTubeSelectors.app)) return true;
    return typeof doc.URL === 'string' && doc.URL.startsWith(YOUTUBE_URL_PREFIX);
  }

  // eslint-disable-next-line require-await
  async discover() {
    const doc = this.context.document;

    // Bail out gracefully when another ambience extension already owns the
    // player — the upstream `content-main.js` refuses to run in that case.
    if (doc.querySelector(YouTubeSelectors.foreignExtensionWatermark)) {
      return;
    }

    const found = this._findVideo(doc);
    if (!found) return;
    const { element, layout } = found;
    const session = createMediaSession({
      id: 'youtube:primary',
      platformId: 'youtube',
      element,
      layout,
      bounds: computeBounds(element),
      metadata: this._readMetadata(doc, element),
      capabilities: {
        // YouTube serves same-origin media — canvas drawImage is safe.
        videoFrameSampling: true,
        // MediaElementSource on a YouTube video is allowed by CORS.
        audioAnalyser: true,
        // Chrome-only, useful when audioAnalyser breaks on DRM-ish content.
        audioTabCapture: true,
        // Thumbnails live on i.ytimg.com; not sampled yet, but declared.
        artworkAvailable: true,
        fullscreenApi: true,
        spaNavigation: true,
        notes: 'YouTube full capability set.',
      },
      isPlaying: !element.paused && !element.ended,
      isMuted: element.muted,
      volume: element.volume,
      currentTime: element.currentTime || 0,
      duration: Number.isFinite(element.duration) ? element.duration : Infinity,
      platformSpecific: {
        // Escape hatch: keep the wrapper elements the current renderer
        // expects so `Ambientlight` keeps working unchanged during migration.
        ytdAppElem: doc.querySelector(YouTubeSelectors.app),
        ytdWatchElem: doc.querySelector(
          YouTubeSelectors.watchContainers
            .map((c) => `${YouTubeSelectors.app} ${c}`)
            .join(', ')
        ),
        mastheadElem: doc.querySelector(
          `${YouTubeSelectors.app} ${YouTubeSelectors.masthead}`
        ),
      },
    });

    this.state = AdapterState.DISCOVERED;
    this.emit(session);
  }

  _findVideo(doc) {
    for (const { layout, selector } of VIDEO_LOCATIONS) {
      const el = doc.querySelector(selector);
      if (el) return { element: el, layout };
    }
    return null;
  }

  _readMetadata(doc, element) {
    // Best-effort. Missing fields stay undefined rather than lying.
    const title =
      doc.querySelector('meta[property="og:title"]')?.content ||
      doc.title ||
      undefined;
    const videoId = extractVideoId(doc.URL) || element.currentSrc || undefined;
    return { title, videoId };
  }
}

/**
 * Pull the 11-char video id out of any YouTube URL shape (watch, embed,
 * shorts, live). Returns null when none is present.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function extractVideoId(url) {
  if (typeof url !== 'string') return null;
  const match =
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    url.match(/\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
  if (!match) return null;
  return match[1]?.length === 11 ? match[1] : match[2] ?? null;
}

export default YouTubeAdapter;
