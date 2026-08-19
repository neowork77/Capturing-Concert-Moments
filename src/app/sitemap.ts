import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://watashiwajp.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return [
    {
      url: cleanBaseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
