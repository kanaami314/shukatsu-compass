import { z } from 'zod';
export const stages=['気になる','説明会','書類選考','一次面接','二次面接','最終面接','内定','見送り・辞退'] as const;
export const schemas={
 company:z.object({name:z.string().trim().min(1).max(150),industry:z.string().max(150),status:z.enum(stages),priority:z.enum(['高','中','低']),agentId:z.string(),overview:z.string().max(10000),url:z.string().refine(v=>!v||/^https?:\/\//.test(v),'http(s)のURLを入力してください'),source:z.string().max(1000).refine(v=>!v||/^https?:\/\//.test(v))}),
 agent:z.object({name:z.string().trim().min(1).max(150),contact:z.string().max(500),memo:z.string().max(5000)}),
 note:z.object({companyId:z.string().min(1),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),title:z.string().trim().min(1).max(150),content:z.string().max(10000),feeling:z.string().max(10000),rating:z.enum(['5','4','3','2','1'])}),
 event:z.object({companyId:z.string(),title:z.string().trim().min(1).max(150),start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true}),place:z.string().max(1000),memo:z.string().max(5000)}).refine(v=>new Date(v.end)>new Date(v.start),'終了日時は開始日時より後にしてください')
};
export type Kind=keyof typeof schemas;
export type RecordItem={id:string;kind:Kind;data:any};
export function freeSlots(events:RecordItem[],date:string,duration:number,startHour=9,endHour=18,buffer=30){
 const start=new Date(`${date}T${String(startHour).padStart(2,'0')}:00:00+09:00`).getTime(),end=new Date(`${date}T${String(endHour).padStart(2,'0')}:00:00+09:00`).getTime();
 const busy=events.map(e=>[Date.parse(e.data.start)-buffer*60000,Date.parse(e.data.end)+buffer*60000]).filter(([a,b])=>a<end&&b>start).sort((a,b)=>a[0]-b[0]);
 let cursor=start;const slots:number[][]=[];for(const [a,b] of busy){if(a-cursor>=duration*60000)slots.push([cursor,Math.min(a,end)]);cursor=Math.max(cursor,b)}if(end-cursor>=duration*60000)slots.push([cursor,end]);return slots;
}

export function availableDays(events:RecordItem[],from:string,to:string,duration:number,buffer=30,now=Date.now()){
 const parseDay=(value:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('開始日と終了日を入力してください。');
  const time=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error('有効な日付を入力してください。');
  return time;
 };
 const start=parseDay(from),end=parseDay(to),count=(end-start)/86400000+1;
 if(count<1)throw new Error('終了日は開始日以降にしてください。');
 if(count>93)throw new Error('検索期間は93日以内にしてください。');
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(buffer)||buffer<0)throw new Error('必要な時間と予定前後の余裕を確認してください。');
 const days:{date:string;slots:number[][]}[]=[];
 for(let time=start;time<=end;time+=86400000){
  const date=new Date(time).toISOString().slice(0,10);
  // Round today's next start up to the next 15-minute boundary in JST.
  const earliest=Math.ceil(now/(15*60000))*15*60000;
  const slots=freeSlots(events,date,duration,9,18,buffer).map(([a,b])=>[Math.max(a,earliest),b]).filter(([a,b])=>b-a>=duration*60000);
  if(slots.length)days.push({date,slots});
 }
 return days;
}

