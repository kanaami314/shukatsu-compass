import type {RecordItem} from './model';
import {availableDays} from './model';
import {expandEvents} from './routines';
import {addDays,holidayCoverage,isHoliday} from './holidays';
export type ShareOptions={kind:'company'|'event';from:string;to:string;selected:string[];priority:boolean;category:boolean;names:boolean;mode:'list'|'free';duration:number;buffer:number;comments:Record<string,string>};
export type ShareDocument={title:string;subtitle:string;created:string;rows:{title:string;lines:string[]}[]};
const time=(v:string|number)=>new Date(v).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'});
const date=(v:string)=>new Date(v+'T12:00:00+09:00').toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short',timeZone:'Asia/Tokyo'})+(isHoliday(v)?' 祝':'');
export function shareDocument(records:RecordItem[],o:ShareOptions,now=Date.now()):ShareDocument{
 const valid=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!valid(o.from)||!valid(o.to)||o.to<o.from||(Date.parse(o.to)-Date.parse(o.from))/86400000>=93)throw new Error('対象期間は開始日から93日以内で指定してください。');
 const events=expandEvents(records.filter(r=>r.kind==='event'),o.from,o.to);
 const selected=new Set(o.selected),companies=records.filter(r=>r.kind==='company'&&selected.has(r.id));
 const result:ShareDocument={title:o.kind==='company'?'企業・選考状況':'スケジュール',subtitle:o.from+' 〜 '+o.to+' / 日本時間',created:new Date(now).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}),rows:[]};
 if(o.kind==='company'){
  result.subtitle+=' / 次回予定の対象期間';
  result.rows=companies.map(c=>{
   const next=events.filter(e=>e.data.companyId===c.id&&Date.parse(e.data.end)>=now&&Date.parse(e.data.start)<Date.parse(addDays(o.to,1)+'T00:00:00+09:00')&&Date.parse(e.data.end)>Date.parse(o.from+'T00:00:00+09:00')).sort((a,b)=>Date.parse(a.data.start)-Date.parse(b.data.start))[0];
   const lines=['選考状況：'+c.data.status,'次回予定：'+(next?new Date(next.data.start).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+(next.data.allDay?'（終日）':''):'期間内の予定なし')];
   if(o.priority)lines.push('志望度：'+c.data.priority+' / スコア：'+(c.data.interestScore??'未設定')+' / 判断段階：'+(c.data.assessment||'未設定'));
   if(o.category)lines.push('応募カテゴリ：'+(c.data.applicationCategory||'未設定'));
   if(o.comments[c.id]?.trim())lines.push('共有コメント：'+o.comments[c.id].trim());
   return {title:c.data.name,lines};
  });
 }else if(o.mode==='free'){
  if(o.to>holidayCoverage()&&records.some(r=>r.data.routine?.category==='school'))throw new Error('対象期間の祝日情報が未確認のため、空き時間を確定できません。期間を短くしてください。');
  result.title='面談・面接の候補時間';result.subtitle+=' / 9:00〜20:00 / '+o.duration+'分以上 / 前後の余裕'+o.buffer+'分（個別設定が長い場合はそちらを優先）';
  const days=availableDays(events,o.from,o.to,o.duration,o.buffer,now);
  result.rows=days.map(d=>({title:date(d.date),lines:d.slots.map(([a,b])=>time(a)+' 〜 '+time(b))}));
 }else{
  for(let d=o.from;d<=o.to;d=addDays(d,1)){
   const start=Date.parse(d+'T00:00:00+09:00'),end=start+86400000;
   const dayEvents=events.filter(e=>Date.parse(e.data.start)<end&&Date.parse(e.data.end)>start).sort((a,b)=>Date.parse(a.data.start)-Date.parse(b.data.start));
   result.rows.push({title:date(d),lines:dayEvents.length?dayEvents.map(e=>{
    const company=companies.find(c=>c.id===e.data.companyId);
    const visible=o.names&&company&&!['school','work'].includes(e.data.category);
    const label=visible?company.data.name+' / '+e.data.title:'予定あり';
    return (e.data.allDay?'終日':time(Math.max(start,Date.parse(e.data.start)))+'〜'+(Date.parse(e.data.end)>=end?'24:00':time(e.data.end)))+'　'+label;
   }):['登録されている予定なし']});
  }
 }
 if(!result.rows.length)throw new Error(o.kind==='company'?'共有する企業を選択してください。':'指定条件の空き時間はありません。');
 return result;
}

// Only the explicitly projected fields above reach the image renderer.
export async function renderShareImages(doc:ShareDocument):Promise<Blob[]>{
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('このブラウザでは画像を作成できません。');
 const font='"Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
 const wrap=(text:string,size:number,width=944)=>{ctx.font=`${size}px ${font}`;const lines:string[]=[];for(const para of text.split('\n')){let line='';for(const char of Array.from(para)){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line=''}line+=char}lines.push(line)}return lines};
 type Line={text:string;size:number;color:string;height:number};
 const pages:Line[][]=[[]];let height=0;
 function line(text:string,size:number,color:string,h:number){if(height+h>1010){pages.push([]);height=0}pages.at(-1)!.push({text,size,color,height:h});height+=h}
 for(const row of doc.rows){
  const title=wrap(row.title,32),body=row.lines.flatMap(text=>wrap(text,28));
  const rowHeight=title.length*44+body.length*40+24;
  if(height&&height+Math.min(rowHeight,1010)>1010){pages.push([]);height=0}
  for(const t of title)line(t,32,'#214c89',44);
  for(const t of body){if(height+40>1010){pages.push([]);height=0;for(const heading of wrap(row.title+'（続き）',32))line(heading,32,'#214c89',44)}line(t,28,'#263648',40)}
  if(height+24<=1010)line('',28,'#263648',24);
 }
 if(pages.length>60)throw new Error('画像が60枚を超えます。企業数や対象期間を絞ってください。');
 const blobs:Blob[]=[];
 for(let i=0;i<pages.length;i++){
  ctx.fillStyle='#fff';ctx.fillRect(0,0,1080,1440);ctx.fillStyle='#f1f5fc';ctx.fillRect(0,0,1080,280);ctx.fillStyle='#295cbb';ctx.fillRect(0,0,1080,12);
  ctx.font=`bold 44px ${font}`;ctx.fillText(doc.title,68,90);ctx.font=`24px ${font}`;ctx.fillStyle='#52647c';let sy=140;for(const t of wrap(doc.subtitle,24)){ctx.fillText(t,68,sy);sy+=34}
  ctx.font=`22px ${font}`;ctx.fillText('作成：'+doc.created,68,245);
  let y=330;for(const l of pages[i]){ctx.font=`${l.size===32?'bold ':''}${l.size}px ${font}`;ctx.fillStyle=l.color;ctx.fillText(l.text,68,y);y+=l.height}
  ctx.fillStyle='#dce4f1';ctx.fillRect(68,1360,944,1);ctx.font=`22px ${font}`;ctx.fillStyle='#64748b';ctx.fillText('就活コンパス · 作成時点の保存済み情報',68,1402);ctx.textAlign='right';ctx.fillText(`${i+1} / ${pages.length} 枚目`,1012,1402);ctx.textAlign='left';
  blobs.push(await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像の保存に失敗しました。')),'image/png')));
 }
 return blobs;
}
