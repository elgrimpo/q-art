export default function sitemap() {
  return [
    { url: 'https://www.qr-ai.co/generate',      lastModified: new Date(), priority: 1.0 },
    { url: 'https://www.qr-ai.co/explore',        lastModified: new Date(), priority: 0.9 },
    { url: 'https://www.qr-ai.co/how-it-works',   lastModified: new Date(), priority: 0.8 },
    { url: 'https://www.qr-ai.co/pricing',        lastModified: new Date(), priority: 0.8 },
    { url: 'https://www.qr-ai.co/faq',            lastModified: new Date(), priority: 0.7 },
    { url: 'https://www.qr-ai.co/blog',           lastModified: new Date(), priority: 0.6 },
    { url: 'https://www.qr-ai.co/blog/qr-code-that-looks-like-art', lastModified: new Date('2026-07-14'), priority: 0.7 },
    { url: 'https://www.qr-ai.co/privacy',        lastModified: new Date(), priority: 0.3 },
    { url: 'https://www.qr-ai.co/terms',          lastModified: new Date(), priority: 0.3 },
  ];
}
