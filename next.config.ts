import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // Expo talk QR — printed on Talk 1 slides/handouts. Keep non-permanent so it can be repointed.
      { source: "/book", destination: "/videoproduction", permanent: false },
      // ── THE QR BAKED INTO THE STREAMSTAGE FILM ────────────────────────────
      // The film's QR is on screen for its whole 177 s and decodes to
      // /expo-leads.html (verified: 60 of 60 sampled frames). That page carries
      // no `a=` asset, so the route's autoresponder never fires — a visitor who
      // scans the booth TV was promised six films and received nothing — and it
      // marks NAME as required, the one field the booth deliberately stopped
      // asking for. Every *generated* booth QR already points at /g correctly;
      // only the baked-in one is wrong, and fixing that in the film means a
      // re-render. Redirecting the destination fixes the film, and every printed
      // artefact aimed there, without re-rendering anything.
      //
      // `missing` is load-bearing: the booth kiosk opens this same page as
      // /expo-leads.html?staff=1 for the operator's own manual entry
      // (expo-assets/kiosk/kiosk.js:123 — "the EXISTING form. Do not build a
      // second one."). A blanket redirect would take the staff form away at the
      // booth, so a request that carries `staff` is left alone.
      {
        source: "/expo-leads.html",
        missing: [{ type: "query", key: "staff" }],
        destination: "/g?a=sixfilms&src=booth_tv&p=streamstage&s=tv",
        permanent: false,
      },
      // Client demo moved to dedicated demo host
      { source: "/dance-attack", destination: "https://dance-attack.demos.streamstage.live", permanent: true },
      { source: "/dance-attack/:path*", destination: "https://dance-attack.demos.streamstage.live/:path*", permanent: true },
      // Old proposal builders → new pages
      { source: "/recital-media", destination: "/dancerecital", permanent: true },
      { source: "/proposal-builder-dance", destination: "/dancepromo", permanent: true },
      { source: "/recitalsop", destination: "/dancerecital", permanent: true },
      // Old proposal builders not yet ported → contact
      { source: "/proposal-builder-concert", destination: "/#contact", permanent: false },
      { source: "/proposal-builder-theatrical", destination: "/#contact", permanent: false },
      { source: "/proposal-builder-tribute", destination: "/#contact", permanent: false },
      { source: "/proposal-builder-videoproduction", destination: "/videoproduction", permanent: true },
      // Old main pages → new sections or pages
      { source: "/home", destination: "/", permanent: true },
      { source: "/dance", destination: "/dance", permanent: true },
      { source: "/aboutus", destination: "/#team", permanent: true },
      { source: "/contact", destination: "/#contact", permanent: true },
      { source: "/business", destination: "/#business-video", permanent: true },
      { source: "/shows", destination: "/#contact", permanent: false },
      { source: "/music", destination: "/#contact", permanent: false },
      { source: "/weddings", destination: "/#contact", permanent: false },
      { source: "/forconferences", destination: "/#contact", permanent: false },
      // Old testimonial pages → main testimonials section
      { source: "/testimonials", destination: "/#testimonials", permanent: true },
      { source: "/testimonials-home", destination: "/#testimonials", permanent: true },
      { source: "/testimonials-home/:slug", destination: "/#testimonials", permanent: true },
      { source: "/business-testimonials", destination: "/#testimonials", permanent: true },
      { source: "/business-testimonials/:slug", destination: "/#testimonials", permanent: true },
      { source: "/shows-testimonials", destination: "/#testimonials", permanent: true },
      { source: "/shows-testimonials/:slug", destination: "/#testimonials", permanent: true },
      { source: "/wedding-testimonials", destination: "/#testimonials", permanent: true },
      { source: "/wedding-testimonials/:slug", destination: "/#testimonials", permanent: true },
      // Old content pages → blog
      { source: "/dancecompguide", destination: "/blog", permanent: true },
      { source: "/dancecomptroubleshoot", destination: "/blog", permanent: true },
      // Squarespace artifacts
      { source: "/gallery-staging", destination: "/", permanent: true },
      { source: "/media-homepage-template", destination: "/", permanent: true },
      { source: "/live-page-template-1", destination: "/", permanent: true },
      { source: "/store", destination: "/#contact", permanent: false },
      // /privacy-policy now has its own page — no redirect needed
      // Old /recitals path (if anyone bookmarked during brief period it was live)
      { source: "/recitals", destination: "/dance", permanent: true },
      { source: "/recitals/proposal", destination: "/dancerecital", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Expo talk QR — the big code on Talk 1's closing slide. Rewrite (not redirect) so the
      // address bar stays on the clean /checklist the QR advertises.
      { source: "/checklist", destination: "/checklist.html" },
      // Every printed QR points at /g?a=<asset>&src=&p=&s= — one gated landing
      // page. Rewrite, not redirect, so the address bar keeps the short URL the
      // code advertises and the query string survives.
      { source: "/g", destination: "/g.html" },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; media-src 'self' https:; frame-src 'self' https://vercel.live;",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          ...(process.env.VERCEL_ENV !== "production"
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
