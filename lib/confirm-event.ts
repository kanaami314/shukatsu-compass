// A single guarded update confirms the chosen event and retires its alternatives.
// The snapshot guard is materialized before any row is changed.
export async function confirmEvent(db:any,owner:string,existing:any,data:any,expected:any){
 const group=data.planning.groupId;
 const rows=(await db.prepare("SELECT * FROM records WHERE owner = ? AND kind = 'event' AND deleted = 0 AND (id = ? OR (json_extract(payload, '$.planning.groupId') = ? AND coalesce(json_extract(payload,'$.companyId'),'')=? AND coalesce(json_extract(payload,'$.agentId'),'')=?))").bind(owner,existing.id,group,data.companyId||'',data.agentId||'').all()).results;
 const peers=rows.filter((r:any)=>r.id!==existing.id);
 if(peers.some((r:any)=>JSON.parse(r.payload).planning?.status!=='tentative')||!Array.isArray(expected)||expected.length!==peers.length||peers.some((r:any)=>!expected.some((e:any)=>e.id===r.id&&e.revision===r.revision)))return null;
 if(!rows.some((r:any)=>r.id===existing.id&&r.revision===existing.revision&&r.payload===existing.payload))return null;
 const snapshot=JSON.stringify(rows.map((r:any)=>({id:r.id,revision:r.revision,payload:r.payload})));
 const guard=`WITH eligible AS MATERIALIZED (SELECT 1 WHERE
 (SELECT count(*) FROM records r JOIN json_each(?) s ON r.id=json_extract(s.value,'$.id') AND r.revision=json_extract(s.value,'$.revision') AND r.payload=json_extract(s.value,'$.payload') WHERE r.owner=? AND r.deleted=0)=?
 AND (SELECT count(*) FROM records WHERE owner=? AND kind='event' AND deleted=0 AND (id=? OR (json_extract(payload,'$.planning.groupId')=? AND coalesce(json_extract(payload,'$.companyId'),'')=? AND coalesce(json_extract(payload,'$.agentId'),'')=?)))=?
 AND (?='' OR EXISTS(SELECT 1 FROM records WHERE id=? AND owner=? AND kind='company' AND deleted=0))
 AND (?='' OR EXISTS(SELECT 1 FROM records WHERE id=? AND owner=? AND kind='agent' AND deleted=0))) `;
 const args=[snapshot,owner,rows.length,owner,existing.id,group,data.companyId||'',data.agentId||'',rows.length,data.companyId||'',data.companyId||'',owner,data.agentId||'',data.agentId||'',owner];
 const result=await db.batch([
 db.prepare(guard+"INSERT INTO record_history (id,record_id,owner,kind,payload,revision,saved_at) SELECT id||':'||revision,id,owner,kind,payload,revision,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM records WHERE owner=? AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND EXISTS(SELECT 1 FROM eligible) ON CONFLICT(id) DO NOTHING").bind(...args,owner,snapshot),
 db.prepare(guard+"UPDATE records SET payload=CASE WHEN id=? THEN ? ELSE payload END, deleted=CASE WHEN id=? THEN 0 ELSE 1 END, deleted_at=CASE WHEN id=? THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ','now') END, revision=revision+1 WHERE owner=? AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND EXISTS(SELECT 1 FROM eligible) RETURNING id").bind(...args,existing.id,JSON.stringify(data),existing.id,existing.id,owner,snapshot)
 ]);
 return result[1].results.length===rows.length?peers.map((r:any)=>r.id):null;
}
