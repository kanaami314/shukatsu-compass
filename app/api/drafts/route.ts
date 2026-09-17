import {getChatGPTUser} from '@/app/chatgpt-auth';
import {storage} from '@/lib/storage';
import {z} from 'zod';
const schema=z.object({draftId:z.string().uuid(),createId:z.string().uuid(),id:z.string().max(100).optional(),kind:z.enum(['company','note','event','agent','task']),data:z.record(z.unknown()),revision:z.number().int().positive().optional(),seq:z.number().int().positive(),updatedAt:z.string(),restore:z.boolean().optional(),sourceDraft:z.string().uuid().optional()});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'ログインしてください'},{status:401});
 try{const rows=await storage().prepare('SELECT payload FROM drafts WHERE owner = ? AND archived = 0 ORDER BY updated_at DESC').bind(user.userId).all();return Response.json({drafts:rows.results.map((r:any)=>JSON.parse(r.payload))},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'下書きを読み込めませんでした。'},{status:503})}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'ログインしてください'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'不正なリクエストです'},{status:403});
 try{
  const raw=await req.text();if(raw.length>200000)return Response.json({error:'下書きが大きすぎます。ファイルに退避してください。'},{status:413});
  const body=JSON.parse(raw);if(body.owner&&body.owner!==user.userId)return Response.json({error:'ログイン先が変わりました。元のアカウントで開き直してください。'},{status:409});const parsed=schema.safeParse(body);if(!parsed.success)return Response.json({error:'下書きの形式を確認できません。'}, {status:400});
  const d=parsed.data,db=storage(),archived=body.archived===true?1:0;
  await db.prepare('INSERT INTO drafts (id, owner, payload, sequence, archived, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, sequence = excluded.sequence, archived = excluded.archived, updated_at = excluded.updated_at WHERE drafts.owner = excluded.owner AND drafts.archived = 0 AND excluded.sequence > drafts.sequence').bind(d.draftId,user.userId,JSON.stringify(d),d.seq,archived,new Date().toISOString()).run();
  const row:any=await db.prepare('SELECT owner, sequence, archived FROM drafts WHERE id = ?').bind(d.draftId).first();
  if(row?.owner!==user.userId||(!archived&&row.archived))return Response.json({code:'DRAFT_ARCHIVED',error:'この下書きは別の画面で保存済みです。入力をファイルに退避して開き直してください。'},{status:409});
  return Response.json({ok:true,seq:row.sequence,archived:!!row.archived});
 }catch(e){console.error(e);return Response.json({error:'下書きのクラウド保存を確認できませんでした。'}, {status:503})}
}
