import {getChatGPTUser} from '@/app/chatgpt-auth';
import {storage} from '@/lib/storage';
import {newWidgetToken,hashWidgetToken} from '@/lib/widget-feed';
import {z} from 'zod';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return reply({error:'ログインしてください。'},401);
 try{
  const row=await storage().prepare('SELECT revision,enabled,updated_at FROM widget_access WHERE owner = ?').bind(user.userId).first<{revision:number;enabled:number;updated_at:string}>();
  return reply({owner:user.userId,revision:row?.revision||0,enabled:!!row?.enabled,updatedAt:row?.updated_at||null});
 }catch{return reply({error:'設定を読み込めませんでした。'},503)}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'ログインしてください。'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'アプリの設定画面から変更してください。'},403);
 try{
  const text=await req.text();if(text.length>2048)return reply({error:'設定が大きすぎます。'},413);
  const parsed=z.object({owner:z.literal(user.userId),revision:z.number().int().min(0),action:z.enum(['rotate','disable'])}).strict().safeParse(JSON.parse(text));
  if(!parsed.success)return reply({error:'設定を読み込み直してください。'},400);
  const {revision,action}=parsed.data,enabled=action==='rotate',token=enabled?newWidgetToken():null,hash=token?await hashWidgetToken(token):null,updatedAt=new Date().toISOString(),db=storage();
  const row=revision===0?await db.prepare('INSERT INTO widget_access (owner,token_hash,enabled,revision,updated_at) VALUES (?,?,?,1,?) ON CONFLICT(owner) DO NOTHING RETURNING revision').bind(user.userId,hash,Number(enabled),updatedAt).first<{revision:number}>():
   await db.prepare('UPDATE widget_access SET token_hash = ?, enabled = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ? RETURNING revision').bind(hash,Number(enabled),updatedAt,user.userId,revision).first<{revision:number}>();
  if(!row)return reply({error:'別の画面で設定が変わりました。「最新の状態を確認」を押してください。'},409);
  return reply({owner:user.userId,revision:row.revision,enabled,updatedAt,token});
 }catch{return reply({error:'保存結果を確認できませんでした。「最新の状態を確認」を押してください。鍵が不明な場合は再発行できます。'},503)}
}
