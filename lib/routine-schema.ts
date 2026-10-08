import {schoolDay} from './holidays';
import {z} from 'zod';
export const routineDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d=>Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d,'日付を確認してください');
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'時刻を入力してください');
const timing=z.object({title:z.string().trim().min(1,'予定名を入力してください').max(150),startTime:time,endTime:time,nextDay:z.boolean().default(false),place:z.string().max(1000).default(''),before:z.number().int().min(0).max(240).default(0),after:z.number().int().min(0).max(240).default(0)});
export const routineVersion=timing.extend({from:routineDate,to:z.union([z.literal(''),routineDate]),weekdays:z.array(z.number().int().min(0).max(6)).min(1,'曜日を選択してください').max(7)}).refine(v=>!v.to||v.to>=v.from,'終了日は開始日以降にしてください').refine(v=>v.nextDay||v.endTime>v.startTime,'終了は開始より後にしてください');
export const routineSchema=z.object({category:z.enum(['school','work']),versions:z.array(routineVersion).min(1).max(100),exceptions:z.array(timing.extend({date:routineDate,action:z.enum(['change','cancel'])})).max(1000).default([])}).superRefine((r,ctx)=>{
 if(new Set(r.versions.map(v=>v.from)).size!==r.versions.length)ctx.addIssue({code:'custom',message:'切り替え開始日が重複しています'});
 if(r.versions.some((v,i)=>i>0&&v.from<r.versions[i-1].from))ctx.addIssue({code:'custom',message:'切り替え開始日は前の設定より後にしてください'});
 if(new Set(r.exceptions.map(e=>e.date)).size!==r.exceptions.length)ctx.addIssue({code:'custom',message:'日別変更の日付が重複しています'});
 if(r.category==='school'&&r.versions.some(v=>!v.to||v.weekdays.some(d=>d===0||d===6)||v.nextDay))ctx.addIssue({code:'custom',message:'学校は学期の終了日と平日の曜日を指定してください。日をまたぐ授業は登録できません。'});
 if(r.exceptions.some(e=>e.action==='change'&&!e.nextDay&&e.endTime<=e.startTime))ctx.addIssue({code:'custom',message:'日別変更の終了は開始より後にしてください'});
 if(r.category==='school'&&r.exceptions.some(e=>e.nextDay||!schoolDay(e.date)))ctx.addIssue({code:'custom',message:'学校の変更は平日・同日内で指定してください'});
});
export const schoolCalendarSchema=z.object({breaks:z.array(z.object({from:routineDate,to:routineDate}).refine(v=>v.to>=v.from,'休暇の終了日を確認してください')).max(100),swaps:z.array(z.object({date:routineDate,weekday:z.number().int().min(1).max(5)})).max(200)}).refine(v=>new Set(v.swaps.map(s=>s.date)).size===v.swaps.length,'振替日が重複しています').refine(v=>v.swaps.every(s=>schoolDay(s.date)),'学校の振替日は土日祝以外を指定してください');
export type Routine=z.infer<typeof routineSchema>;
export type RoutineVersion=z.infer<typeof routineVersion>;
