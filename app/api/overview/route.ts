import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {officialOverview,OverviewError} from '@/lib/official-overview';
const json=(b:unknown,status=200)=>Response.json(b,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 if(!await getChatGPTUser())return json({error:'ログインしてください。'},401);
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'不正なリクエストです。'},403);
 let q,url;try{const b:any=await req.json();q=b.q?.trim();url=b.url?.trim()||'';if(typeof q!=='string'||!q||q.length>150||typeof url!=='string'||url.length>2000)throw new Error()}catch{return json({error:'企業名とURLを確認してください。'},400)}
 if(!env.GEMINI_API_KEY)return json({error:'企業概要の取得にはGemini APIキーの接続が必要です。'},503);
 try{return json(await officialOverview(q,url,env.GEMINI_API_KEY,env.GEMINI_MODEL,fetch,env.TAVILY_API_KEY))}catch(e){return json({error:e instanceof OverviewError?e.message:'公式情報を取得できませんでした。時間をおいてお試しください。'},e instanceof OverviewError?e.status:503)}
}
