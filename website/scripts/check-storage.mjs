// Isolated storage/API contract tests. No real credentials or network calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const localRequire=createRequire(path.join(root,'package.json'));
const ts=localRequire('typescript');
const env={NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture_only'};
const state={settings:undefined,reading:undefined,fail:false,auth:true,device:true,origin:true,calls:[]};
const values={empty_distance_cm:75,full_distance_cm:5,temperature_threshold_c:39.5,humidity_threshold_percent:78.5,buzzer_enabled:false};
const auth={signedIn:async()=>state.auth,validDevice:()=>state.device,validOrigin:()=>state.origin,noStore:{'Cache-Control':'no-store'},unauthorized:()=>Response.json({error:'Authentication required.'},{status:401})};

async function fakeFetch(input,init){
 const url=new URL(input);state.calls.push({url,init});
 assert.equal(url.origin,'https://fixture.supabase.co');
 assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(init.cache,'no-store');
 if(state.fail)return Response.json({error:'private upstream detail must not leak'},{status:503});
 const name=url.pathname.split('/').pop();
 if(name==='e_trash_save_settings'){
  state.settings={revision:(state.settings?.revision??0)+1,payload:JSON.parse(init.body).p_payload};
  return Response.json([state.settings]);
 }
 if(name==='e_trash_device_settings')return Response.json(state.settings?[state.settings]:[]);
 if(name==='e_trash_device_status'&&init.method==='POST'){
  state.reading=JSON.parse(init.body);
  assert.equal(init.headers.Prefer,'resolution=merge-duplicates,return=minimal');
  // PostgREST may return an empty 201, rather than 204, after an insert.
  return new Response(null,{status:201});
 }
 if(name==='e_trash_device_status')return Response.json(state.reading?[state.reading]:[]);
 throw Error('Unexpected database request');
}

const modules=new Map();
function load(file){
 file=path.resolve(file);
 if(file===path.join(root,'lib/auth.ts'))return auth;
 if(modules.has(file))return modules.get(file).exports;
 const module={exports:{}};modules.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{
  module,exports:module.exports,
  require:spec=>spec==='server-only'?{}:spec==='zod'?localRequire(spec):load(path.resolve(path.dirname(file),spec)+'.ts'),
  process:{env},fetch:fakeFetch,URL,Response,Request,Headers,AbortSignal,Date,TextDecoder,TextEncoder,
 },{filename:file});
 return module.exports;
}

const db=load(path.join(root,'lib/database.ts'));
const telemetrySchema=load(path.join(root,'lib/telemetry.ts'));
assert.equal((await db.readSettings()).revision,0);
const first=await db.saveSettings(values);
assert.equal(first.revision,1);
assert.equal((await db.readSettings()).buzzer_enabled,false);
const revisions=await Promise.all(Array.from({length:10},()=>db.saveSettings(values)));
assert.equal(new Set(revisions.map(s=>s.revision)).size,10);
assert(state.calls.filter(c=>c.init.method==='POST').every(c=>c.url.pathname.endsWith('/rpc/e_trash_save_settings')));

const sample={schema_version:1,device_id:'e-trash-acde',uptime_ms:10000,distance_valid:true,environment_valid:true,distance_m:.4,fill_percent:50,temperature_c:40,humidity_percent:79,applied_settings:first};
await db.saveReading(sample.device_id,telemetrySchema.normalizeTelemetry(sample));
assert.equal((await db.latestReading()).environment_alert,true);
state.reading.received_at=Date.now()-121000;
assert.equal((await db.latestReading()).connected,false);
assert.equal((await db.latestReading()).fill_percent,null);

const route=name=>load(path.join(root,'app/api/v1',name,'route.ts'));
const settings=route('settings'),telemetry=route('telemetry'),status=route('status'),device=route('device-settings');
assert.equal((await(await settings.GET()).json()).empty_distance_cm,75);
assert.equal((await(await status.GET()).json()).connected,false);
assert((await(await device.GET(new Request('http://localhost/api'))).text()).endsWith(',75,5,39.5,78.5,0'));
const put=v=>settings.PUT(new Request('http://localhost/api',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)}));
assert.equal((await put({...values,full_distance_cm:80})).status,400);
assert.equal((await put(values)).status,200);
state.auth=false;
const before=state.calls.length;
assert.equal((await settings.GET()).status,401);
assert.equal(state.calls.length,before);
state.auth=true;state.origin=false;
assert.equal((await put(values)).status,403);
state.origin=true;
const post=()=>telemetry.POST(new Request('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)}));
assert.equal((await post()).status,200);
state.device=false;
assert.equal((await post()).status,401);
state.device=true;state.fail=true;
assert.equal((await post()).status,503);
assert.equal((await settings.GET()).status,503);
const error=await(await status.GET()).text();
assert(!error.includes('private upstream'));
assert(!error.includes('sb_secret_'));
state.fail=false;
delete env.SUPABASE_SECRET_KEY;
assert.equal((await settings.GET()).status,503);

console.log('PASS: Supabase REST contract, empty insert response, RPC revisions, settings and readings, 120-second offline timeout, async API routes, authorization, validation and safe errors.');
console.log('Mocked tests only: live Supabase connectivity and SQL permissions require your configured project.');
