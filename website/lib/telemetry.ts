import { z } from 'zod';
import { appliedSettingsSchema } from './settings-schema';
export const telemetrySchema = z.object({
 schema_version:z.literal(1),device_id:z.string().regex(/^e-trash-[a-f0-9]{1,12}$/),
 uptime_ms:z.number().int().min(0).max(4294967295),distance_valid:z.boolean(),environment_valid:z.boolean(),
 distance_m:z.number().finite().min(0).max(100).nullable(),fill_percent:z.number().finite().min(0).max(100).nullable(),
 temperature_c:z.number().finite().min(-50).max(100).nullable(),humidity_percent:z.number().finite().min(0).max(100).nullable(),
 applied_settings:appliedSettingsSchema.optional(),
}).strict().superRefine((d,ctx)=>{
 if(d.distance_valid&&(d.distance_m===null||d.fill_percent===null))ctx.addIssue({code:'custom',message:'Valid distance requires readings'});
 if(d.environment_valid&&(d.temperature_c===null||d.humidity_percent===null))ctx.addIssue({code:'custom',message:'Valid environment requires readings'});
});
export function normalizeTelemetry(d:z.infer<typeof telemetrySchema>){return {...d,
 distance_m:d.distance_valid?d.distance_m:null,fill_percent:d.distance_valid?d.fill_percent:null,
 temperature_c:d.environment_valid?d.temperature_c:null,humidity_percent:d.environment_valid?d.humidity_percent:null,
 bin_full:d.distance_valid&&Math.round(d.fill_percent!)>80,
 environment_alert:d.environment_valid&&(d.temperature_c!>(d.applied_settings?.temperature_threshold_c??45)||d.humidity_percent!>(d.applied_settings?.humidity_threshold_percent??85)),
};}
