/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['meizizi.com.br', 'res.cloudinary.com', 'images.unsplash.com', 'via.placeholder.com', 'localhost'],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      // Redirecionamentos hardcoded para QR codes específicos
      {
        source: '/qrcode/C1',
        destination: '/qrcode/C801', // Exemplo: redirecionar C1 para M1
        permanent: true, // Redirecionamento permanente (código 308)
      },
      {
        source: '/qrcode/C2',
        destination: '/qrcode/C802',
        permanent: true,
      },
      {
        source: '/qrcode/C3',
        destination: '/qrcode/C803',
        permanent: true,
      },
      {
        source: '/qrcode/C4',
        destination: '/qrcode/C804',
        permanent: true,
      },
      {
        source: '/qrcode/C5',
        destination: '/qrcode/C805',
        permanent: true,
      },
      {
        source: '/qrcode/C6',
        destination: '/qrcode/C806%20包厢',
        permanent: true,
      },
      {
        source: '/qrcode/C7',
        destination: '/qrcode/C807%20包厢',
        permanent: true,
      },
      {
        source: '/qrcode/C8',
        destination: '/qrcode/C808%20大圆桌',
        permanent: true,
      },
      {
        source: '/qrcode/C9',
        destination: '/qrcode/C809',
        permanent: true,
      },
      {
        source: '/qrcode/C10',
        destination: '/qrcode/C810',
        permanent: true,
      },
      {
        source: '/qrcode/C11',
        destination: '/qrcode/C811',
        permanent: true,
      },
      {
        source: '/qrcode/C12',
        destination: '/qrcode/C812%20大圆桌',
        permanent: true,
      },
      {
        source: '/qrcode/C13',
        destination: '/qrcode/C813',
        permanent: true,
      },
      {
        source: '/qrcode/C14',
        destination: '/qrcode/C814',
        permanent: true,
      },
      {
        source: '/qrcode/C15',
        destination: '/qrcode/C815',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_API_URL 
          ? `${process.env.INTERNAL_API_URL}/:path*` 
          : 'https://restaurantebackend-production.up.railway.app/:path*', // Use a URL interna como fallback
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;