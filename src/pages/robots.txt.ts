import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: https://adhunikheshel.com/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
};
