/**
 * @file Public entry point for the universal media core.
 *
 * Anything importing from `./core` gets the MediaSession shape, the
 * `PlatformAdapter` base class, and the shared `registry` singleton.
 * Adapters themselves live under `../adapters/*` and self-register via
 * `registry.register(...)`.
 */

export {
  createMediaSession,
  computeBounds,
  sessionHasChanged,
} from './media-session.js';

export { PlatformAdapter, AdapterState } from './platform-adapter.js';

export { registry, AdapterRegistry } from './registry.js';
