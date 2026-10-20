'use client';
import {useEffect,useRef,useState} from 'react';
import type {RecordItem} from '@/lib/model';
import {defaultAccess,type AccessSettings,accessKinds} from '@/lib/ai-access';
const names={company:'企業・選考・志望度',note:'説明会ノート',task:'やることリスト',event:'スケジュール・空き時間',agent:'エージェント（名前・連絡先・メモ）'};
type State={owner:string;settings:AccessSettings;revision:number};
export default function AiAccessPanel({records,owner}:{records:RecordItem[];owner:string}){
 const [saved,setSaved]=useState<State|null>(null),[draft,setDraft]=useState<AccessSettings>(defaultAccess),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[query,setQuery]=useState('');
 const lock=useRef(false);
 async function load(){setLoading(true);setError('');try{const r=await fetch('/api/ai-access',{cache:'no-store'}),b:any=await r.json();if(!r.ok||b.owner!==owner)throw Error(b.error||'ログイン先を確認してください。');setSaved(b);setDraft(b.settings)}catch(e){setError(e instanceof Error?e.message:'読み込みに失敗しました。')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[owner]);
 const dirty=!!saved&&JSON.stringify(saved.settings)!==JSON.stringify(draft);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 async function save(settings=draft){
  if(!saved||lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/ai-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner,revision:saved.revision,settings})}),b:any=await r.json();if(!r.ok)throw Error(b.error);setSaved(b);setDraft(b.settings);setMessage(settings.enabled?'参照範囲を保存しました。ChatGPTから読み取りできます。':'連携を停止しました。今後のデータ取得を拒否します。')}
  catch(e){setError(e instanceof Error?e.message:'保存を確認できませんでした。')}
  finally{setBusy(false);lock.current=false}
 }
 const excluded=new Set(draft.excludedIds);
 const choices=records.filter(r=>!r.data.schoolCalendar&&(r.data.name||r.data.routine?.versions.at(-1)?.title||r.data.title||'').toLowerCase().includes(query.toLowerCase()));
 function toggle(id:string){setDraft(d=>({...d,excludedIds:d.excludedIds.includes(id)?d.excludedIds.filter(v=>v!==id):[...d.excludedIds,id]}))}
 return <section className="panel ai-access-panel"><div className="panel-heading"><div><h2>相談に使う情報を、自分で選ぶ</h2><p>保存済みの記録をChatGPTが必要なときに読み取ります。</p></div><span className={'ai-state '+(saved?.settings.enabled?'enabled':'')}>{loading?'確認中':!saved?'確認できません':saved.settings.enabled?'連携中':'停止中'}</span></div>
 <div className="ai-access-body">
 <p>ChatGPTから記録の追加・編集・削除はできません。アプリと同じChatGPTアカウントで接続してください。</p>
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
 <div className="button-row"><button className="secondary" disabled={busy||loading} onClick={()=>{if(!dirty||window.confirm('未保存の連携設定を破棄して読み込み直しますか？'))void load()}}>最新の設定を読み込む</button>{saved?.settings.enabled&&<button className="secondary" disabled={busy||loading} onClick={()=>void save({...saved.settings,enabled:false})}>連携を停止する</button>}</div>
 <fieldset disabled={busy||loading||!saved} className="ai-fields">
 <label className="ai-enable"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/><span><strong>ChatGPTからの読み取りを許可する</strong><small>設定は下の「参照範囲を保存」で反映されます。</small></span></label>
 <h3>参照できる情報</h3><div className="ai-kinds">{accessKinds.map(kind=><label key={kind}><input type="checkbox" checked={draft.kinds.includes(kind)} onChange={e=>setDraft({...draft,kinds:e.target.checked?[...draft.kinds,kind]:draft.kinds.filter(k=>k!==kind)})}/>{names[kind]}</label>)}</div>
 <p className="muted">種類を外すと、その種類の内容を参照できなくなります。ノート・タスク・企業の予定には、関連する企業名を含みます。スケジュールは学校・アルバイト・私用を含む予定名を共有します。エージェントを選ぶと名前・連絡先・メモと企業等の紹介元を参照できます。</p>
 <h3>個別に参照から外す</h3><p>企業を外すと、その企業のノート・タスクも対象外になります。外した予定・企業・エージェントの予定は、内容を伏せて「予定あり」の時間帯だけを共有します。学校・アルバイトは固定予定ごとに除外できます。</p>
 <label className="field">記録を検索<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="企業名・タイトル" /></label>
 <div className="ai-exclusions">{accessKinds.map(kind=><details key={kind}><summary>{names[kind]}（{choices.filter(r=>r.kind===kind).length}件）</summary>{choices.filter(r=>r.kind===kind).map(r=><label key={r.id}><input type="checkbox" checked={excluded.has(r.id)} onChange={()=>toggle(r.id)}/><span>{r.data.name||r.data.routine?.versions.at(-1)?.title||r.data.title}<small>{r.data.companyId?records.find(c=>c.id===r.data.companyId)?.data.name:''} {r.data.date||r.data.dueDate||r.data.start?.slice(0,10)||''}</small></span><small>{excluded.has(r.id)?'個別に対象外':excluded.has(r.data.companyId)?'企業ごと対象外':!draft.kinds.includes(kind)?'種類ごと対象外':'参照可能'}</small></label>)}</details>)}</div>
 <div className="button-row"><button className="primary" disabled={!dirty} onClick={()=>void save()}>{busy?'保存中…':'参照範囲を保存'}</button><span role="status">{dirty?'未保存の設定があります':'保存済みの設定です'}</span></div>
 </fieldset>
 <div className="ai-guide"><h3>ChatGPTで使うには</h3><ol><li>この画面で参照範囲を選び、読み取りを許可して保存します。</li><li>ChatGPTのプラグインで「就活コンパス」をインストール・接続します。個人用の「作成したもの」に表示される場合もあります。</li><li>相談するチャットで就活コンパスを選び、「今の選考状況とノートを見て、今週の準備を整理して」などと依頼してください。</li></ol><p>接続後もツールが表示されない場合は、新しいチャットで確認してください。</p>
 <h3>共有しない情報</h3><p>下書き・ごみ箱・変更履歴・APIキーは渡しません。予定の場所・メモも渡しません。個別に外した予定は「予定あり」と時間帯だけを渡します。</p>
 <p>選択した種類のノート本文・感想、タスクのメモ、エージェントの連絡先・メモは参照対象です。含めたくない内容がある記録は外してください。停止しても、すでにChatGPTの会話へ渡した内容は消えません。</p></div>
 </div></section>;
}
