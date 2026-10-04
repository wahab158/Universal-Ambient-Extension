/**
 * @file Abstract base class every platform adapter must extend.
 *
 * Adapters own the DOM knowledge: how to detect their site, find the media
 * element, and translate site-specific events (SPA navigations, custom
 * controls, miniplayer swaps) into `MediaSession` updates.
 *
 * Rules for adapters:
 *  - Never touch the renderer directly. Emit sessions; the registry routes.
 *  - Do not assume one media element per page (Instagram / Facebook feeds).
 *  - Do not read from `chrome.*` except for capability probing.
 *  - Keep everything inside an ES module; no globals, no `window.foo =`.
 */

/**
 * Lifecycle state of an adapter instance.
 * @enum {string}
 */
export const AdapterState = Object.freeze({
  IDLE: 'idle', // constructed, not yet asked to look at the DOM
  DISCOVERED: 'discovered', // canHandle() matched and discover() produced a session
  ACTIVE: 'active', // registry picked this adapter to drive the renderer
  SUSPENDED: 'suspended', // adapter still alive but not the current active one
  DESTROYED: 'destroyed', // listeners torn down
});

export class PlatformAdapter {
  /**
   * Unique platform id. Must match one of the `PlatformId` literals in
   * `media-session.js`. Registry uses this as the instance key.
   * @type {string}
   */
  static platformId = 'unknown';

  /**
   * Lower runs first when multiple adapters claim the page. YouTube should
   * beat the generic adapter; the generic adapter should be last (1000).
   * @type {number}
   */
  static priority = 0;

  /**
   * Cheap, synchronous "does this page look like my site?" check. Called by
   * the registry before any adapter instance is constructed. Must not walk
   * the DOM heavily; a single `querySelector` on a stable root is fine.
   *
   * @param {Document} _doc
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  static canHandle(_doc) {
    throw new Error(
      `${this.name || 'PlatformAdapter'} must implement static canHandle()`
    );
  }

  /**
   * @param {import('./media-session.js').AdapterContext} context
   */
  constructor(context) {
    if (!context?.document || !context?.window) {
      throw new Error('PlatformAdapter requires a context with document+window');
    }
    /** @type {import('./media-session.js').AdapterContext} */
    this.context = context;
    /** @type {string} */
    this.state = AdapterState.IDLE;
    /**
     * Live sessions this adapter currently knows about. Registry reads this
     * when picking the active session; adapters must keep it in sync.
     * @type {Map<string, import('./media-session.js').MediaSession>}
     */
    this.sessions = new Map();
    /** @type {Set<(session: import('./media-session.js').MediaSession) => void>} */
    this._listeners = new Set();
  }

  /**
   * Kick off discovery. Locate media element(s), set `this.sessions`, then
   * call `this.emit(session)` for each, and transition state to DISCOVERED.
   * Implementations may install MutationObservers / event listeners and
   * continue emitting later — the registry will keep routing them.
   *
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line require-await
  async discover() {
    throw new Error(
      `${this.constructor.name} must implement discover()`
    );
  }

  /**
   * Emit a session update to subscribers. Also stores it in `this.sessions`
   * keyed by `session.id` so the registry can snapshot current state.
   *
   * @param {import('./media-session.js').MediaSession} session
   */
  emit(session) {
    if (!session?.id) return;
    this.sessions.set(session.id, session);
    for (const listener of this._listeners) {
      try {
        listener(session);
      } catch (ex) {
        this.context.reportError?.(ex);
      }
    }
  }

  /**
   * Remove a session (e.g. player element was detached from the DOM). Notifies
   * subscribers with the last known snapshot so renderers can hide.
   *
   * @param {string} sessionId
   */
  retire(sessionId) {
    const existing = this.sessions.get(sessionId);
    if (!existing) return;
    this.sessions.delete(sessionId);
    for (const listener of this._listeners) {
      try {
        listener({ ...existing, isPlaying: false, layout: 'idle' });
      } catch (ex) {
        this.context.reportError?.(ex);
      }
    }
  }

  /**
   * Subscribe to session updates. Returns an unsubscribe function.
   *
   * @param {(session: import('./media-session.js').MediaSession) => void} listener
   * @returns {() => void}
   */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Tear down observers, listeners, and any DOM-side effects. The registry
   * calls this when swapping active adapters or when the page navigates to
   * an unsupported host.
   */
  destroy() {
    this._listeners.clear();
    this.sessions.clear();
    this.state = AdapterState.DESTROYED;
  }
}
