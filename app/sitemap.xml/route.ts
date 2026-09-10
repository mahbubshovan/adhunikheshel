import {getDb} from '../../db';

const BASE = 'https://adhunikheshel.com';

export async function GET() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch active product categories to build category-aware lastmod
  let lastmod = today;
  try {
    const row = await db.prepare("SELECT date(MAX(rowid),'unixepoch') as d FROM products WHERE active=1").first<{d:string|null}>();
    if (row?.d) lastmod = row.d;
  } catch {}

  const urls = [
    {loc: `${BASE}/`, changefreq: 'weekly', priority: '1.0', lastmod},
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => [
      '  <url>',
      `    <loc>${u.loc}</loc>`,
      `    <lastmod>${u.lastmod}</lastmod>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
}
