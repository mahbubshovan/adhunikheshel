import Storefront from './storefront';
import {getProducts} from '../lib/catalog-server';
export const metadata={alternates:{canonical:'https://adhunikheshel.com'}};
export default async function Home(){return <Storefront initialProducts={await getProducts()}/> }
