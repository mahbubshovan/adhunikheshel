import { getDb } from '../db';
import type { Product, Variant } from './catalog';
export async function getProducts(): Promise<Product[]> {
  const db = getDb();
  const p = await db.prepare('SELECT id,name,description,image,category FROM products WHERE active=1 ORDER BY rowid').all<Omit<Product, 'variants'>>();
  const v = await db.prepare('SELECT id,product_id,grams,price FROM variants ORDER BY grams').all<Variant & { product_id: string }>();
  return p.results.map(p => ({ ...p, variants: v.results.filter(v => v.product_id === p.id) }));
}
