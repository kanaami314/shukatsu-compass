import {storage} from './storage';
import {expirationSql} from './retention-time';
export async function cleanupExpired(owner:string,now=new Date().toISOString()){
 const db=storage();
 const expired=(column:string)=>`${expirationSql(column)} <= julianday(?)`;
 // Scrub payloads but retain small tombstones so delayed retries cannot recreate deleted data.
 const result=await db.batch([
  db.prepare('UPDATE records SET deleted_at = ? WHERE owner = ? AND deleted = 1 AND deleted_at IS NULL').bind(now,owner),
  db.prepare(`DELETE FROM record_history WHERE owner = ? AND ${expired('saved_at')}`).bind(owner,now),
  db.prepare(`DELETE FROM draft_history WHERE owner = ? AND ${expired('saved_at')}`).bind(owner,now),
  db.prepare(`UPDATE drafts SET payload = '{}', archived = 1 WHERE owner = ? AND payload != '{}' AND ${expired('updated_at')}`).bind(owner,now),
  db.prepare(`UPDATE records SET payload = '{}', deleted = 2 WHERE owner = ? AND deleted = 1 AND ${expired('deleted_at')}`).bind(owner,now)
 ]);
 return {completedAt:now,affected:result.map(r=>r.meta?.changes||0)};
}
