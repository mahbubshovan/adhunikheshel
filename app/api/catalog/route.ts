import {getProducts} from '../../../lib/catalog-server';
import {json,failure} from '../../../lib/server';
import {deliveryFees} from '../../../lib/catalog';
export async function GET(){try{return json({products:await getProducts(),deliveryFees})}catch(e){return failure(e)}}
