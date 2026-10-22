import {storage} from '@/lib/storage';
import {widgetTokenPattern,hashWidgetToken,buildWidgetFeed} from '@/lib/widget-feed';
import type {RecordItem} from '@/lib/model';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 const token=req.headers.get('X-Compass-Widget')||'';
 if(!widgetTokenPattern.test(token))return reply({error:'WIDGET_UNAUTHORIZED'},401);
 try{
  const db=storage(),hash=await hashWidgetToken(token);
  const access=await db.prepare('SELECT owner,revision FROM widget_access WHERE token_hash = ? AND enabled = 1').bind(hash).first<{owner:string;revision:number}>();
  if(!access)return reply({error:'WIDGET_UNAUTHORIZED'},401);
  const rows=await db.prepare("SELECT id,kind,payload FROM records WHERE owner = ? AND deleted = 0 AND kind IN ('event','task','company','agent')").bind(access.owner).all<{id:string;kind:RecordItem['kind'];payload:string}>();
  const feed=buildWidgetFeed(rows.results.map(r=>({id:r.id,kind:r.kind,data:JSON.parse(r.payload)})));
  const stillAllowed=await db.prepare('SELECT owner FROM widget_access WHERE owner = ? AND token_hash = ? AND revision = ? AND enabled = 1').bind(access.owner,hash,access.revision).first();
  if(!stillAllowed)return reply({error:'WIDGET_UNAUTHORIZED'},401);
  return reply(feed);
 }catch{return reply({error:'WIDGET_UNAVAILABLE'},503)}
}
