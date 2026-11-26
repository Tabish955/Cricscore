import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // API-supplied team image URLs come from a.espncdn.com (and similar) hosts that our
  // own proxy cannot and should not re-fetch. We use plain <img> tags, so no remote
  // image configuration is required here.
}

export default nextConfig
