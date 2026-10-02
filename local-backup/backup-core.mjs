import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash,randomUUID} from 'node:crypto';
export const MAX_BYTES=2*1024**3;
const kinds=new Set(['company','note','event','task','agent']);
export function validate(snapshot,owner){
 if(snapshot?.format!=='compass-backup-v1'||snapshot.scope!=='saved-records'||snapshot.owner!==owner||!Array.isArray(snapshot.records))throw Error('バックアップの形式または所有者が一致しません。');
 const ids=new Set();for(const r of snapshot.records){if(!r||typeof r.id!=='string'||ids.has(r.id)||!kinds.has(r.kind)||!r.data||typeof r.data!=='object'||Array.isArray(r.data)||!Number.isInteger(r.revision))throw Error('記録の検証に失敗しました。');ids.add(r.id)}return snapshot;
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const digest=s=>createHash('sha256').update(JSON.stringify(canonical([...s.records].sort((a,b)=>a.id.localeCompare(b.id))))).digest('hex');
export async function saveSnapshot(snapshot,config){
 validate(snapshot,config.owner);const folder=path.resolve(config.backupDirectory),limit=config.maxBytes??MAX_BYTES;
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_BYTES)throw Error('容量上限が不正です。');
 await fs.mkdir(folder,{recursive:true});if((await fs.lstat(folder)).isSymbolicLink())throw Error('保存先にリンクは使えません。');
 const entries=await fs.readdir(folder,{withFileTypes:true});const files=[];let total=0;
 for(const entry of entries){const p=path.join(folder,entry.name),stat=await fs.lstat(p);if(!stat.isFile()||stat.isSymbolicLink())throw Error('保存先はバックアップ専用のフォルダにしてください。');total+=stat.size;if(/^compass-\d{8}T\d{9}Z-[a-f0-9-]+\.json\.gz$/.test(entry.name))files.push({name:entry.name,path:p,size:stat.size})}
 files.sort((a,b)=>a.name.localeCompare(b.name));const hash=digest(snapshot);let previous;
 for(const f of [...files].reverse()){try{const parsed=validate(JSON.parse(gunzipSync(await fs.readFile(f.path),{maxOutputLength:256*1024**2})),config.owner);previous=f;if(digest(parsed)===hash&&total<=limit)return {changed:false,file:f.name,bytes:total,records:snapshot.records.length};break}catch{/* Preserve corrupt generations until a valid new snapshot is verified. */}}
 const compressed=gzipSync(Buffer.from(JSON.stringify(snapshot)),{level:9});
 const reserve=Math.min(256*1024**2,Math.floor(limit/2)),archiveLimit=limit-reserve;
 if(compressed.length>reserve||total+compressed.length>limit)throw Error('検証用の空き容量が不足しています。既存バックアップは保持しました。');
 if(compressed.length>archiveLimit||previous&&compressed.length+previous.size>archiveLimit)throw Error('新旧のバックアップを安全に保持できる容量がありません。既存ファイルは残しました。');
 const stamp=new Date().toISOString().replace(/[-:.]/g,''),name=`compass-${stamp}-${randomUUID()}.json.gz`,target=path.join(folder,name),temp=target+'.partial';
 try{const handle=await fs.open(temp,'wx');try{await handle.writeFile(compressed);await handle.sync()}finally{await handle.close()}
 const check=validate(JSON.parse(gunzipSync(await fs.readFile(temp),{maxOutputLength:256*1024**2})),config.owner);if(digest(check)!==hash)throw Error('書き込み後の検証に失敗しました。');
 // Never delete the last verified generation; only this program's files in this exact folder.
 let projected=total+compressed.length;const victims=[];for(const f of files){if(projected<=archiveLimit)break;if(f.name===previous?.name)continue;victims.push(f);projected-=f.size}
 if(projected>archiveLimit)throw Error('容量不足です。既存のバックアップを保持しました。');
 await fs.rename(temp,target);for(const f of victims)await fs.unlink(f.path);
 return {changed:true,file:name,bytes:projected,records:snapshot.records.length};
 }finally{await fs.unlink(temp).catch(()=>{})}
}
