import {getDb} from '../../../db';
import {body,sameOrigin,json,failure,HttpError,limit,hash} from '../../../lib/server';
import {deliveryFees} from '../../../lib/catalog';
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
return json({id,subtotal,delivery,total,status:'pending'},201)}catch(e){return failure(e)}}
