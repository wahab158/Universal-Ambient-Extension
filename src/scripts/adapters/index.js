/**
 * @file Adapter catalogue + registration.
 *
 * Single place that decides *which* adapters ship in the build. Adding a
 * platform is: write `adapters/<name>/index.js`, import it here, register it.
 * The registry sorts by `priority`, so ordering of these calls does not matter.
 */

import { registry } from '../core/registry.js';
import YouTubeAdapter from './youtube/index.js';
import GenericHtmlVideoAdapter from './generic/index.js';

let registered = false;

/**
 * Register every shipped adapter exactly once (safe to call again on hot
 * reload / re-navigation).
 */
export function registerAdapters() {
  if (registered) return registry;
  registry.register(YouTubeAdapter);
  registry.register(GenericHtmlVideoAdapter);
  registered = true;
  return registry;
}

export { registry, YouTubeAdapter, GenericHtmlVideoAdapter };
