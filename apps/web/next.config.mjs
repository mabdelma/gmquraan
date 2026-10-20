// Content-Security-Policy — added report-only first so it can never break the
// launch; switch the header key to "Content-Security-Policy" to enforce once the
// browser console shows no violations.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "connect-src 'self' https://api.stripe.com https://api.openai.com https://*.openai.com wss://*.openai.com https://fcm.googleapis.com https://oauth2.googleapis.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/card/:name", destination: "/card/:name.html" }];
  },
  experimental: {
    // The web app is a thin BFF that also bundles @app/shared + @app/db from the workspace.
    externalDir: true,
  },
  // Workspace packages (@app/shared, @app/db) are TS sources that use ESM-correct
  // ".js" relative imports. Let webpack resolve those to their ".ts" siblings.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
  // Short link encoded in the business-card QR codes. Keeping the payload
  // small drops the QR from v4 (33x33) to v3 (29x29), so the modules render
  // noticeably bigger and scan more reliably.
  async redirects() {
    return [
      { source: "/c/:slug", destination: "/cards/:slug.vcf", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
