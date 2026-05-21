/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push({
      canvas: 'commonjs canvas',
    });

    return config;
  },
};

module.exports = nextConfig;
