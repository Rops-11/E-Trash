import 'server-only';
import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const cookieName='e-trash-session';
const digest=(value:string)=>createHash('sha256').update(value).digest();
function equal(a:string,b:string){return timingSafeEqual(digest(a),digest(b));}
export function configured(){return (process.env.ADMIN_PASSWORD?.length??0)>=12&&(process.env.SESSION_SECRET?.length??0)>=32&&(process.env.DEVICE_API_TOKEN?.length??0)>=32;}
export function appOrigin(){try{return new URL(process.env.APP_ORIGIN||'http://localhost:3000').origin;}catch{return '';}}
export function validOrigin(request:Request){return request.headers.get('origin')===appOrigin();}
function signature(value:string){return createHmac('sha256',process.env.SESSION_SECRET!).update(value+':'+digest(process.env.ADMIN_PASSWORD!).toString('hex')).digest('hex');}
export function issueSession(){const payload=String(Date.now()+8*60*60*1000);return payload+'.'+signature(payload);}
export async function signedIn(){
 if(!configured())return false;
 const token=(await cookies()).get(cookieName)?.value;
 if(!token)return false;
 const [expires,mac,...extra]=token.split('.');
 return !extra.length&&/^\d{13}$/.test(expires)&&Number(expires)>Date.now()&&Number(expires)<=Date.now()+8*60*60*1000&&!!mac&&equal(mac,signature(expires));
}
export function validPassword(value:string){return configured()&&equal(value,process.env.ADMIN_PASSWORD!);}
export function validDevice(request:Request){
 const secret=process.env.DEVICE_API_TOKEN;
 return !!secret&&secret.length>=32&&equal(request.headers.get('authorization')||'','Bearer '+secret);
}
export const noStore={'Cache-Control':'no-store'};
export function unauthorized(){return Response.json({error:'Authentication required.'},{status:401,headers:noStore});}
// Single-admin login throttling. Also configure rate limits on a public deployment's reverse proxy.
let failures=0,windowStart=0;
export function loginLimited(){if(Date.now()-windowStart>15*60*1000){failures=0;windowStart=Date.now();}return failures>=10;}
export function loginFailed(){failures++;}
export function loginSucceeded(){failures=0;}
