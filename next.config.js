/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Verificar se estamos no Railway
    if (process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT) {
      console.log('Configurando rewrites para ambiente de produção fora do Railway');
      // Se estamos em produção mas não no Railway (ex: Vercel), usar o proxy
      return [
        {
          source: '/api/:path*',
          destination: 'https://restaurantebackend-production.up.railway.app/:path*',
        }
      ];
    }
    // Em desenvolvimento ou no Railway, não aplicar nenhum rewrite
    console.log('Sem rewrites configurados - usando comunicação direta');
    return [];
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
}

module.exports = nextConfig 