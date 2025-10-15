import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Настройки для домена yoplix.ru
  trailingSlash: false,
  poweredByHeader: false,
  
  // Настройки для продакшена
  output: 'standalone',
  
  // Редиректы для домена
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Настройки для изображений
  images: {
    domains: ['yoplix.ru'],
    formats: ['image/webp', 'image/avif'],
  },

  // Настройки безопасности
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
