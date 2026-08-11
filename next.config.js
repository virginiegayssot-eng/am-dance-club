// v3
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["img.youtube.com", "ecakskvqlwsfnpuaurfq.supabase.co"],
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
