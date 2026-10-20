import {storage} from './storage';
import {accessSchema,defaultAccess} from './ai-access';
export async function readAccess(owner:string){
 const row:any=await storage().prepare('SELECT payload, revision FROM ai_access_settings WHERE owner = ?').bind(owner).first();
 return {settings:row?accessSchema.parse(JSON.parse(row.payload)):{...defaultAccess},revision:row?.revision??0};
}
export async function readSavedRecords(owner:string){
 const rows=await storage().prepare("SELECT id, kind, payload, revision FROM records WHERE owner = ? AND deleted = 0 AND kind IN ('company','note','task','event')").bind(owner).all();
 return rows.results.map((r:any)=>({id:r.id,kind:r.kind,data:JSON.parse(r.payload),revision:r.revision}));
}
