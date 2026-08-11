// v3
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Wildcarded so this doesn't break every time the template is cloned for
    // a new client's own Supabase project (was previously hardcoded to a
    // specific project domain, which silently broke every avatar image —
    // Next/Image blocks any src whose domain isn't allowlisted here).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
