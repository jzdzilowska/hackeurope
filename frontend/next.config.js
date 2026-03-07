/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Required for GitHub Pages: https://username.github.io/hackeurope
  basePath: process.env.NODE_ENV === 'production' ? '/hackeurope' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/hackeurope/' : '',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
}

module.exports = nextConfig
