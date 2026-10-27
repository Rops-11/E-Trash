import { z } from 'zod';
export const settingsFields = z.object({
 empty_distance_cm:z.number().finite().min(3).max(400).multipleOf(.1),
 full_distance_cm:z.number().finite().min(2).max(399).multipleOf(.1),
 temperature_threshold_c:z.number().finite().min(0).max(60).multipleOf(.1),
 humidity_threshold_percent:z.number().finite().min(1).max(100).multipleOf(.1),
 buzzer_enabled:z.boolean(),
}).strict();
export const settingsSchema=settingsFields.refine(s=>s.empty_distance_cm-s.full_distance_cm>=1,{message:'Empty distance must be at least 1 cm greater than full distance.',path:['empty_distance_cm']});
export const appliedSettingsSchema=settingsFields.extend({revision:z.number().int().min(0).max(2147483647)}).refine(s=>s.empty_distance_cm-s.full_distance_cm>=1);
export type Settings=z.infer<typeof appliedSettingsSchema>;
export const defaultSettings:Settings={revision:0,empty_distance_cm:30,full_distance_cm:2,temperature_threshold_c:45,humidity_threshold_percent:85,buzzer_enabled:true};
