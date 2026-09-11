import type { APIRoute } from 'astro';

const BASE = 'https://adhunikheshel.com';

export const GET: APIRoute = () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
