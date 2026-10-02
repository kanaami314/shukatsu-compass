import fs from 'node:fs/promises';
import path from 'node:path';
import {saveSnapshot,validate} from './backup-core.mjs';
const program=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const configPath=process.argv[2];if(!configPath)throw Error('設定ファイルが必要です。');
const config=JSON.parse(await fs.readFile(configPath,'utf8')),statePath=path.join(path.dirname(configPath),'status.json'),lock=path.join(path.dirname(configPath),'running.lock');
let owned=false;
try{
 try{const handle=await fs.open(lock,'wx');await handle.writeFile(String(process.pid));await handle.close();owned=true}catch{const pid=Number(await fs.readFile(lock,'utf8'));let alive=true;try{process.kill(pid,0)}catch{alive=false}if(alive)process.exit(0);await fs.unlink(lock);const handle=await fs.open(lock,'wx');await handle.writeFile(String(process.pid));await handle.close();owned=true}
 let token='';for await(const chunk of process.stdin)token+=chunk;token=token.trim();if(!token)throw Error('接続情報を読み込めません。');
 const site=new URL(config.siteUrl);if(site.protocol!=='https:'||site.hostname!=='shukatsu-compass-yamas.polite-spool-1598.chatgpt.site')throw Error('接続先が一致しません。');
 const response=await fetch(new URL('/api/backup',site),{headers:{'OAI-Sites-Authorization':'Bearer '+token,'X-Compass-Service':token},redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('クラウドに接続できません（HTTP '+response.status+'）。既存バックアップは保持しています。');
 let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>256*1024**2)throw Error('取得容量の上限を超えました。');chunks.push(chunk)}
 const snapshot=validate(JSON.parse(Buffer.concat(chunks)),config.owner);const result=await saveSnapshot(snapshot,config);
 const status={ok:true,lastSuccess:new Date().toISOString(),...result};await fs.writeFile(statePath+'.tmp',JSON.stringify(status,null,2));await fs.rename(statePath+'.tmp',statePath);console.log(JSON.stringify(status));
}catch(e){let old={};try{old=JSON.parse(await fs.readFile(statePath,'utf8'))}catch{}const status={...old,ok:false,lastAttempt:new Date().toISOString(),error:e.message};await fs.writeFile(statePath,JSON.stringify(status,null,2));console.error(e.message);process.exitCode=1}
finally{if(owned)await fs.unlink(lock).catch(()=>{})}
