/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração para passar os cookies entre páginas e API routes
  async headers() {
    return [
      {
        // Aplica a todas as API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  // Configuração para lidar com CORS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig