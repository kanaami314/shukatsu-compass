'use client';
import type {RecordItem} from '@/lib/model';
import {candidatePeers,sameEventRelation} from '@/lib/event-candidates';
export default function EventPlanning({data,id,events,relationName,onChange}:{data:any;id?:string;events:RecordItem[];relationName:string;onChange:(v:any)=>void}){
 const value=data.planning||{status:'confirmed',groupId:'',groupName:''};
 const groups=[...new Map(events.filter(e=>sameEventRelation(e.data,data)&&e.data.planning?.groupId&&e.data.planning.status==='tentative').map(e=>[e.data.planning.groupId,e.data.planning])).values()];
 const related=!!(data.companyId||data.agentId);
 const relationMissing=(data.relation==='company'&&!data.companyId)||(data.relation==='agent'&&!data.agentId);
 const peers=candidatePeers(events,data,id);
 const confirming=events.some(e=>e.id===id&&e.data.planning?.status==='tentative')&&value.status==='confirmed';
 return <section className="event-planning"><h3>日程の確定状況</h3><label className="field">確定・仮予定<select value={value.status} onChange={e=>onChange({...value,status:e.target.value})}><option value="confirmed">確定</option><option value="tentative">仮予定（候補日）</option></select></label>
 {(value.status==='tentative'||value.groupId||confirming)&&<>
 <p><strong>{value.groupId?'指定グループ：'+relationName+' · '+value.groupName:related?'自動グループ：'+relationName:'個人の予定は自動でまとめません。'}</strong></p>
 {!value.groupId&&related&&<p>設定は不要です。同じ企業・エージェントの仮予定をまとめ、１件を確定すると残りをごみ箱へ移動します。確定済みの予定は変更しません。</p>}
 <details key={value.groupId?'manual':'auto'} open={value.groupId?true:undefined}><summary>別のグループに分ける（任意）</summary>
 <label className="field">候補グループ<select disabled={relationMissing} value={value.groupId} onChange={e=>{const group=groups.find(g=>g.groupId===e.target.value);onChange({...value,groupId:group?.groupId||'',groupName:group?.groupName||''})}}><option value="">{related?'自動（'+relationName+'）':'グループなし（単独の仮予定）'}</option>{!groups.some(g=>g.groupId===value.groupId)&&value.groupId&&<option value={value.groupId}>{value.groupName}</option>}{groups.map(g=><option key={g.groupId} value={g.groupId}>{g.groupName}</option>)}</select></label>
 <button type="button" className="secondary" disabled={relationMissing} onClick={()=>onChange({...value,groupId:crypto.randomUUID(),groupName:data.title||'日程候補'})}>別のグループを作る</button>
 {value.groupId&&<label className="field">候補グループ名<input value={value.groupName} maxLength={150} required onChange={e=>onChange({...value,groupName:e.target.value})}/></label>}
 <p>別の選考などを分けたい場合だけ指定してください。指定したグループと自動グループは別々に扱います。</p></details>
 {relationMissing&&<p role="status">先に関連する企業・エージェントを選択してください。</p>}<p>仮予定も空き時間検索から除外されます。</p></>}
 {confirming&&peers.length>0&&<div className="notice"><b>保存すると、次の仮予定 {peers.length} 件をごみ箱へ移動します。</b><ul>{peers.map(e=><li key={e.id}>{new Date(e.data.start).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})} · {e.data.title}</li>)}</ul><p>別のグループや確定済みの予定は変更しません。ごみ箱から復元できます。</p></div>}
 {!id&&value.status==='confirmed'&&related&&peers.length>0&&<p>候補から確定する場合は、保存済みの仮予定を開いて「確定」に変更してください。新しい確定予定の登録では、既存の候補を取り消しません。</p>}
 </section>;
}
