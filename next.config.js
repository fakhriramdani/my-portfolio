/** @type {import('next').NextConfig} */

// Production deploy guard (BR-016, AC-011.6). GitHub Actions sets CI=true.
// Local `npm run build` (no CI) falls back to http://localhost:3000 via the
// resolveSiteUrl() helper, so local builds stay green while production
// deploys without SITE_URL fail fast with the exact E_META message.
if (process.env.CI === "true" && !process.env.SITE_URL) {
  throw new Error("E_META: SITE_URL is required for production build");
}

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
