'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,Loader2} from 'lucide-react';
import NoteTextView from './note-text';
import type {NoteText} from '@/lib/proofread';
type Result=NoteText&{changes:string[]};
export default function NoteProofreader({content,feeling,disabled,onApply}:{content:string;feeling:string;disabled:boolean;onApply:(v:NoteText)=>void}){
  const [configured,setConfigured]=useState<boolean|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[comparison,setComparison]=useState<{original:NoteText;result:Result}|null>(null),[applied,setApplied]=useState(false);
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>{const c=new AbortController();fetch('/api/proofread',{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<{configured:boolean}>}).then(b=>setConfigured(b.configured)).catch(()=>{if(!c.signal.aborted)setError('AIの接続状態を確認できません。ノートを開き直してください。')});return()=>{c.abort();controller.current?.abort()}},[]);
  const unchanged=!!comparison&&content===comparison.original.content&&feeling===comparison.original.feeling;
  const canUndo=!!comparison&&content===comparison.result.content&&feeling===comparison.result.feeling;
  async function run(){
    if(busy)return;
    const c=new AbortController();controller.current=c;
    const original={content,feeling};setBusy(true);setError('');setComparison(null);setApplied(false);
    try{const r=await fetch('/api/proofread',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(original),signal:c.signal});const b=await r.json() as Result&{error?:string};if(!r.ok)throw new Error(b.error||'校正できませんでした。');if(!c.signal.aborted)setComparison({original,result:b})}
    catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'校正できませんでした。')}
    finally{if(!c.signal.aborted)setBusy(false)}
  }
  return <section className="proofreading">
    <h3><Sparkles size={17}/> AIでノートを再構成</h3>
    <p>メモをテーマ別の見出しと箇条書きに整理し、文章全体を読み返しやすく書き直します。事実・感想・疑問は残し、結果を確認してから採用できます。</p>
    <p className="ai-privacy">無料枠では送信内容がGoogleのサービス改善に使われる場合があります。個人情報や非公開の情報を含めないでください。</p>
    {configured===false&&<p role="status">APIキーの接続待ちです。ノートの記入・保存は利用できます。</p>}
    <button type="button" className="secondary" disabled={disabled||busy||configured!==true||(!content.trim()&&!feeling.trim())} onClick={run}>{busy?<Loader2 size={16} className="animate-spin"/>:<Sparkles size={16}/>} {busy?'構成を整理しています…':'構成から整える'}</button>
    {error&&<p role="alert" className="ai-error">{error}</p>}
    {comparison&&<div className="ai-result" aria-live="polite">
      <p>固有名詞・数字・感想が変わっていないか確認してください。</p>
      {(['content','feeling'] as const).map(key=><div key={key}><h4>{key==='content'?'聞いた内容':'感じたこと'}</h4><div className="ai-compare"><div><span>原文</span><p>{comparison.original[key]||'（空欄）'}</p></div><div><span>再構成案</span><NoteTextView text={comparison.result[key]||'（空欄）'}/></div></div></div>)}
      {comparison.result.changes.length>0&&<details><summary>主な修正点</summary><ul>{comparison.result.changes.map((v,i)=><li key={i}>{v}</li>)}</ul></details>}
      {!applied&&!unchanged&&<p role="status">本文が変更されています。最新の本文でもう一度校正してください。</p>}
      {applied?<><p role="status">編集欄に反映しました。「保存」で確定します。</p><button type="button" className="secondary" disabled={disabled||!canUndo} onClick={()=>{onApply(comparison.original);setApplied(false)}}>原文に戻す</button></>:<button type="button" className="primary" disabled={disabled||!unchanged} onClick={()=>{onApply({content:comparison.result.content,feeling:comparison.result.feeling});setApplied(true)}}>再構成案を採用する</button>}
    </div>}
  </section>
}
