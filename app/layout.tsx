import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://adhunikheshel.com'),openGraph:{type:'website',locale:'bn_BD',siteName:'আধুনিক হেঁশেল',title:'আধুনিক হেঁশেল — ঘরোয়া স্বাদ, ভালোবাসার রান্না',description:'শুঁটকি ও ইলিশের আচার। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।'},title:'আধুনিক হেঁশেল — ঘরোয়া স্বাদ, ভালোবাসার রান্না',description:'ছুরি শুঁটকি, লইট্টা, পুঁটি চ্যাপা ও ইলিশের আচার। ক্যাশ অন ডেলিভারিতে অর্ডার করুন।',icons:{icon:'/images/logo.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="bn"><body>{children}</body></html>}
