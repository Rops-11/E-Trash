import { validDevice,unauthorized,noStore } from '../../../../lib/auth';
import { saveReading } from '../../../../lib/database';
import { readJson } from '../../../../lib/request';
import { telemetrySchema,normalizeTelemetry } from '../../../../lib/telemetry';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!validDevice(request))return unauthorized();
 let body:unknown;try{body=await readJson(request);}catch{return Response.json({error:'Invalid telemetry request.'},{status:400});}
 const result=telemetrySchema.safeParse(body);if(!result.success)return Response.json({error:'Invalid telemetry.'},{status:400});
 saveReading(result.data.device_id,normalizeTelemetry(result.data));return Response.json({accepted:true,received_at:Date.now()},{headers:noStore});
}
