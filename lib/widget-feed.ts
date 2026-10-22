import type {RecordItem} from './model';
import {taskDeadline} from './model';

export const widgetTokenPattern=/^cw1_[a-f0-9]{64}$/;
export async function hashWidgetToken(token:string){
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),v=>v.toString(16).padStart(2,'0')).join('');
}
export function newWidgetToken(){return 'cw1_'+Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('')}

// An explicit output schema keeps notes, contacts, locations and drafts off the phone.
export function buildWidgetFeed(records:RecordItem[],now=Date.now()){
 const through=now+7*86400000;
 const names=new Map(records.filter(r=>r.kind==='company'||r.kind==='agent').map(r=>[r.id,String(r.data.name||'').slice(0,150)]));
 const related=(d:any)=>names.get(d.companyId)||names.get(d.agentId)||'';
 const events=records.filter(r=>r.kind==='event'&&!r.data.routine&&!r.data.schoolCalendar&&Date.parse(r.data.end)>now&&Date.parse(r.data.start)<through)
  .sort((a,b)=>Date.parse(a.data.start)-Date.parse(b.data.start)||a.id.localeCompare(b.id)).slice(0,6)
  .map(({data:d})=>({title:String(d.title).slice(0,150),start:d.start,end:d.end,allDay:!!d.allDay,tentative:d.planning?.status==='tentative',relatedName:related(d)}));
 const tasks=records.filter(r=>r.kind==='task'&&!r.data.done&&taskDeadline(r.data)<through)
  .sort((a,b)=>taskDeadline(a.data)-taskDeadline(b.data)||a.id.localeCompare(b.id)).slice(0,6)
  .map(({data:d})=>({title:String(d.title).slice(0,150),dueDate:d.dueDate,dueTime:d.dueTime||'',overdue:taskDeadline(d)<now,relatedName:related(d)}));
 return {version:1,generatedAt:new Date(now).toISOString(),events,tasks};
}
