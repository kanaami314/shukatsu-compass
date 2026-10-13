import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {proofread,proofreadInput,ProofreadError} from '@/lib/proofread';

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
  if(!await getChatGPTUser())return json({error:'ログインしてください。'},401);
  return json({configured:Boolean(env.GEMINI_API_KEY)});
}
export async function POST(req:Request){
  if(!await getChatGPTUser())return json({error:'ログインしてください。'},401);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'不正なリクエストです。'},403);
  if(!env.GEMINI_API_KEY)return json({error:'AI校正は準備中です。Gemini APIキーの接続が必要です。'},503);
  let body;
  try{
    if(Number(req.headers.get('content-length'))>150000)return json({error:'文章が長すぎます。'},413);
    const raw=await req.text();
    if(raw.length>130000)return json({error:'文章が長すぎます。'},413);
    body=proofreadInput.safeParse(JSON.parse(raw));
  }catch{return json({error:'入力を確認してください。'},400)}
  if(!body.success)return json({error:'本文を入力してください。各欄は10000文字以内です。'},400);
  try{return json(await proofread(body.data,env.GEMINI_API_KEY,undefined,fetch,{signal:req.signal}))}
  catch(error){return json({error:error instanceof ProofreadError?error.message+'（'+error.code+'）':'校正に失敗しました。'},error instanceof ProofreadError?error.status:503)}
}
