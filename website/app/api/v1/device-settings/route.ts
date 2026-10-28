import { validDevice,unauthorized,noStore } from '../../../../lib/auth';
import { readSettings,storageFailure } from '../../../../lib/database';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!validDevice(request))return unauthorized();try{const s=await readSettings();return new Response([s.revision,s.empty_distance_cm,s.full_distance_cm,s.temperature_threshold_c,s.humidity_threshold_percent,s.buzzer_enabled?1:0].join(','),{headers:{...noStore,'Content-Type':'text/plain; charset=utf-8'}});}catch{return storageFailure();}}
