import {env} from 'cloudflare:workers';
import {getDb} from '../../../db';
import {body,sameOrigin,json,failure,HttpError,limit,hash} from '../../../lib/server';
import {deliveryFees} from '../../../lib/catalog';

const areaLabel={dhaka:'ঢাকার ভিতরে',outside:'ঢাকার বাইরে'} as const;
const money=(n:number)=>'৳'+n.toLocaleString('bn-BD');

async function notifyTelegram(order:{id:string;customerName:string;phone:string;address:string;area:string;notes:string;subtotal:number;delivery:number;total:number;lines:{name:string;grams:number;quantity:number;price:number}[]},cfg:{token:string;chatId:string}){
  const items=order.lines.map(i=>`• ${i.name} (${i.grams}g) × ${i.quantity} = ৳${i.quantity*i.price}`).join('\n');
  const text=`🛍 *নতুন অর্ডার — ${order.id}*\n\n*ক্রেতা:* ${order.customerName}\n*ফোন:* ${order.phone}\n*এলাকা:* ${areaLabel[order.area as keyof typeof areaLabel]||order.area}\n*ঠিকানা:* ${order.address}${order.notes?`\n*নির্দেশনা:* ${order.notes}`:''}\n\n*পণ্য:*\n${items}\n\n*পণ্যমূল্য:* ${money(order.subtotal)}\n*ডেলিভারি:* ${money(order.delivery)}\n*মোট:* ${money(order.total)}\n*পেমেন্ট:* ক্যাশ অন ডেলিভারি`;
  await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cfg.chatId,text,parse_mode:'Markdown'})});
}

async function notifyEmail(order:{id:string;customerName:string;phone:string;address:string;area:string;notes:string;subtotal:number;delivery:number;total:number;lines:{name:string;grams:number;quantity:number;price:number}[]},apiKey:string){
  const rows=order.lines.map(i=>`<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.name} (${i.grams}g)</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">৳${i.quantity*i.price}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:580px;margin:auto;color:#1a2b40"><h2 style="background:#1a2b40;color:#fff;padding:20px;margin:0;border-radius:8px 8px 0 0">🛍 নতুন অর্ডার — ${order.id}</h2><div style="border:1px solid #e0e5eb;border-top:0;border-radius:0 0 8px 8px;padding:24px"><table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="padding:6px 0;color:#666;width:120px">ক্রেতা</td><td style="padding:6px 0;font-weight:600">${order.customerName}</td></tr><tr><td style="padding:6px 0;color:#666">ফোন</td><td style="padding:6px 0">${order.phone}</td></tr><tr><td style="padding:6px 0;color:#666">এলাকা</td><td style="padding:6px 0">${areaLabel[order.area as keyof typeof areaLabel]||order.area}</td></tr><tr><td style="padding:6px 0;color:#666">ঠিকানা</td><td style="padding:6px 0">${order.address}</td></tr>${order.notes?`<tr><td style="padding:6px 0;color:#666">নির্দেশনা</td><td style="padding:6px 0">${order.notes}</td></tr>`:''}</table><h3 style="margin:16px 0 8px">অর্ডার আইটেম</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f7fa"><th style="padding:8px;text-align:left">পণ্য</th><th style="padding:8px;text-align:center">পরিমাণ</th><th style="padding:8px;text-align:right">মূল্য</th></tr></thead><tbody>${rows}</tbody></table><div style="text-align:right;margin-top:16px;font-size:15px"><p style="margin:4px 0">পণ্যমূল্য: <b>৳${order.subtotal}</b></p><p style="margin:4px 0">ডেলিভারি: <b>৳${order.delivery}</b></p><p style="margin:4px 0;font-size:18px;border-top:2px solid #1a2b40;padding-top:8px">মোট: <b style="color:#1a2b40">৳${order.total}</b></p></div><p style="margin-top:20px;background:#eef3ef;padding:12px;border-radius:6px;font-size:14px">💳 পেমেন্ট পদ্ধতি: ক্যাশ অন ডেলিভারি — ডেলিভারিতে পরিশোধ</p></div></body></html>`;
  await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:'আধুনিক হেঁশেল <orders@adhunikheshel.com>',to:['admin@adhunikheshel.com'],subject:`নতুন অর্ডার ${order.id} — ${order.customerName}`,html})});
}

