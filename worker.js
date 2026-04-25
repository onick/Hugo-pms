/**
 * hugo-pms worker — serves the Hugo landing site for silexpms.com AND
 * proxies the SaaS Owner console (silexpms.com/admin/*) to the PMS
 * Next.js app on Contabo. Lets the same root domain host both surfaces
 * without forcing operators to remember a separate admin subdomain.
 *
 * Routing rules (first match wins):
 *   /admin/*    → proxy to https://pms.silexpms.com (Next.js admin pages)
 *   /_next/*    → proxy to https://pms.silexpms.com (Next.js static chunks
 *                  + image optimization + RSC payloads referenced by the
 *                  admin pages above)
 *   *           → Hugo static assets
 *
 * The proxy preserves the original Host header so Next.js can generate
 * absolute URLs back to silexpms.com (canonical links, OG tags, etc.).
 *
 * If you ever need to drop the path-proxy approach, just remove the
 * isAdminPath() branch and traffic falls back to the static landing.
 */

const UPSTREAM = 'https://pms.silexpms.com';

// Paths handled by the Silex PMS app (Next.js on Contabo) instead of Hugo.
// Add new app routes here as they ship.
const APP_PATH_PREFIXES = [
  '/admin',       // SaaS Owner console
  '/login',       // tenant login (proxied here so silexpms.com/login can show
                  //   the find-hotel locator from the same Next.js app)
  '/signup',      // public self-service hotel signup
  '/find-hotel',  // tenant locator (silexpms.com/find-hotel)
  '/_next',       // Next.js static assets / RSC payloads
];

function isAdminPath(pathname) {
  return APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isAdminPath(url.pathname)) {
      const upstream = new URL(request.url);
      upstream.protocol = 'https:';
      upstream.hostname = new URL(UPSTREAM).hostname;
      upstream.port = '';

      const proxyReq = new Request(upstream.toString(), request);
      proxyReq.headers.set('X-Forwarded-Host', url.hostname);
      proxyReq.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      const resp = await fetch(proxyReq, { redirect: 'manual' });

      // Mirror upstream redirects under our hostname so the browser
      // keeps surfing silexpms.com instead of jumping to pms.silexpms.com.
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('Location');
        if (loc) {
          const rewritten = new URL(loc, upstream).pathname;
          const out = new Response(null, { status: resp.status });
          out.headers.set('Location', rewritten);
          return out;
        }
      }

      return resp;
    }

    return env.ASSETS.fetch(request);
  },
};
