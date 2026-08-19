import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://watashiwajp.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/*', '/api/*'],
    },
    sitemap: `${cleanBaseUrl}/sitemap.xml`,
  };
}
