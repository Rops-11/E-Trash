import { signedIn,unauthorized,noStore } from '../../../../lib/auth';
import { latestReading } from '../../../../lib/database';
export const dynamic='force-dynamic';
export async function GET(){if(!await signedIn())return unauthorized();return Response.json(latestReading(),{headers:noStore});}
