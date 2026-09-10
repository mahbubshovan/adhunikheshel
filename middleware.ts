import {NextRequest,NextResponse} from 'next/server';
export function middleware(req:NextRequest){
 const response=NextResponse.next();
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 response.headers.set('Content-Security-Policy',"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
 if(req.nextUrl.protocol==='https:')response.headers.set('Strict-Transport-Security','max-age=31536000');
 if(req.nextUrl.pathname.startsWith('/admin')||req.nextUrl.pathname.startsWith('/api/')){response.headers.set('X-Robots-Tag','noindex, nofollow');response.headers.set('Cache-Control','private, no-store')}
 return response;
}
