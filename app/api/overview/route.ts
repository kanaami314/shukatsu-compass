import {getChatGPTUser} from '@/app/chatgpt-auth';
import {companyMatchScore} from '@/lib/company-match';
export async function GET(req:Request){
 if(!await getChatGPTUser())return Response.json({error:'ログインしてください'},{status:401});
 const q=new URL(req.url).searchParams.get('q')?.trim();
 if(!q||q.length>150)return Response.json({error:'企業名を入力してください'},{status:400});
 try{
  const base='https://ja.wikipedia.org/w/api.php?format=json&';
  const headers={'User-Agent':'ShukatsuCompass/1.0 (company reference lookup)'};
  async function query(params:Record<string,string>){const r=await fetch(base+new URLSearchParams(params),{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Lookup unavailable');const body=await r.json() as any;if(body.error)throw new Error('Lookup unavailable');return body}
  const name=q.replace(/株式会社|有限会社|合同会社/g,'').trim();
  const exact=await query({action:'query',prop:'extracts|categories|pageprops',exintro:'1',explaintext:'1',exlimit:'max',cllimit:'max',redirects:'1',titles:name});
  const exactPages=Object.values(exact.query?.pages||{}).filter((p:any)=>companyMatchScore(q,p)>0) as any[];
  if(exactPages.length)return Response.json({candidates:exactPages.map(p=>({title:p.title,overview:(p.extract||'').slice(0,5000),source:'https://ja.wikipedia.org/?curid='+p.pageid,score:100}))});
  const search=await query({action:'query',list:'search',srsearch:name,srlimit:'8'});
  const ids=search.query?.search?.map((h:any)=>h.pageid).join('|');
  if(!ids)return Response.json({error:'企業と確認できる候補が見つかりません。正式名称で検索するか、公式サイトを参照して入力してください。'},{status:404});
  const detail=await query({action:'query',prop:'extracts|categories|pageprops',exintro:'1',explaintext:'1',exlimit:'max',cllimit:'max',pageids:ids});
  const candidates=Object.values(detail.query?.pages||{}).map((p:any)=>({title:p.title,overview:(p.extract||'').slice(0,5000),source:'https://ja.wikipedia.org/?curid='+p.pageid,score:companyMatchScore(q,p)})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
  if(!candidates.length)return Response.json({error:'企業名と記事の内容が一致する候補を確認できませんでした。誤取得を避けるため表示していません。正式名称で再検索するか、公式サイトを参照して入力してください。'},{status:404});
  return Response.json({candidates});
 }catch{return Response.json({error:'候補を取得できませんでした。時間をおいて再検索するか、企業概要を手入力してください。'},{status:503})}
}
