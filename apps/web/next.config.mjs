/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
      '@supabase/ssr', 
      '@supabase/supabase-js', 
      '@supabase/auth-js', 
      '@supabase/postgrest-js', 
      '@supabase/storage-js', 
      '@supabase/functions-js'
    ],
    async rewrites() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    },
};

export default nextConfig;
