import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { defaultSettings,settingsSchema,type Settings } from './settings-schema';

let database:DatabaseSync|undefined;
function db(){
 if(database)return database;
 const filename=path.resolve(process.env.DATABASE_PATH||'./data/e-trash.sqlite');
 mkdirSync(path.dirname(filename),{recursive:true});
 database=new DatabaseSync(filename,{timeout:5000});
 database.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS device_status(device_id TEXT PRIMARY KEY,received_at INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS device_settings(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL);`);
 return database;
}
export function readSettings():Settings{
 const row=db().prepare('SELECT revision,payload FROM device_settings WHERE id=1').get() as {revision:number;payload:string}|undefined;
 return row?{...JSON.parse(row.payload),revision:row.revision}:{...defaultSettings};
}
export function saveSettings(input:unknown):Settings{
 const values=settingsSchema.parse(input);
 const row=db().prepare('INSERT INTO device_settings(id,revision,payload) VALUES(1,1,?) ON CONFLICT(id) DO UPDATE SET revision=device_settings.revision+1,payload=excluded.payload RETURNING revision').get(JSON.stringify(values)) as {revision:number};
 return {...values,revision:row.revision};
}
export function saveReading(deviceId:string,payload:unknown){
 db().prepare('INSERT INTO device_status(device_id,received_at,payload) VALUES(?,?,?) ON CONFLICT(device_id) DO UPDATE SET received_at=excluded.received_at,payload=excluded.payload').run(deviceId,Date.now(),JSON.stringify(payload));
}
export function latestReading(){
 const row=db().prepare('SELECT received_at,payload FROM device_status ORDER BY received_at DESC LIMIT 1').get() as {received_at:number;payload:string}|undefined;
 if(!row)return {connected:false,reason:'not_paired'};
 const data=JSON.parse(row.payload),age=Math.max(0,Date.now()-row.received_at),connected=age<120000;
 return {...data,connected,received_at:row.received_at,age_ms:age,distance_valid:connected&&data.distance_valid,environment_valid:connected&&data.environment_valid,
 ...(!connected?{distance_m:null,fill_percent:null,temperature_c:null,humidity_percent:null,bin_full:false,environment_alert:false}:{})};
}
