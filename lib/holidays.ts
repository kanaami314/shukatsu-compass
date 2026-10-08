import bundled from './holiday-dates.json';
export type HolidayCalendar=typeof bundled;
let calendar=bundled;
let holidays=new Set(calendar.dates);
export function setHolidayCalendar(next:HolidayCalendar){calendar=next;holidays=new Set(next.dates)}
export const holidayCoverage=()=>calendar.through;
export const weekday=(date:string)=>new Date(date+'T12:00:00Z').getUTCDay();
export const isHoliday=(date:string)=>holidays.has(date);
export const schoolDay=(date:string)=>weekday(date)>0&&weekday(date)<6&&!isHoliday(date);
export const dayClass=(date:string)=>isHoliday(date)||weekday(date)===0?'day-red':weekday(date)===6?'day-blue':'';
export const addDays=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
export const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function parseHolidayCsv(raw:string){const dates=[...raw.matchAll(/^(\d{4})\/(\d{1,2})\/(\d{1,2}),/gm)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);if(dates.length<100||!dates.every(d=>Number.isFinite(Date.parse(d))))throw Error('Invalid holiday calendar');dates.sort();return {source:bundled.source,from:dates[0].slice(0,4)+'-01-01',through:dates.at(-1)!.slice(0,4)+'-12-31',dates}}
