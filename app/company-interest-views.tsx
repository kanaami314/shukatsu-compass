'use client';
import {BusinessBadges} from './company-business';
import type {ReactNode} from 'react';
import {applicationCategories} from '@/lib/model';
import type {RecordItem} from '@/lib/model';
import {interestScore,sortByInterest} from '@/lib/company-interest';
type Props={companies:RecordItem[];mode:'score'|'category';onOpen:(c:RecordItem)=>void;agentName:(id:string)=>string;activeId?:string;activeData?:any;disabled:boolean;onChange:(c:RecordItem,key:string,value:any)=>void;actions:ReactNode};
export default function CompanyInterestViews({companies,mode,onOpen,agentName,activeId,activeData,disabled,onChange,actions}:Props){
 const sorted=sortByInterest(companies);
 function card(c:RecordItem,index:number){
  const active=activeId===c.id,data=active?activeData:c.data;
  const locked=disabled||!!activeId&&!active;
  return <article className={'interest-company '+(active?'is-editing':'')} key={c.id}>
   <div className="interest-identity">{mode==='score'&&<span className="interest-rank">{interestScore(c.data)===null?'—':String(index+1).padStart(2,'0')}</span>}<div><button className="interest-name" onClick={()=>onOpen(c)}>{c.data.name}</button><p>{c.data.industry||'業種未登録'} · {agentName(c.data.agentId)}</p><span className="badge">{c.data.status}</span><BusinessBadges profile={data.businessProfile}/></div></div>
   <fieldset disabled={locked} className="interest-controls"><label className="score-control"><span>志望度スコア</span><div><input aria-label={c.data.name+'の志望度スコア'} type="number" min="0" max="100" step="1" inputMode="numeric" placeholder="未設定" value={data.interestScore??''} onChange={e=>onChange(c,'interestScore',e.target.value===''?null:Number(e.target.value))}/><small>/ 100</small></div><progress max="100" value={data.interestScore??0}/></label>
   <label className="category-control"><span>応募カテゴリ</span><select aria-label={c.data.name+'の応募カテゴリ'} value={data.applicationCategory||applicationCategories[4]} onChange={e=>onChange(c,'applicationCategory',e.target.value)}>{applicationCategories.map(v=><option key={v}>{v}</option>)}</select></label>
   <label><span>志望度</span><select aria-label={c.data.name+'の志望度'} value={data.priority} onChange={e=>onChange(c,'priority',e.target.value)}>{['高','中','低'].map(v=><option key={v}>{v}</option>)}</select></label>
   <label><span>判断段階</span><select aria-label={c.data.name+'の判断段階'} value={data.assessment||'未設定'} onChange={e=>onChange(c,'assessment',e.target.value)}>{['説明会前','説明会後','未設定'].map(v=><option key={v}>{v}</option>)}</select></label></fieldset>
   {active&&<div className="interest-row-actions">{actions}</div>}
  </article>
 }
 return <section className={'interest-workspace '+mode}><div className="interest-intro"><div><h2>{mode==='score'?'志望度ランキング':'応募の考え方で整理'}</h2><p>各企業の入力欄から直接変更できます。保存すると{mode==='score'?'順位':'カテゴリ'}に反映します。</p></div><span className="interest-total">{companies.length}<small>社</small></span></div>{mode==='score'?<div className="interest-ranking">{sorted.map(card)}{!sorted.length&&<p className="interest-empty">条件に合う企業がありません。</p>}</div>:<div className="interest-category-grid">{applicationCategories.map((category,i)=>{const items=sorted.filter(c=>(c.data.applicationCategory||applicationCategories[4])===category);return <section className={'interest-lane lane-'+i} key={category}><header><span className="lane-dot"/><h3>{category}</h3><b>{items.length}社</b></header><div className="interest-lane-cards">{items.map(card)}{!items.length&&<p className="interest-empty">このカテゴリの企業はありません</p>}</div></section>})}</div>}</section>
}
