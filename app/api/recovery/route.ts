import {getChatGPTUser} from '@/app/chatgpt-auth';
import {storage} from '@/lib/storage';
export async function GET(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'ログインしてください'},{status:401});
 try{
  const offset=Math.max(0,Math.min(10000000,Number(new URL(req.url).searchParams.get('offset'))||0));
  const db=storage();const [history,deleted,draftHistory]=await db.batch([
   db.prepare('SELECT h.*, r.revision AS current_revision FROM record_history h JOIN records r ON h.record_id = r.id AND h.owner = r.owner WHERE h.owner = ? ORDER BY h.saved_at DESC, h.id LIMIT 100 OFFSET ?').bind(user.userId,offset),
   db.prepare('SELECT * FROM records WHERE owner = ? AND deleted = 1').bind(user.userId),
   db.prepare('SELECT * FROM draft_history WHERE owner = ? ORDER BY saved_at DESC, id LIMIT 100 OFFSET ?').bind(user.userId,offset)
  ]);
  return Response.json({hasMore:history.results.length===100||draftHistory.results.length===100,draftHistory:draftHistory.results.map((r:any)=>({...JSON.parse(r.payload),historyId:r.id})),history:history.results.map((r:any)=>({id:r.record_id,kind:r.kind,data:JSON.parse(r.payload),revision:r.current_revision,sourceRevision:r.revision,savedAt:r.saved_at})),deleted:deleted.results.map((r:any)=>({id:r.id,kind:r.kind,data:JSON.parse(r.payload),revision:r.revision}))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return Response.json({error:'復元用の記録を読み込めませんでした。'},{status:503})}
}
