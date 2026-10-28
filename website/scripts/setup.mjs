import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const password=randomBytes(18).toString('base64url');
const content=`APP_ORIGIN=http://localhost:3000\nADMIN_PASSWORD=${password}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nDEVICE_API_TOKEN=${randomBytes(32).toString('hex')}\nNEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\nSUPABASE_SECRET_KEY=\n`;
try{writeFileSync('.env.local',content,{flag:'wx',mode:0o600});console.log('Created .env.local. Open it locally to read your dashboard password and device token. Keep this file private.');}catch(e){if(e.code==='EEXIST'){console.error('.env.local already exists. Your settings were preserved.');process.exitCode=1;}else throw e;}
