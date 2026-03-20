import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // Old proposal builders → new pages
      { source: "/recital-media", destination: "/dancerecital", permanent: true },
      { source: "/proposal-builder-dance", destination: "/dancepromo", permanent: true },
      { source: "/recitalsop", destination: "/dancerecital", permanent: true },
      // Old proposal builders not yet ported → contact
      { source: "/proposal-builder-concert", destination: "/#contact", permanent: false },
      { source: "/proposal-builder-theatrical", destination: "/#contact", permanent: false },
      { source: "/proposal-builder-tribute", destination: "/#contact", permanent: false },
      { source: "/proposal-builder-videoproduction", destination: "/#contact", permanent: false },
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
      { source: "/privacy-policy", destination: "/", permanent: false },
      // Old /recitals path (if anyone bookmarked during brief period it was live)
      { source: "/recitals", destination: "/dance", permanent: true },
      { source: "/recitals/proposal", destination: "/dancerecital", permanent: true },
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
