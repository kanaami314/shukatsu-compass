'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Draft,downloadSafetyCopy} from '@/lib/draft-storage';
import type {RecordItem} from '@/lib/model';
const names:any={company:'企業',note:'ノート',event:'予定',task:'タスク',agent:'エージェント'};
const fields:any={name:'名称',title:'タイトル',companyId:'関連企業',agentId:'紹介元',content:'聞いた内容',feeling:'感じたこと',date:'実施日',rating:'印象',memo:'メモ',overview:'企業概要',industry:'業種',status:'選考状況',priority:'優先度',interestScore:'志望度スコア',applicationCategory:'応募カテゴリ',assessment:'判断段階',contact:'連絡先',start:'開始',end:'終了',allDay:'終日',place:'場所',url:'URL',source:'参照元',dueDate:'締切日',dueTime:'締切時刻',done:'完了',relation:'関連先'};
export default function RecoveryPanel({drafts,onResume,onRestore,onRefresh}:{drafts:Draft[];onResume:(d:Draft)=>void;onRestore:(r:RecordItem)=>void;onRefresh:()=>void}){
 const [open,setOpen]=useState(false),[history,setHistory]=useState<any[]>([]),[draftHistory,setDraftHistory]=useState<any[]>([]),[deleted,setDeleted]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[imports,setImports]=useState<any[]>([]);
 async function load(next=0){
  setOpen(true);setBusy(true);setError('');if(!next)onRefresh();
  try{const r=await fetch('/api/recovery?offset='+next,{cache:'no-store'}),b:any=await r.json();if(!r.ok)throw new Error(b.error);setHistory(v=>next?[...v,...b.history]:b.history);setDraftHistory(v=>next?[...v,...b.draftHistory]:b.draftHistory);setDeleted(b.deleted);setOffset(next+100);setMore(b.hasMore)}
  catch(e){setError(e instanceof Error?e.message:'読み込めませんでした')}finally{setBusy(false)}
 }
 async function backup(){
  setBusy(true);setError('');
  try{
   const responses=await Promise.all(['/api/records','/api/drafts'].map(url=>fetch(url,{cache:'no-store'})));if(responses.some(r=>!r.ok))throw new Error('バックアップを取得できません。接続を確認して再試行してください。');
   const [live,cloud]:any[]=await Promise.all(responses.map(r=>r.json()));const saved:any={history:[],draftHistory:[],deleted:[]};
   for(let offset=0;;offset+=100){const r=await fetch('/api/recovery?offset='+offset,{cache:'no-store'}),b:any=await r.json();if(!r.ok)throw new Error('履歴を取得できません。バックアップをもう一度お試しください。');saved.history.push(...b.history);saved.draftHistory.push(...b.draftHistory);saved.deleted=b.deleted;if(!b.hasMore)break;}
   downloadSafetyCopy({format:'compass-backup-v1',exportedAt:new Date().toISOString(),records:live.records,drafts:[...drafts,...cloud.drafts],...saved});
  }catch(e){setError(e instanceof Error?e.message:'バックアップを取得できませんでした')}finally{setBusy(false)}
 }
 async function importFile(file?:File){
  if(!file)return;setError('');
  try{if(file.size>20*1024*1024)throw new Error('20MB以下のファイルを選んでください。');const b=JSON.parse(await file.text());const rows=b.format==='compass-backup-v1'?[...(b.records||[]),...(b.drafts||[]),...(b.history||[]),...(b.deleted||[]),...(b.draftHistory||[])]:[b];if(!rows.length||rows.some((r:any)=>!Object.hasOwn(names,r.kind)||!r.data||typeof r.data!=='object'))throw new Error('就活コンパスの退避・バックアップファイルを選んでください。');setImports(rows)}catch(e){setError(e instanceof Error?e.message:'ファイルを読み込めませんでした')}
 }
 function row(r:any,key:string,action:()=>void,label:string){return <article className="recovery-entry" key={key}><strong>{names[r.kind]} · {r.data.title||r.data.name||'無題'}</strong><small>{r.updatedAt||r.savedAt?new Date(r.updatedAt||r.savedAt).toLocaleString('ja-JP'):''}{r.sourceRevision?' · 変更前の記録 #'+r.sourceRevision:''}</small><details><summary>内容を確認</summary><pre>{Object.entries(r.data).map(([k,v])=>`${fields[k]||k}: ${typeof v==='string'?v:JSON.stringify(v)}`).join('\n\n')}</pre></details><button className="secondary" onClick={action}>{label}</button></article>}
 return <><div className="safety-toolbar"><button className="secondary" onClick={()=>load()}>下書き・変更履歴・ごみ箱{drafts.length?'（下書き '+drafts.length+'件）':''}</button></div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="editor recovery-panel"><DialogTitle>下書き・変更履歴・ごみ箱</DialogTitle><DialogDescription>内容を確認して編集画面に戻せます。復元は「保存する」で確定します。変更履歴は今回の保護機能の導入後から残ります。</DialogDescription><button className="secondary" onClick={backup} disabled={busy}>全記録をバックアップファイルに保存</button><label className="field">退避・バックアップファイルから戻す<input type="file" accept=".json,application/json" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value=''}}/></label>{error&&<p className="error" role="alert">{error}</p>}{busy&&<p role="status">読み込み中…</p>}{imports.length>0&&<><h3>ファイルの内容</h3><p>選んだ内容を確認してから新しい記録として保存できます。現在の記録は上書きしません。</p>{imports.map((r,i)=>row(r,'import'+i,()=>{setOpen(false);if(r.draftId)onResume({...r,id:undefined,revision:undefined,restore:false,createId:crypto.randomUUID(),draftId:crypto.randomUUID()});else onRestore({...r,id:undefined,revision:undefined})},'新しい記録として確認'))}</>}<h3>下書き・原文の控え</h3><p className="muted">AI案の採用前の原文もここに残ります。再開しても保存済みの記録は自動で変わりません。</p>{drafts.map(d=>row(d,d.draftId,()=>{setOpen(false);onResume(d)},'続きを書く'))}{!drafts.length&&<p>下書きはありません。</p>}<h3>ごみ箱</h3>{deleted.map(r=>row(r,r.id,()=>{setOpen(false);onRestore(r)},'復元内容を確認'))}{!deleted.length&&!busy&&<p>削除された記録はありません。</p>}<h3>変更前の記録</h3>{history.map(r=>row(r,r.id+':'+r.sourceRevision,()=>{setOpen(false);onRestore(r)},'この内容を編集画面に戻す'))}{!history.length&&!busy&&<p>変更履歴はまだありません。</p>}<h3>自動保存した下書きの履歴</h3>{draftHistory.map(d=>row(d,d.historyId,()=>{setOpen(false);onResume(d)},'この下書きから再開'))}{!draftHistory.length&&!busy&&<p>下書きの履歴はまだありません。</p>}{more&&<button className="secondary" disabled={busy} onClick={()=>load(offset)}>以前の履歴をさらに表示</button>}</DialogContent></Dialog></>;
}
