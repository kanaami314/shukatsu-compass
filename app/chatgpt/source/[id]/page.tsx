import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {readAccess,readSavedRecords} from '@/lib/ai-access-store';
import {visibleRecords,projectRecord} from '@/lib/ai-access';
const labels:Record<string,string>={name:'名称',contact:'連絡先',agentName:'紹介元・エージェント',industry:'業種',status:'選考状況',priority:'志望度・優先度',assessment:'評価した段階',interestScore:'志望度スコア',applicationCategory:'応募カテゴリ',overview:'企業概要（保存済みの内容）',url:'公式・採用サイト',source:'概要の参照元',companyName:'企業名',date:'記録日',title:'タイトル',content:'説明会で聞いたこと・本人の記録',feeling:'本人の感想',rating:'本人の評価',dueDate:'期限',dueTime:'期限の時刻',done:'完了',memo:'メモ'};
export default async function Source({params}:{params:Promise<{id:string}>}){
 const {id}=await params,user=await requireChatGPTUser('/chatgpt/source/'+encodeURIComponent(id));
 const {settings}=await readAccess(user.userId),rows=settings.enabled?await readSavedRecords(user.userId):[];
 const row=visibleRecords(rows,settings).find(r=>r.id===id);
 return <main style={{maxWidth:850,margin:'40px auto',padding:24}}><a href="/">← 就活コンパスに戻る</a><h1 style={{fontSize:26,margin:'24px 0'}}>ChatGPTが参照する保存済みの記録</h1>{!row?<p>この記録は見つからないか、現在共有されていません。</p>:<><p>表示時点の最新版です。変更履歴ではありません。revision: {row.revision??1}</p><dl>{Object.entries(projectRecord(row,rows,'https://localhost',settings).data).filter(([key])=>labels[key]).map(([key,value])=><div key={key} style={{margin:'24px 0'}}><dt style={{fontWeight:700}}>{labels[key]}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',marginTop:8}}>{typeof value==='boolean'?(value?'完了':'未完了'):value===null?'未設定':String(value||'未記入')}</dd></div>)}</dl></>}</main>;
}
