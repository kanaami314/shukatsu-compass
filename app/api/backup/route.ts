import {loadHolidayCalendar} from '@/lib/holiday-server';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {serviceOwner} from '@/lib/service-auth';
import {storage} from '@/lib/storage';
export async function GET(req:Request){
 const user=await getChatGPTUser(),owner=user?.userId||await serviceOwner(req);
 if(!owner)return Response.json({error:'認証が必要です。'},{status:401});
 try{const result=await storage().prepare('SELECT id, kind, payload, revision FROM records WHERE owner = ? AND deleted = 0 ORDER BY id').bind(owner).all();
 const records=result.results.map((r:any)=>({id:r.id,kind:r.kind,data:JSON.parse(r.payload),revision:r.revision}));
 return Response.json({format:'compass-backup-v1',scope:'saved-records',owner,exportedAt:new Date().toISOString(),records},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'バックアップを取得できませんでした。'},{status:503})}
}
import {schemas,Kind} from '@/lib/model';
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'ログインしてください。'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Forbidden'},{status:403});
 try{const raw=await req.text();if(raw.length>20*1024*1024)return Response.json({error:'一括復元は20MB以下に対応しています。'},{status:413});
 const snapshot=JSON.parse(raw);if(snapshot.format!=='compass-backup-v1'||snapshot.scope!=='saved-records'||snapshot.owner!==user.userId||!Array.isArray(snapshot.records)||snapshot.records.length>5000)throw Error('このアカウントの保存済みデータのバックアップを選んでください。');
 if(snapshot.records.some((r:any)=>r.data?.routine||r.data?.schoolCalendar))await loadHolidayCalendar();
 const rows=snapshot.records,ids=new Set<string>();for(const r of rows){if(typeof r.id!=='string'||ids.has(r.id)||!Object.hasOwn(schemas,r.kind))throw Error('ファイルの記録を確認できません。');ids.add(r.id)}
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.userId+JSON.stringify(rows)));const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const mapped=new Map<string,string>(rows.map((r:any,i:number)=>[r.id,'restored-'+hash.slice(0,40)+'-'+i]));
 const groupIds=[...new Set<string>(rows.filter((r:any)=>r.kind==='event'&&r.data.planning?.groupId).map((r:any)=>r.data.planning.groupId))];
 const groupMap=new Map<string,string>();for(const id of groupIds){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hash+id));const h=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');groupMap.set(id,h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32))}
 const statements=rows.map((r:any)=>{const data={...r.data};if(r.kind==='event'&&data.planning?.groupId)data.planning={...data.planning,groupId:groupMap.get(data.planning.groupId)};for(const [key,kind] of [['companyId','company'],['agentId','agent']])if(data[key]){if(!rows.some((x:any)=>x.id===data[key]&&x.kind===kind))throw Error('関連先が不足しているため復元を中止しました。');data[key]=mapped.get(data[key])}
 const parsed=schemas[r.kind as Kind].safeParse(data);if(!parsed.success)throw Error('記録の形式を確認できません。');return storage().prepare('INSERT INTO records(id, owner, kind, payload) VALUES(?, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING id').bind(mapped.get(r.id),user.userId,r.kind,JSON.stringify(parsed.data))});
 // Validate all records before the atomic write; retries of the same file do not duplicate data.
 const result=statements.length?await storage().batch(statements):[];
 return Response.json({added:result.reduce((n,r)=>n+r.results.length,0)});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'復元できませんでした。既存の記録は変更していません。'},{status:400})}
}