export async function POST(req:Request){try{sameOrigin(req);const data=await body(req);const {customerName,phone,address,area,notes='',items,requestKey}=data;
if(typeof customerName!=='string'||customerName.trim().length<2||customerName.length>100||typeof address!=='string'||address.trim().length<10||address.length>500||typeof notes!=='string'||notes.length>500)throw new HttpError(400,'নাম ও সম্পূর্ণ ঠিকানা সঠিকভাবে লিখুন।');
const normalizedPhone=typeof phone==='string'?phone.replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/[\s-]/g,'').replace(/^\+?88/,''):'';
if(!/^01[3-9]\d{8}$/.test(normalizedPhone))throw new HttpError(400,'সঠিক বাংলাদেশি মোবাইল নম্বর দিন।');
if(area!=='dhaka'&&area!=='outside')throw new HttpError(400,'ডেলিভারি এলাকা বেছে নিন।');
if(typeof requestKey!=='string'||!/^[a-zA-Z0-9-]{20,80}$/.test(requestKey)||!Array.isArray(items)||items.length<1||items.length>16)throw new HttpError(400,'ব্যাগের পণ্য সঠিক নয়।');
const seen=new Set();for(const i of items){if(!i||typeof i.variantId!=='string'||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20||seen.has(i.variantId))throw new HttpError(400,'পণ্যের পরিমাণ সঠিক নয়।');seen.add(i.variantId)}
const requestHash=await hash(JSON.stringify({customerName:customerName.trim(),phone:normalizedPhone,address:address.trim(),area,notes:notes.trim(),items:[...items].sort((a,b)=>a.variantId.localeCompare(b.variantId))}));
const db=getDb();const existing=await db.prepare('SELECT id,total,subtotal,delivery,status,request_hash FROM orders WHERE request_key=?').bind(requestKey).first();if(existing){if(existing.request_hash!==requestHash)throw new HttpError(409,'নতুন অর্ডার আবার চেষ্টা করুন।');const {request_hash,...safe}=existing;return json(safe)}
await limit(req,'orders',30);
const rows=await db.prepare('SELECT v.id,v.grams,v.price,p.name FROM variants v JOIN products p ON p.id=v.product_id WHERE p.active=1').all<{id:string;grams:number;price:number;name:string}>();
const lines=items.map(i=>{const v=rows.results.find(v=>v.id===i.variantId);if(!v)throw new HttpError(400,'পণ্যটি এখন পাওয়া যাচ্ছে না।');return {...v,quantity:i.quantity}});
const subtotal=lines.reduce((s,i)=>s+i.price*i.quantity,0),delivery=deliveryFees[area as keyof typeof deliveryFees],total=subtotal+delivery;
const id='AH-'+crypto.randomUUID().slice(0,8).toUpperCase();const createdAt=new Date().toISOString();
try{await db.batch([db.prepare('INSERT INTO orders (id,request_key,request_hash,customer_name,phone,address,area,notes,subtotal,delivery,total,payment_method,payment_status,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,\'cod\',\'unpaid\',\'pending\',?)').bind(id,requestKey,requestHash,customerName.trim(),normalizedPhone,address.trim(),area,notes.trim(),subtotal,delivery,total,createdAt),...lines.map(i=>db.prepare('INSERT INTO order_items (id,order_id,variant_id,name,grams,quantity,unit_price) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,i.id,i.name,i.grams,i.quantity,i.price))]);}catch(e){const duplicate=await db.prepare('SELECT id,total,subtotal,delivery,status,request_hash FROM orders WHERE request_key=?').bind(requestKey).first();if(duplicate&&duplicate.request_hash===requestHash){const{request_hash,...safe}=duplicate;return json(safe)}throw e}

// Await notifications (CF Worker terminates after Response — fire-and-forget is unreliable without ctx.waitUntil)
const cfg=env as unknown as {TELEGRAM_BOT_TOKEN?:string;TELEGRAM_CHAT_ID?:string;RESEND_API_KEY?:string};
const orderPayload={id,customerName:customerName.trim(),phone:normalizedPhone,address:address.trim(),area,notes:notes.trim(),subtotal,delivery,total,lines};
await Promise.allSettled([
  cfg.TELEGRAM_BOT_TOKEN&&cfg.TELEGRAM_CHAT_ID?notifyTelegram(orderPayload,{token:cfg.TELEGRAM_BOT_TOKEN,chatId:cfg.TELEGRAM_CHAT_ID}):Promise.resolve(),
  cfg.RESEND_API_KEY?notifyEmail(orderPayload,cfg.RESEND_API_KEY):Promise.resolve(),
]);

return json({id,subtotal,delivery,total,status:'pending'},201)}catch(e){return failure(e)}}
