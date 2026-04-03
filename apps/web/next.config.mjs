/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      const apiUrl = 'http://localhost:8000';
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    },
};

export default nextConfig;
