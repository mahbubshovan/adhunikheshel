import type { APIRoute } from 'astro';
import { getProducts } from '../../../lib/catalog-server';
import { deliveryFees } from '../../../lib/catalog';
import { json, failure } from '../../../lib/server';

export const GET: APIRoute = async () => {
  try {
    return json({ products: await getProducts(), deliveryFees });
  } catch (e) {
    return failure(e);
  }
};
