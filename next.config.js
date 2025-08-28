/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'phpnzxxlsxcohttsfemm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // Add common image hosting domains
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

module.exports = nextConfig;