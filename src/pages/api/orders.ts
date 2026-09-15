import type { APIRoute } from 'astro';
import { getDb } from '../../../db';
import { body, sameOrigin, json, failure, HttpError, limit, hash } from '../../../lib/server';
import { deliveryFees } from '../../../lib/catalog';

const areaLabel = { dhaka: 'ঢাকার ভিতরে', outside: 'ঢাকার বাইরে', mirpur_dohs: 'মিরপুর ডিওএইচএস (ফ্রি ডেলিভারি)' } as const;
const money = (n: number) => '৳' + n.toLocaleString('bn-BD');

async function notifyTelegram(order: { id: string; customerName: string; phone: string; address: string; area: string; notes: string; subtotal: number; delivery: number; total: number; lines: { name: string; grams: number; quantity: number; price: number }[] }, cfg: { token: string; chatIds: string[] }) {
  const items = order.lines.map(i => `• ${i.name} (${i.grams}g) × ${i.quantity} = ৳${i.quantity * i.price}`).join('\n');
  const text = `🛍 *নতুন অর্ডার — ${order.id}*\n\n*ক্রেতা:* ${order.customerName}\n*ফোন:* ${order.phone}\n*এলাকা:* ${areaLabel[order.area as keyof typeof areaLabel] || order.area}\n*ঠিকানা:* ${order.address}${order.notes ? `\n*নির্দেশনা:* ${order.notes}` : ''}\n\n*পণ্য:*\n${items}\n\n*পণ্যমূল্য:* ${money(order.subtotal)}\n*ডেলিভারি:* ${money(order.delivery)}\n*মোট:* ${money(order.total)}\n*পেমেন্ট:* ক্যাশ অন ডেলিভারি`;
  await Promise.all(cfg.chatIds.map(chat_id => fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }) })));
}

export const POST: APIRoute = async ({ request: req }) => {
  try {
    sameOrigin(req);
    const data = await body(req);
    const { customerName, phone, address, area, notes = '', items, requestKey } = data;

    if (
      typeof customerName !== 'string' || customerName.trim().length < 2 || customerName.length > 100 ||
      typeof address !== 'string' || address.trim().length < 10 || address.length > 500 ||
      typeof notes !== 'string' || notes.length > 500
    ) throw new HttpError(400, 'নাম ও সম্পূর্ণ ঠিকানা সঠিকভাবে লিখুন।');

    const normalizedPhone = typeof phone === 'string'
      ? phone.replace(/[০-৯]/g, c => String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/[\s-]/g, '').replace(/^\+?88/, '')
      : '';
    if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) throw new HttpError(400, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।');
    if (area !== 'dhaka' && area !== 'outside' && area !== 'mirpur_dohs') throw new HttpError(400, 'ডেলিভারি এলাকা বেছে নিন।');
    if (typeof requestKey !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(requestKey) || !Array.isArray(items) || items.length < 1 || items.length > 16)
      throw new HttpError(400, 'ব্যাগের পণ্য সঠিক নয়।');

    const seen = new Set();
    for (const i of items) {
      if (!i || typeof i.variantId !== 'string' || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 20 ||
        (i.type !== undefined && (typeof i.type !== 'string' || i.type.length > 100)))
        throw new HttpError(400, 'পণ্যের পরিমাণ সঠিক নয়।');
      const dk = i.variantId + '|' + (i.type || '');
      if (seen.has(dk)) throw new HttpError(400, 'পণ্যের পরিমাণ সঠিক নয়।');
      seen.add(dk);
    }

    const requestHash = await hash(JSON.stringify({
      customerName: customerName.trim(), phone: normalizedPhone, address: address.trim(),
      area, notes: notes.trim(),
      items: [...items].sort((a: { variantId: string; type?: string }, b: { variantId: string; type?: string }) =>
        (a.variantId + (a.type || '')).localeCompare(b.variantId + (b.type || ''))),
    }));

    const db = getDb();
    const existing = await db.prepare('SELECT id,total,subtotal,delivery,status,request_hash FROM orders WHERE request_key=?').bind(requestKey).first<Record<string, unknown>>();
    if (existing) {
      if (existing.request_hash !== requestHash) throw new HttpError(409, 'নতুন অর্ডার আবার চেষ্টা করুন।');
      const { request_hash, ...safe } = existing;
      return json(safe);
    }

    await limit(req, 'orders', 30);

    const rows = await db.prepare('SELECT v.id,v.grams,v.price,p.name FROM variants v JOIN products p ON p.id=v.product_id WHERE p.active=1').all<{ id: string; grams: number; price: number; name: string }>();
    const lines = items.map((i: { variantId: string; quantity: number; type?: string }) => {
      const v = rows.results.find(v => v.id === i.variantId);
      if (!v) throw new HttpError(400, 'পণ্যটি এখন পাওয়া যাচ্ছে না।');
      return { ...v, name: i.type || v.name, quantity: i.quantity };
    });

    const subtotal = lines.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
    const delivery = deliveryFees[area as keyof typeof deliveryFees];
    const total = subtotal + delivery;
    const id = 'AH-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();

    try {
      await db.batch([
        db.prepare('INSERT INTO orders (id,request_key,request_hash,customer_name,phone,address,area,notes,subtotal,delivery,total,payment_method,payment_status,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,\'cod\',\'unpaid\',\'pending\',?)')
          .bind(id, requestKey, requestHash, customerName.trim(), normalizedPhone, address.trim(), area, notes.trim(), subtotal, delivery, total, createdAt),
        ...lines.map((i: { id: string; name: string; grams: number; quantity: number; price: number }) =>
          db.prepare('INSERT INTO order_items (id,order_id,variant_id,name,grams,quantity,unit_price) VALUES (?,?,?,?,?,?,?)')
            .bind(crypto.randomUUID(), id, i.id, i.name, i.grams, i.quantity, i.price)),
      ]);
    } catch (e) {
      const duplicate = await db.prepare('SELECT id,total,subtotal,delivery,status,request_hash FROM orders WHERE request_key=?').bind(requestKey).first<Record<string, unknown>>();
      if (duplicate && duplicate.request_hash === requestHash) {
        const { request_hash, ...safe } = duplicate;
        return json(safe);
      }
      throw e;
    }

    const cfg = process.env as { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string };
    if (cfg.TELEGRAM_BOT_TOKEN && cfg.TELEGRAM_CHAT_ID) {
      await notifyTelegram(
        { id, customerName: customerName.trim(), phone: normalizedPhone, address: address.trim(), area, notes: notes.trim(), subtotal, delivery, total, lines },
        { token: cfg.TELEGRAM_BOT_TOKEN, chatIds: cfg.TELEGRAM_CHAT_ID.split(',').map((s: string) => s.trim()).filter(Boolean) }
      ).catch(() => {});
    }

    return json({ id, subtotal, delivery, total, status: 'pending' }, 201);
  } catch (e) {
    return failure(e);
  }
};
