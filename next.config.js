// v3
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Wildcarded so this doesn't break if the Supabase project ever changes —
    // Next/Image blocks any src whose domain isn't allowlisted here, and a
    // hardcoded project domain has already silently broken avatar images on
    // other apps forked from this codebase.
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
