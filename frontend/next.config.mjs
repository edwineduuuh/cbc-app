/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second dev server run beside the first (e.g. one against the
  // live API, one against a local Django). Unset = the normal ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  // Security headers (safe set — no CSP yet; CSP is added separately once tested
  // against Cloudinary, Google Fonts, the API and IntaSend so it can't break
  // the app or checkout).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // camera=(self): the "photograph your working" upload uses
            // capture="environment", so allow the camera for our own origin.
            // mic/geolocation are unused → fully disabled.
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
