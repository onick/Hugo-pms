/**
 * Minimal fetch handler for hugo-pms worker. The Assets binding handles
 * all real requests; this fallback only runs when the asset router
 * passes through (e.g. for a request that doesn't match any static file).
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
