'use client';
import {useEffect,useRef,useState} from 'react';
import {Draft,draftPrefix,writeLocalDraft,readLocalDrafts,mergeDrafts} from '@/lib/draft-storage';
type Input={id?:string;kind:Draft['kind'];data:any;revision?:number;restore?:boolean};
export default function useProtectedEditor(owner:string){
 const [editing,setState]=useState<Draft|null>(null),[drafts,setDrafts]=useState<Draft[]>([]),[status,setStatus]=useState(''),[localError,setLocalError]=useState(''),[cloudError,setCloudError]=useState('');
 const current=useRef<Draft|null>(null),pending=useRef(new Map<string,Draft>()),busy=useRef(false),ownerRef=useRef(owner);ownerRef.current=owner;
 const updateList=(d:Draft)=>setDrafts(v=>mergeDrafts([d],v));
 function persist(d:Draft){
  if(!ownerRef.current){setLocalError('ログイン状態を確認できません。入力をファイルに退避してください。');return}
  let localSaved=false;
  try{writeLocalDraft(localStorage,ownerRef.current,d);setStatus('この端末に下書きを保存しました。クラウドに同期中…');setLocalError('');localSaved=true}
  catch{setLocalError('端末に下書きを保存できません。画面を閉じず「入力をファイルに退避」を使ってください。')}
  pending.current.set(d.draftId,d);updateList(d);return localSaved;
 }
 // Persist synchronously in the input handler, rather than waiting for an effect or blur.
 function setEditing(value:Input|null|((d:Draft|null)=>Input|null)){
  const next=typeof value==='function'?value(current.current):value;
  if(!next){current.current=null;setState(null);return}
  const same=(next as Draft).draftId===current.current?.draftId&&!!current.current;
  const d:Draft=same?{...current.current!,...next,seq:current.current!.seq+1,updatedAt:new Date().toISOString()}:{...next,draftId:crypto.randomUUID(),createId:crypto.randomUUID(),seq:0,updatedAt:new Date().toISOString()};
  if(same){const before=current.current!;const shrunk=Object.keys(before.data).some(key=>typeof before.data[key]==='string'&&typeof d.data[key]==='string'&&before.data[key].length-d.data[key].length>20);if(shrunk){persist({...before,draftId:crypto.randomUUID(),seq:1,updatedAt:new Date().toISOString()})}}
  current.current=d;setState(d);if(d.seq)persist(d);else{setStatus('入力すると下書きを自動保存します。');setCloudError('')}
 }
 async function sync(){
  if(busy.current||!ownerRef.current)return;busy.current=true;
  try{for(const [id,d] of [...pending.current]){
   try{
    const r=await fetch('/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,owner:ownerRef.current}),signal:AbortSignal.timeout(15000)}),b:any=await r.json();
    if(!pending.current.has(id))continue;
    if(!r.ok){if(b.code==='DRAFT_ARCHIVED')pending.current.delete(id);throw new Error(b.error||'下書きを同期できませんでした。')}
    if(pending.current.get(id)?.seq===d.seq)pending.current.delete(id);
    setCloudError('');
    if(current.current?.draftId===id&&current.current.seq===d.seq)setStatus('下書きをクラウドに保存しました。');
   }catch(e){if(!current.current||current.current.draftId===id)setCloudError((e instanceof Error?e.message:'下書きを同期できませんでした。')+' 入力は保持しています。接続が戻ると再試行します。')}
  }}finally{busy.current=false}
 }
 async function refresh(){
  if(!owner)return;let local:Draft[]=[];
  try{local=readLocalDrafts(localStorage,owner)}catch{setCloudError('端末の下書きを読み込めません。保存領域を消去せず、入力をファイルに退避してください。')}
  setDrafts(v=>mergeDrafts(local,v));
  try{const r=await fetch('/api/drafts',{cache:'no-store'}),b:any=await r.json();if(!r.ok)throw new Error(b.error);setDrafts(v=>mergeDrafts(mergeDrafts(local,b.drafts),v));for(const d of local){if((pending.current.get(d.draftId)?.seq||0)<d.seq)pending.current.set(d.draftId,d)}}catch{setCloudError('クラウドの下書きを読み込めません。端末に残っている下書きは利用できます。')}
 }
 useEffect(()=>{refresh();const timer=setInterval(sync,1500);const flush=()=>{void sync()};window.addEventListener('online',flush);return()=>{clearInterval(timer);window.removeEventListener('online',flush)}},[owner]);
 useEffect(()=>{
  const warn=(e:BeforeUnloadEvent)=>{if(current.current?.seq){e.preventDefault();e.returnValue=''}};
  const flush=()=>{const d=current.current;if(d?.seq){persist(d);void sync()}};
  const hidden=()=>{if(document.visibilityState==='hidden')flush()};
  window.addEventListener('beforeunload',warn);window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
  return()=>{window.removeEventListener('beforeunload',warn);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden)};
 },[owner]);
 async function finish(d:Draft){
  pending.current.delete(d.draftId);
  // Other sessions may still be editing the source draft. Only retire this session.
  const ids=[d.draftId];
  for(const id of ids){try{const original=id===d.draftId?d:drafts.find(x=>x.draftId===id);if(!original)continue;const r=await fetch('/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...original,seq:original.seq+1,archived:true,owner}),signal:AbortSignal.timeout(15000)});const result:any=await r.json();if(!r.ok||!result.archived)throw new Error();localStorage.removeItem(draftPrefix(owner)+id);setDrafts(v=>v.filter(x=>x.draftId!==id))}catch{setCloudError('記録は保存済みですが、下書きの整理が未完了です。下書きは安全のため残しています。')}}
 }
 function resume(d:Draft){const copy={...d,draftId:crypto.randomUUID(),sourceDraft:d.draftId,seq:1,updatedAt:new Date().toISOString()};current.current=copy;setState(copy);persist(copy)}
 function checkpoint(){const d=current.current;if(d){const copy={...d,draftId:crypto.randomUUID(),seq:1,updatedAt:new Date().toISOString()};return persist(copy)}return false}
 return {editing,setEditing,drafts,status,draftError:[localError,cloudError].filter(Boolean).join(' '),localFailed:!!localError,refresh,resume,finish,checkpoint,current};
}
