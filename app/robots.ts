import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/', '/admin/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://yoplix.ru'}/sitemap.xml`,
  }
}

