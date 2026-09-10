export type Variant={id:string;grams:number;price:number};
export type Product={id:string;name:string;description:string;image:string;category:string;variants:Variant[]};
export const deliveryFees={dhaka:80,outside:120} as const;
export const money=(n:number)=>'৳'+n.toLocaleString('bn-BD');
export const bn=(n:number)=>n.toLocaleString('bn-BD');
export const statusLabels:Record<string,string>={pending:'নতুন অর্ডার',confirmed:'নিশ্চিত',preparing:'প্রস্তুত হচ্ছে',shipped:'ডেলিভারির পথে',delivered:'ডেলিভারি সম্পন্ন',cancelled:'বাতিল'};
