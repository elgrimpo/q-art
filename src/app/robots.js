export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/mycodes', '/profile'],
    },
    sitemap: 'https://www.qr-ai.co/sitemap.xml',
  };
}
