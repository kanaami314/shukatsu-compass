import {getChatGPTUser} from '@/app/chatgpt-auth';
import {storage} from '@/lib/storage';
import {readAccess} from '@/lib/ai-access-store';
import {accessSchema} from '@/lib/ai-access';
import {z} from 'zod';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return reply({error:'ログインしてください。'},401);
 try{return reply({owner:user.userId,...await readAccess(user.userId)})}catch{return reply({error:'連携設定を読み込めませんでした。'},503)}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'ログインしてください。'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'このアプリの設定画面から変更してください。'},403);
 try{
  const text=await req.text();if(text.length>1600000)return reply({error:'設定が大きすぎます。'},413);
  const body=z.object({owner:z.literal(user.userId),revision:z.number().int().min(0),settings:accessSchema}).strict().safeParse(JSON.parse(text));
  if(!body.success)return reply({error:'設定またはログイン先が変わっています。読み込み直してください。'},400);
  const {revision,settings}=body.data,db=storage(),payload=JSON.stringify(settings);
  const saved=revision===0?await db.prepare('INSERT INTO ai_access_settings (owner,payload,revision) VALUES (?,?,1) ON CONFLICT(owner) DO NOTHING RETURNING revision').bind(user.userId,payload).first():
   await db.prepare('UPDATE ai_access_settings SET payload = ?, revision = revision + 1 WHERE owner = ? AND revision = ? RETURNING revision').bind(payload,user.userId,revision).first();
  if(!saved)return reply({error:'別の画面で連携設定が変更されています。最新の設定を読み込み直してください。'},409);
  return reply({owner:user.userId,settings,revision:saved.revision});
 }catch{return reply({error:'設定の保存を確認できませんでした。最新の設定を読み込み直してください。'},503)}
}
