import { signedIn,unauthorized,noStore } from '../../../../lib/auth';
import { latestReading,storageFailure } from '../../../../lib/database';
export const dynamic='force-dynamic';
export async function GET(){if(!await signedIn())return unauthorized();try{return Response.json(await latestReading(),{headers:noStore});}catch{return storageFailure();}}
