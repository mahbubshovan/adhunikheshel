import type { APIRoute } from 'astro';
import { getDb } from '../../../../db';
import { body, json, sameOrigin, failure, HttpError, sessionHash, passwordMatches, limit, requireAdmin, secureAdminTransport } from '../../../../lib/server';

export const POST: APIRoute = async ({ request: req }) => {
  try {
    secureAdminTransport(req);
    sameOrigin(req);
    await limit(req, 'login', 10);
    const { password } = await body(req);
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || expected.length < 16) throw new HttpError(503, 'অ্যাডমিন পাসওয়ার্ড সেট করা হয়নি।');
    if (typeof password !== 'string' || !await passwordMatches(password, expected)) throw new HttpError(401, 'পাসওয়ার্ড সঠিক নয়।');
    const token = crypto.randomUUID() + crypto.randomUUID();
    await getDb().prepare('INSERT INTO sessions (token_hash,expires_at) VALUES (?,?)').bind(await sessionHash(token), Date.now() + 43200000).run();
    const isHttps = new URL(req.url).protocol === 'https:';
    return json({ ok: true }, 200, {
      'Set-Cookie': `ah_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${isHttps ? '; Secure' : ''}`,
    });
  } catch (e) {
    return failure(e);
  }
};

export const GET: APIRoute = async ({ request: req }) => {
  try {
    await requireAdmin(req);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
};

export const DELETE: APIRoute = async ({ request: req }) => {
  try {
    secureAdminTransport(req);
    sameOrigin(req);
    const token = req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('ah_session='))?.slice(11);
    if (token) await getDb().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sessionHash(token)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': 'ah_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
  } catch (e) {
    return failure(e);
  }
};
