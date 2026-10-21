import {confirmEvent} from '@/lib/confirm-event';
import {loadHolidayCalendar} from '@/lib/holiday-server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { storage } from '@/lib/storage';
import { schemas,Kind } from '@/lib/model';
const response=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const record=(r:any)=>({id:r.id,kind:r.kind,data:JSON.parse(r.payload),revision:r.revision});
const archive=(db:ReturnType<typeof storage>,id:string,owner:string,revision:number,payload:string)=>db.prepare("INSERT INTO record_history (id, record_id, owner, kind, payload, revision, saved_at) SELECT id || ':' || revision, id, owner, kind, payload, revision, strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM records WHERE id = ? AND owner = ? AND revision = ? AND payload = ? ON CONFLICT(id) DO NOTHING").bind(id,owner,revision,payload);
const refGuard="(? = '' OR EXISTS (SELECT 1 FROM records p WHERE p.id = ? AND p.owner = ? AND p.kind = 'company' AND p.deleted = 0)) AND (? = '' OR EXISTS (SELECT 1 FROM records p WHERE p.id = ? AND p.owner = ? AND p.kind = 'agent' AND p.deleted = 0))";
const conflict=()=>response({error:'別の画面で変更または削除されています。上書きせず入力を下書きに残しました。下書きを閉じて最新の記録を確認してください。'},409);
export async function GET(){
 const user=await getChatGPTUser();if(!user)return response({error:'ログインしてください'},401);
 try{const rows=await storage().prepare('SELECT * FROM records WHERE owner = ? AND deleted = 0').bind(user.userId).all();return response({owner:user.userId,records:rows.results.map(record)})}
 catch(e){console.error(e);return response({error:'データを読み込めません。時間をおいて再読み込みしてください。'},503)}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return response({error:'ログインしてください'},401);
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return response({error:'不正なリクエストです'},403);
 try{
  const body:any=await req.json(),kind=body.kind as Kind;if(body.owner&&body.owner!==user.userId)return response({error:'ログイン先が変わりました。元のアカウントで開き直してください。'},409);
  if(!Object.hasOwn(schemas,kind))return response({error:'種類が不正です'},400);
  if(kind==='event'&&(body.data?.routine||body.data?.schoolCalendar))await loadHolidayCalendar();
  const result=schemas[kind].safeParse(body.data);if(!result.success)return response({error:result.error.issues.map(i=>i.message).join(' / ')},400);
  const db=storage(),data=result.data as any,id=body.id||body.createId;let payload=JSON.stringify(data);
  if(typeof id!=='string'||!id||id.length>100)return response({error:'画面を更新して下書きから再開してください。'},400);
  for(const [key,refKind] of [['companyId','company'],['agentId','agent']]){
   if(data[key]&&!await db.prepare('SELECT id FROM records WHERE id = ? AND owner = ? AND kind = ? AND deleted = 0').bind(data[key],user.userId,refKind).first())return response({error:'関連する企業・エージェントが見つかりません。先に復元または関連付けを変更してください。'},400);
  }
  const groupId=data.planning?.groupId||'';
  const groupGuard=" AND (? = '' OR NOT EXISTS (SELECT 1 FROM records g WHERE g.owner = ? AND g.kind = 'event' AND g.deleted = 0 AND g.id <> ? AND json_extract(g.payload,'$.planning.groupId') = ? AND json_extract(g.payload,'$.planning.status') = 'confirmed'))";
  const groupArgs=()=>[data.planning?.groupId||'',user.userId,id,data.planning?.groupId||''];
  const existing:any=await db.prepare('SELECT * FROM records WHERE id = ? AND owner = ?').bind(id,user.userId).first();
  if(existing){
   if(existing.kind!==kind||existing.deleted===2)return conflict();
   // Older tabs and restored drafts must not erase newly introduced company fields.
   if(kind==='company'||kind==='event'){const previous=JSON.parse(existing.payload);for(const key of (kind==='company'?['interestScore','applicationCategory','businessProfile']:['routine','schoolCalendar','planning']))if(!Object.hasOwn(body.data,key)&&Object.hasOwn(previous,key))data[key]=previous[key];payload=JSON.stringify(data)}
   if(!existing.deleted&&existing.payload===payload)return response({record:record(existing)});
   if(!body.id||!Number.isInteger(body.revision)||body.revision!==existing.revision||(!body.restore&&existing.deleted))return conflict();
   if(kind==='event'&&data.planning?.status==='confirmed'&&groupId&&JSON.parse(existing.payload).planning?.status==='tentative'&&!existing.deleted){
    const removedIds=await confirmEvent(db,user.userId,existing,data,body.confirmCandidates);
    if(removedIds===null)return response({error:'候補の内容が変更されています。確定は行っていません。最新の一覧を読み込み、候補を確認し直してください。'},409);
    return response({record:{id,kind,data,revision:body.revision+1},removedIds});
   }
   const results=await db.batch([archive(db,id,user.userId,body.revision,existing.payload),db.prepare('UPDATE records SET payload = ?, revision = revision + 1, deleted = 0, deleted_at = NULL WHERE id = ? AND owner = ? AND revision = ? AND payload = ? AND '+refGuard+groupGuard+' RETURNING id').bind(payload,id,user.userId,body.revision,existing.payload,data.companyId||'',data.companyId||'',user.userId,data.agentId||'',data.agentId||'',user.userId,...groupArgs())]);
   if(!results[1].results.length)return conflict();
   return response({record:{id,kind,data,revision:body.revision+1}});
  }
  if(body.id)return conflict();
  if(kind==='event'&&groupId&&data.planning?.status==='confirmed')return response({error:'候補グループの予定は、いったん仮予定として保存してから確定してください。'},400);
  const inserted=await db.prepare('INSERT INTO records (id, owner, kind, payload) SELECT ?, ?, ?, ? WHERE '+refGuard+groupGuard+' RETURNING id').bind(id,user.userId,kind,payload,data.companyId||'',data.companyId||'',user.userId,data.agentId||'',data.agentId||'',user.userId,...groupArgs()).first();if(!inserted)return conflict();
  return response({record:{id,kind,data,revision:1}});
 }catch(e){console.error(e);return response({error:'保存を確認できませんでした。入力は残っています。そのまま再試行できます。'},503)}
}
export async function DELETE(req:Request){
 const user=await getChatGPTUser();if(!user)return response({error:'ログインしてください'},401);
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return response({error:'不正なリクエストです'},403);
 try{
  const {id,revision,owner}=await req.json() as any;if(owner&&owner!==user.userId)return conflict();if(typeof id!=='string'||!Number.isInteger(revision))return conflict();
  const db=storage();const existing:any=await db.prepare('SELECT * FROM records WHERE id = ? AND owner = ?').bind(id,user.userId).first();if(!existing||existing.revision!==revision)return conflict();
  const results=await db.batch([archive(db,id,user.userId,revision,existing.payload),db.prepare("UPDATE records SET deleted = 1, deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), revision = revision + 1 WHERE id = ? AND owner = ? AND revision = ? AND payload = ? AND deleted = 0 AND NOT EXISTS (SELECT 1 FROM records c WHERE c.owner = ? AND c.deleted = 0 AND (json_extract(c.payload, '$.companyId') = ? OR json_extract(c.payload, '$.agentId') = ?)) RETURNING id").bind(id,user.userId,revision,existing.payload,user.userId,id,id)]);
  if(!results[1].results.length)return response({error:'記録が更新済み、または関連する記録があります。最新の状態を確認してください。'},409);
  return response({ok:true});
 }catch(e){console.error(e);return response({error:'削除を確認できませんでした。最新の一覧を確認してください。'},503)}
}
