import 'server-only';
import { defaultSettings,settingsSchema,appliedSettingsSchema,type Settings } from './settings-schema';
import { telemetrySchema,normalizeTelemetry } from './telemetry';

// Only Next.js server routes import this module. Never use the publishable key
// for these private tables or send the secret key to the browser/ESP32.
export class StorageError extends Error {
 constructor(){super('Supabase storage is unavailable. Check the server environment variables and run supabase-schema.sql.');this.name='StorageError';}
}
export function storageFailure(){return Response.json({error:new StorageError().message},{status:503,headers:{'Cache-Control':'no-store'}});}
async function request(path:string,init:RequestInit={}):Promise<unknown>{
 const secret=process.env.SUPABASE_SECRET_KEY;
 const configuredUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!secret?.startsWith('sb_secret_')||!configuredUrl)throw new StorageError();
 let url:URL;
 try{url=new URL(configuredUrl);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error();}catch{throw new StorageError();}
 try{
  const response=await fetch(new URL('/rest/v1/'+path,url),{
   ...init,cache:'no-store',signal:AbortSignal.timeout(10000),
   headers:{'Content-Type':'application/json',...init.headers,apikey:secret},
  });
  if(!response.ok)throw new StorageError();
  const text=await response.text();
  return text?JSON.parse(text):null;
 }catch{throw new StorageError();}
}
function firstRow(value:unknown):Record<string,unknown>|undefined{
 if(!Array.isArray(value))throw new StorageError();
 if(value.length===0)return undefined;
 if(!value[0]||typeof value[0]!=='object'||Array.isArray(value[0]))throw new StorageError();
 return value[0];
}
function settingsFromRow(row:Record<string,unknown>):Settings{
 if(!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload))throw new StorageError();
 const result=appliedSettingsSchema.safeParse({...row.payload,revision:row.revision});
 if(!result.success)throw new StorageError();
 return result.data;
}
export async function readSettings():Promise<Settings>{
 const row=firstRow(await request('e_trash_device_settings?id=eq.1&select=revision,payload&limit=1'));
 return row?settingsFromRow(row):{...defaultSettings};
}
export async function saveSettings(input:unknown):Promise<Settings>{
 const values=settingsSchema.parse(input);
 // The PostgreSQL function increments the revision atomically, even when
 // concurrent saves are handled by different Vercel function instances.
 const row=firstRow(await request('rpc/e_trash_save_settings',{method:'POST',body:JSON.stringify({p_payload:values})}));
 if(!row)throw new StorageError();
 return settingsFromRow(row);
}
export async function saveReading(deviceId:string,payload:ReturnType<typeof normalizeTelemetry>){
 await request('e_trash_device_status?on_conflict=device_id',{
  method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
  body:JSON.stringify({device_id:deviceId,received_at:Date.now(),payload}),
 });
}
export async function latestReading(){
 const row=firstRow(await request('e_trash_device_status?select=received_at,payload&order=received_at.desc&limit=1'));
 if(!row)return {connected:false,reason:'not_paired'};
 if(!row.payload||typeof row.payload!=='object'||Array.isArray(row.payload))throw new StorageError();
 const payload=row.payload as Record<string,unknown>;
 const {bin_full:_full,environment_alert:_alert,...raw}=payload;
 const parsed=telemetrySchema.safeParse(raw);
 const receivedAt=Number(row.received_at);
 if(!parsed.success||!Number.isSafeInteger(receivedAt)||receivedAt<0)throw new StorageError();
 const data=normalizeTelemetry(parsed.data),age=Math.max(0,Date.now()-receivedAt),connected=age<120000;
 return {...data,connected,received_at:receivedAt,age_ms:age,distance_valid:connected&&data.distance_valid,environment_valid:connected&&data.environment_valid,
 ...(!connected?{distance_m:null,fill_percent:null,temperature_c:null,humidity_percent:null,bin_full:false,environment_alert:false}:{})};
}
