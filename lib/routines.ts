import type {RecordItem} from './model';
import {addDays,weekday,schoolDay,holidayCoverage} from './holidays';
import type {RoutineVersion} from './routine-schema';
export const effectiveVersion=(versions:RoutineVersion[],date:string)=>[...versions].filter(v=>v.from<=date).sort((a,b)=>b.from.localeCompare(a.from))[0];
export function expandEvents(records:RecordItem[],from:string,to:string){
 const count=(Date.parse(to)-Date.parse(from))/86400000;if(!Number.isFinite(count)||count<0||count>370)throw Error('予定の表示期間を確認してください。');
 const rules=records.filter(r=>r.data.schoolCalendar).map(r=>r.data.schoolCalendar);
 const result=records.filter(r=>!r.data.routine&&!r.data.schoolCalendar);
 for(const record of records){const routine=record.data.routine;if(!routine)continue;
 for(let date=addDays(from,-1);date<=to;date=addDays(date,1)){
  const version=effectiveVersion(routine.versions,date);if(!version||version.to&&date>version.to)continue;
  const school=routine.category==='school';if(school&&!schoolDay(date))continue;
  const exception=routine.exceptions.find((e:any)=>e.date===date);if(exception?.action==='cancel')continue;
  if(school&&rules.some(r=>r.breaks.some((b:any)=>date>=b.from&&date<=b.to)))continue;
  const swap=school?rules.flatMap(r=>r.swaps).find((s:any)=>s.date===date):undefined;
  if(!exception&&!version.weekdays.includes(swap?.weekday??weekday(date)))continue;
  const data=exception||version;
  const start=date+'T'+data.startTime+':00+09:00',end=(data.nextDay?addDays(date,1):date)+'T'+data.endTime+':00+09:00';
  result.push({...record,id:record.id+'@'+date,data:{...record.data,routine:undefined,start,end,title:data.title,place:data.place,allDay:false,category:routine.category,seriesId:record.id,occurrenceDate:date,changed:!!exception||!!swap,before:data.before,after:data.after,holidayUnknown:school&&date>holidayCoverage()}});
 }
 }
 return result.sort((a,b)=>Date.parse(a.data.start)-Date.parse(b.data.start));
}
