import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yoplix.ru'
  
  // Статичные страницы
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  // Страницы викторин
  const quizPages = [
    'movie-trivia',
    'science-quiz', 
    'history-challenge',
    'sports-master',
    'music-notes',
    'geography-world'
  ].map(slug => ({
    url: `${baseUrl}/quiz/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...quizPages]
}

