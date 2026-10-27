import { cookies } from 'next/headers';
import { appOrigin,cookieName,validOrigin } from '../../../../lib/auth';
export async function POST(request:Request){
 if(!validOrigin(request))return new Response('Invalid request origin.',{status:403});
 (await cookies()).delete(cookieName);
 return Response.redirect(new URL('/login',appOrigin()),303);
}
