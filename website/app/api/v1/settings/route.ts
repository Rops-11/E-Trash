import { signedIn,validOrigin,unauthorized,noStore } from '../../../../lib/auth';
import { readSettings,saveSettings } from '../../../../lib/database';
import { settingsSchema } from '../../../../lib/settings-schema';
import { readJson } from '../../../../lib/request';
export const dynamic='force-dynamic';
export async function GET(){if(!await signedIn())return unauthorized();return Response.json(readSettings(),{headers:noStore});}
export async function PUT(request:Request){
 if(!await signedIn())return unauthorized();
 if(!validOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});
 let data:unknown;try{data=await readJson(request,2048);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid settings.'},{status:400});}
 const result=settingsSchema.safeParse(data);if(!result.success)return Response.json({error:result.error.issues[0]?.message||'Invalid settings.'},{status:400});
 return Response.json(saveSettings(result.data),{headers:noStore});
}
