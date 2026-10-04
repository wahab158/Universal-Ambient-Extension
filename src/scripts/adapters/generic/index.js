/**
 * @file Generic HTML5 video adapter.
 *
 * Fallback for any page that exposes a plain `<video>` element with no
 * custom player: Vimeo, direct MP4 URLs, most social embeds, and — during
 * Phase 2 — the target we validate the abstraction against.
 *
 * Deliberately conservative:
 *  - Only claims the page if no other adapter is more specific (highest
 *    `priority` number).
 *  - Does not claim audio analyser access — CORS will decide that at
 *    draw time; the diagnostics view tells the user the truth.
 *  - Filters out tiny "beacon" videos (tracking pixels etc.).
 */

import { PlatformAdapter, AdapterState } from '../../core/platform-adapter.js';
import {
  createMediaSession,
  computeBounds,
} from '../../core/media-session.js';

/** Anything smaller than this is a tracking pixel, not a real video. */
const MIN_WIDTH = 160;
const MIN_HEIGHT = 90;

export class GenericHtmlVideoAdapter extends PlatformAdapter {
  static platformId = 'generic';
  /** Only used when nothing more specific claimed the page. */
  static priority = 1000;

  static canHandle(doc) {
    return !!doc.querySelector('video');
  }

  // eslint-disable-next-line require-await
  async discover() {
    const doc = this.context.document;
    const candidates = Array.from(doc.querySelectorAll('video')).filter(
      (v) => {
        const rect = v.getBoundingClientRect();
        return rect.width >= MIN_WIDTH && rect.height >= MIN_HEIGHT;
      }
    );
    if (candidates.length === 0) return;

    // Emit every candidate so the registry / active-player picker can pick
    // the "current" one. Today the picker is dumb (largest wins); Phase 6
    // makes it follow the viewport for Instagram-style feeds.
    for (const element of candidates) {
      const session = createMediaSession({
        id: `generic:${stableRef(element)}`,
        platformId: 'generic',
        element,
        layout: 'watch',
        bounds: computeBounds(element),
        metadata: {
          title: element.getAttribute('title') || doc.title || undefined,
        },
        capabilities: {
          // We can only find out at draw time whether the video is
          // same-origin. Adapters should under-promise.
          videoFrameSampling: false,
          audioAnalyser: false,
          audioTabCapture: true,
          artworkAvailable: false,
          fullscreenApi: true,
          spaNavigation: false,
          notes:
            'Generic HTML5 video. Frame sampling validated lazily by the renderer.',
        },
        isPlaying: !element.paused && !element.ended,
        isMuted: element.muted,
        volume: element.volume,
        currentTime: element.currentTime || 0,
        duration: Number.isFinite(element.duration) ? element.duration : 0,
      });
      this.state = AdapterState.DISCOVERED;
      this.emit(session);
    }
  }
}

/**
 * Best-effort stable identifier for a DOM element that survives adapter
 * re-runs on the same page. Uses a WeakMap-backed counter so two identical
 * `<video>` nodes get distinct ids.
 */
let counter = 0;
const refMap = new WeakMap();
function stableRef(el) {
  let ref = refMap.get(el);
  if (!ref) {
    ref = `v${++counter}`;
    refMap.set(el, ref);
  }
  return ref;
}

export default GenericHtmlVideoAdapter;
