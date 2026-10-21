'use client';
import type {RecordItem} from '@/lib/model';
import {candidatePeers,sameEventRelation} from '@/lib/event-candidates';
export default function EventPlanning({data,id,events,relationName,onChange}:{data:any;id?:string;events:RecordItem[];relationName:string;onChange:(v:any)=>void}){
 const value=data.planning||{status:'confirmed',groupId:'',groupName:''};
 const groups=[...new Map(events.filter(e=>sameEventRelation(e.data,data)&&e.data.planning?.groupId&&e.data.planning.status==='tentative').map(e=>[e.data.planning.groupId,e.data.planning])).values()];
 const relationMissing=(data.relation==='company'&&!data.companyId)||(data.relation==='agent'&&!data.agentId);
 const peers=candidatePeers(events,data,id);
 return <section className="event-planning"><h3>日程の確定状況</h3><label className="field">確定・仮予定<select value={value.status} onChange={e=>onChange({...value,status:e.target.value})}><option value="confirmed">確定</option><option value="tentative">仮予定（候補日）</option></select></label>
 {(value.status==='tentative'||value.groupId)&&<><p><strong>候補の関連先：{relationName}</strong></p><label className="field">候補グループ<select disabled={relationMissing} value={value.groupId} onChange={e=>{const group=groups.find(g=>g.groupId===e.target.value);onChange({...value,groupId:group?.groupId||'',groupName:group?.groupName||''})}}><option value="">グループなし（単独の仮予定）</option>{!groups.some(g=>g.groupId===value.groupId)&&value.groupId&&<option value={value.groupId}>{relationName} · {value.groupName}</option>}{groups.map(g=><option key={g.groupId} value={g.groupId}>{relationName} · {g.groupName}</option>)}</select></label>{value.status==='tentative'&&<button type="button" className="secondary" disabled={relationMissing} onClick={()=>onChange({...value,groupId:crypto.randomUUID(),groupName:data.title||'日程候補'})}>新しい候補グループを作る</button>}{value.groupId&&<label className="field">候補グループ名<input value={value.groupName} maxLength={150} required onChange={e=>onChange({...value,groupName:e.target.value})}/></label>}{relationMissing&&<p role="status">先に関連する企業・エージェントを選択してください。</p>}<p>選択した企業・エージェントの候補だけを表示しています。同じ関連先でも、別の面談・選考はグループを分けてください。仮予定も空き時間検索から除外されます。</p></>}
 {value.status==='confirmed'&&peers.length>0&&<div className="notice"><b>保存すると、次の仮予定 {peers.length} 件をごみ箱へ移動します。</b><ul>{peers.map(e=><li key={e.id}>{new Date(e.data.start).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})} · {e.data.title}</li>)}</ul><p>別のグループや確定済みの予定は変更しません。ごみ箱から復元できます。</p></div>}
 </section>;
}
