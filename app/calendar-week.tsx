'use client';
import {Plus,CalendarX2} from 'lucide-react';
import type {RecordItem} from '@/lib/model';
export default function CalendarWeek({days,events,tasks,today,dateLabel,eventWho,eventTime,onEvent,onTask,onAdd,disabled}:{days:string[];events:RecordItem[];tasks:RecordItem[];today:string;dateLabel:(d:string)=>string;eventWho:(e:RecordItem)=>string;eventTime:(e:RecordItem)=>string;onEvent:(e:RecordItem)=>void;onTask:(t:RecordItem)=>void;onAdd:(d:string)=>void;disabled:boolean}){
 return <div className="week-grid">{days.map(d=>{
  const start=Date.parse(d+'T00:00:00+09:00');
  const dayEvents=events.filter(e=>Date.parse(e.data.start)<start+86400000&&Date.parse(e.data.end)>start);
  const allDay=dayEvents.filter(e=>e.data.allDay),timed=dayEvents.filter(e=>!e.data.allDay);
  return <section key={d} className={[d===today?'is-today':'',allDay.length?'day-blocked':''].join(' ')}><h3>{dateLabel(d)}</h3>
    {allDay.length>0&&<div className="all-day-events">{allDay.map(e=><button className="calendar-all-day" key={e.id} onClick={()=>onEvent(e)}><span><CalendarX2 size={20}/>終日</span><b>{e.data.title}</b><small>{eventWho(e)}</small><span className="all-day-caption">この日は空き時間なし</span></button>)}</div>}
    <div className="timed-events">{timed.map(e=><button className="calendar-event" key={e.id} onClick={()=>onEvent(e)}><small>{eventTime(e)}</small><b>{e.data.title}</b><small>{eventWho(e)}</small></button>)}{tasks.filter(t=>!t.data.done&&t.data.dueDate===d).map(t=><button className="calendar-deadline" key={t.id} onClick={()=>onTask(t)}><small>締切 {t.data.dueTime||'終日'}</small><b>{t.data.title}</b></button>)}</div>
    <button className="add-event" onClick={()=>onAdd(d)} disabled={disabled}><Plus size={15}/>予定</button>
  </section>
 })}</div>
}
