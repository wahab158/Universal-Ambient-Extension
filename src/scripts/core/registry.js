/**
 * @file Adapter registry.
 *
 * Owns the list of registered `PlatformAdapter` subclasses, decides which
 * one is active for the current page, and broadcasts the active session to
 * any subscriber (renderer, popup, diagnostics view).
 *
 * Kept as a module-level singleton so `content-main.js`, the future popup,
 * and tests all see the same view of "what is playing right now".
 */

import { AdapterState } from './platform-adapter.js';
import { sessionHasChanged } from './media-session.js';

class AdapterRegistry {
  constructor() {
    /** @type {typeof import('./platform-adapter.js').PlatformAdapter[]} */
    this._adapterClasses = [];
    /** @type {Map<string, import('./platform-adapter.js').PlatformAdapter>} */
    this._instances = new Map();
    /** @type {import('./platform-adapter.js').PlatformAdapter|null} */
    this._active = null;
    /** @type {import('./media-session.js').MediaSession|null} */
    this._activeSession = null;
    /** @type {Set<(session: import('./media-session.js').MediaSession|null) => void>} */
    this._sessionListeners = new Set();
  }

  /**
   * Register an adapter class. Sorted by `priority` ascending on every
   * registration so `activateFor` runs cheap probes first.
   *
   * @param {typeof import('./platform-adapter.js').PlatformAdapter} AdapterClass
   */
  register(AdapterClass) {
    if (!AdapterClass?.platformId || AdapterClass.platformId === 'unknown') {
      throw new Error('Registry.register requires a static platformId');
    }
    if (this._adapterClasses.some((A) => A.platformId === AdapterClass.platformId)) {
      // Idempotent — ignore duplicate registrations (e.g. hot reload).
      return;
    }
    this._adapterClasses.push(AdapterClass);
    this._adapterClasses.sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    );
  }

  /** Snapshot of every adapter class currently registered. */
  get registeredAdapterClasses() {
    return this._adapterClasses.slice();
  }

  /** Adapters that passed `canHandle()` for the last `activateFor` call. */
  get instances() {
    return Array.from(this._instances.values());
  }

  /** The adapter that is currently driving the renderer, if any. */
  get active() {
    return this._active;
  }

  /** Last session broadcast to subscribers. */
  get activeSession() {
    return this._activeSession;
  }

  /**
   * Plain-object view of the registry for the diagnostics UI / popup. Strips
   * the DOM element (cannot be serialised across the messaging boundary) and
   * replaces it with a small descriptor. Safe to `JSON.stringify`.
   * @returns {Object}
   */
  getDiagnosticsSnapshot() {
    return {
      activePlatform: this._active?.constructor?.platformId ?? null,
      registeredAdapters: this._adapterClasses.map((A) => ({
        platformId: A.platformId,
        priority: A.priority,
      })),
      instances: this.instances.map((i) => ({
        platformId: i.constructor.platformId,
        state: i.state,
        sessions: Array.from(i.sessions.keys()),
      })),
      activeSession: describeSession(this._activeSession),
    };
  }

  /**
   * Instantiate every adapter that claims to handle the page, run discovery,
   * and pick the highest-priority one that produced a session.
   *
   * @param {Document} doc
   * @param {import('./media-session.js').AdapterContext} context
   * @returns {Promise<import('./platform-adapter.js').PlatformAdapter|null>}
   */
  async activateFor(doc, context) {
    // Clean up any prior run so we do not leak observers across navigations.
    this.destroyAll();

    for (const AdapterClass of this._adapterClasses) {
      let claims = false;
      try {
        claims = AdapterClass.canHandle(doc) === true;
      } catch (ex) {
        context.reportError?.(ex);
        continue;
      }
      if (!claims) continue;

      let instance;
      try {
        instance = new AdapterClass(context);
      } catch (ex) {
        context.reportError?.(ex);
        continue;
      }
      this._instances.set(AdapterClass.platformId, instance);
      instance.onChange((session) => this._routeSessionUpdate(instance, session));

      try {
        await instance.discover();
        if (instance.sessions.size > 0) {
          instance.state = AdapterState.DISCOVERED;
        }
      } catch (ex) {
        context.reportError?.(ex);
      }
    }

    // Choose the first (highest-priority) adapter that discovered a session.
    for (const instance of this._instances.values()) {
      if (instance.state === AdapterState.DISCOVERED) {
        this._active = instance;
        instance.state = AdapterState.ACTIVE;
        // Suspend (but keep alive) the others so their listeners can fire
        // if the active adapter later retires all its sessions.
        for (const other of this._instances.values()) {
          if (other !== instance && other.state === AdapterState.DISCOVERED) {
            other.state = AdapterState.SUSPENDED;
          }
        }
        const firstSession = instance.sessions.values().next().value ?? null;
        this._setActiveSession(firstSession);
        break;
      }
    }

    return this._active;
  }

  /**
   * Subscribe to session updates. Immediately invoked with the current
   * active session (or `null`) so late subscribers sync up.
   *
   * @param {(session: import('./media-session.js').MediaSession|null) => void} listener
   * @returns {() => void} unsubscribe
   */
  onSession(listener) {
    this._sessionListeners.add(listener);
    try {
      listener(this._activeSession);
    } catch {
      // Do not let a bad subscriber break the caller.
    }
    return () => this._sessionListeners.delete(listener);
  }

  /**
   * Tear down every instance and clear the active pointer. Called on SPA
   * navigations and when the page moves to an unsupported host.
   */
  destroyAll() {
    for (const instance of this._instances.values()) {
      try {
        instance.destroy();
      } catch {
        /* noop */
      }
    }
    this._instances.clear();
    this._active = null;
    this._setActiveSession(null);
  }

  /**
   * Internal: an adapter emitted a session. If it belongs to the active
   * adapter (or we do not yet have one and this instance is a candidate),
   * broadcast it.
   */
  _routeSessionUpdate(instance, session) {
    if (this._active === instance) {
      this._setActiveSession(session);
      return;
    }
    // If the active adapter lost every session, promote this one.
    if (
      this._active &&
      this._active.sessions.size === 0 &&
      instance.sessions.size > 0 &&
      (instance.constructor.priority ?? 0) <=
        (this._active.constructor.priority ?? 0)
    ) {
      this._active.state = AdapterState.SUSPENDED;
      this._active = instance;
      instance.state = AdapterState.ACTIVE;
      this._setActiveSession(session);
    }
  }

  _setActiveSession(session) {
    const changed =
      sessionHasChanged(this._activeSession, session) ||
      (this._activeSession === null) !== (session === null);
    this._activeSession = session;
    if (!changed) return;
    for (const listener of this._sessionListeners) {
      try {
        listener(session);
      } catch {
        // Ignore listener failures so one bad subscriber does not kill the rest.
      }
    }
  }
}

/** Shared singleton — content script writes, popup reads. */
export const registry = new AdapterRegistry();

/**
 * Turn a MediaSession into something JSON-safe for diagnostics.
 * @param {import('./media-session.js').MediaSession|null} session
 */
function describeSession(session) {
  if (!session) return null;
  const el = session.element;
  return {
    id: session.id,
    platformId: session.platformId,
    layout: session.layout,
    bounds: session.bounds,
    capabilities: session.capabilities,
    metadata: session.metadata,
    playback: {
      isPlaying: session.isPlaying,
      isMuted: session.isMuted,
      volume: session.volume,
      currentTime: session.currentTime,
      duration: session.duration,
      isHdr: session.isHdr,
      isVr: session.isVr,
    },
    element: {
      tag: el?.tagName,
      readyState: el?.readyState,
      videoWidth: el?.videoWidth,
      videoHeight: el?.videoHeight,
      src: String(el?.currentSrc || el?.src || '').slice(0, 200),
    },
  };
}

export { AdapterRegistry };
