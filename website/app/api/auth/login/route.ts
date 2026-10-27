import { cookies } from 'next/headers';
import { appOrigin,configured,cookieName,issueSession,loginFailed,loginLimited,loginSucceeded,noStore,validOrigin,validPassword } from '../../../../lib/auth';
import { readJson } from '../../../../lib/request';
export async function POST(request:Request){
 if(!validOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});
 if(!configured())return Response.json({error:'Run npm run setup before signing in.'},{status:503,headers:noStore});
 if(loginLimited())return Response.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429,headers:noStore});
 let body:unknown;try{body=await readJson(request,1024);}catch{return Response.json({error:'Invalid sign-in request.'},{status:400});}
 if(!body||typeof body!=='object'||!('password' in body)||typeof body.password!=='string'||!validPassword(body.password)){loginFailed();return Response.json({error:'Incorrect password.'},{status:401,headers:noStore});}
 loginSucceeded();(await cookies()).set(cookieName,issueSession(),{httpOnly:true,sameSite:'strict',secure:appOrigin().startsWith('https://'),path:'/',maxAge:8*60*60});
 return Response.json({ok:true},{headers:noStore});
}
