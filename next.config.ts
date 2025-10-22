import { config } from 'dotenv';
import 'dotenv/config'
import type { NextConfig } from "next"

const envFilePath = process.env.ENV_FILE_PATH

if (envFilePath) {
  config({ path: envFilePath });
}

const nextConfig: NextConfig = {
  experimental: {
    ppr: false,
  },
  images: {
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "assets.pipedream.net",
      },
      {
        protocol: "https",
        hostname: "pipedream.com",
        pathname: "/s.v0/**",
      },
    ],
  },
  output: "standalone",
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
}

export default nextConfig
