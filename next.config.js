/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable image optimization during development
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Increase build timeout for larger applications
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  },
  // Configure webpack for better build performance
  webpack: (config, { isServer }) => {
    // Optimize build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig; 