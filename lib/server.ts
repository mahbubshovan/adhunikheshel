import { env } from 'cloudflare:workers';
import { getDb } from '../db';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: 'সার্ভারে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।' }, 500);
}
export async function body(req: Request) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'JSON প্রয়োজন');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'তথ্য সঠিক নয়');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) { await reader.cancel(); throw new HttpError(413, 'তথ্য অনেক বড়') }
      chunks.push(value);
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new HttpError(400, 'তথ্য সঠিক নয়') }
}
export async function sessionHash(token: string) {
  const secret = (env as unknown as { ADMIN_PASSWORD?: string }).ADMIN_PASSWORD;
  if (!secret || secret.length < 16) throw new HttpError(503, 'অ্যাডমিন পাসওয়ার্ড সেট করা হয়নি।');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function passwordMatches(input: string, expected: string) {
  const a = await hash(input), b = await hash(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin !== new URL(req.url).origin) throw new HttpError(403, 'অনুমোদিত নয়');
}
export async function hash(s: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function limit(req: Request, kind: string, max: number) {
  const key = kind + ':' + (req.headers.get('cf-connecting-ip') || 'local');
  const now = Date.now();
  const r = await getDb().prepare(
    'INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count'
  ).bind(key, now + 900000, now, now).first<{ count: number }>();
  if (r!.count > max) throw new HttpError(429, 'অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।');
}
export function secureAdminTransport(req: Request) {
  const u = new URL(req.url);
  if (u.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw new HttpError(403, 'HTTPS প্রয়োজন');
}
export async function requireAdmin(req: Request) {
  secureAdminTransport(req);
  const token = req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('ah_session='))?.slice(11);
  if (!token) throw new HttpError(401, 'লগইন করুন');
  const session = await getDb().prepare('SELECT expires_at FROM sessions WHERE token_hash=? AND expires_at>?').bind(await sessionHash(token), Date.now()).first();
  if (!session) throw new HttpError(401, 'আবার লগইন করুন');
}
