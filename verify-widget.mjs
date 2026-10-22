import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
const out='.sites-runtime/widget-tests';fs.mkdirSync(out,{recursive:true});
function compile(file,name,replacements=[]){let s=fs.readFileSync(file,'utf8');for(const [a,b] of replacements)s=s.replaceAll(a,b);fs.writeFileSync(`${out}/${name}.mjs`,ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)}
compile('lib/holidays.ts','holidays',[["import bundled from './holiday-dates.json';",'const bundled='+fs.readFileSync('lib/holiday-dates.json','utf8')+';']]);
compile('lib/routine-schema.ts','routine-schema',[["'./holidays'","'./holidays.mjs'"]]);
compile('lib/model.ts','model',[["'./routine-schema'","'./routine-schema.mjs'"]]);
compile('lib/widget-feed.ts','widget-feed',[["'./model'","'./model.mjs'"]]);
fs.writeFileSync(`${out}/deps.mjs`,'export const storage=()=>globalThis.widgetDB;export const getChatGPTUser=async()=>globalThis.widgetUser;');
for(const name of ['settings','feed'])compile(`app/api/widget/${name}/route.ts`,name,[['@/app/chatgpt-auth','./deps.mjs'],['@/lib/storage','./deps.mjs'],['@/lib/widget-feed','./widget-feed.mjs']]);
compile('widget-relay/index.ts','relay');
const settings=await import(`./${out}/settings.mjs`),feed=await import(`./${out}/feed.mjs`),{buildWidgetFeed,hashWidgetToken}=await import(`./${out}/widget-feed.mjs`),{default:relay}=await import(`./${out}/relay.mjs`);
const sql=new DatabaseSync(':memory:');
for(const entry of JSON.parse(fs.readFileSync('drizzle/meta/_journal.json','utf8')).entries)sql.exec(fs.readFileSync(`drizzle/${entry.tag}.sql`,'utf8'));
let afterRead=null;const queries=[];
globalThis.widgetDB={prepare(q){queries.push(q);let args=[];return {bind(...values){args=values;return this},async first(){return sql.prepare(q).get(...args)||null},async all(){const results=sql.prepare(q).all(...args);if(afterRead){const f=afterRead;afterRead=null;f()}return {results}}}}};
const post=(action='rotate',revision=0,owner='alice',origin='https://app.test')=>settings.POST(new Request('https://app.test/api/widget/settings',{method:'POST',headers:{origin},body:JSON.stringify({action,revision,owner})}));
const getFeed=token=>feed.GET(new Request('https://app.test/api/widget/feed',{headers:token?{'X-Compass-Widget':token}:{}}));
globalThis.widgetUser=null;assert.equal((await settings.GET()).status,401);assert.equal((await post()).status,401);
globalThis.widgetUser={userId:'alice'};
assert.equal((await (await settings.GET()).json()).enabled,false);
assert.equal((await post('rotate',0,'alice','https://evil.test')).status,403);
assert.equal((await post('rotate',0,'bob')).status,400);
assert.equal((await getFeed()).status,401);assert.equal((await getFeed('cw1_'+'0'.repeat(64))).status,401);
const created=await (await post()).json();assert.match(created.token,/^cw1_[a-f0-9]{64}$/);
const dbRow=sql.prepare('SELECT * FROM widget_access').get();assert.equal(dbRow.token_hash,await hashWidgetToken(created.token));assert.ok(!JSON.stringify(dbRow).includes(created.token));
assert.equal((await post()).status,409);
assert.ok(!JSON.stringify(await (await settings.GET()).json()).includes('token'));
const now=Date.now(),iso=ms=>new Date(ms).toISOString(),day=ms=>new Date(ms+9*3600000).toISOString().slice(0,10);
const event=(id,patch={})=>({id,kind:'event',data:{title:id,companyId:'company',start:iso(now+3600000),end:iso(now+7200000),memo:'SECRET',place:'SECRET',...patch}});
const task=(id,patch={})=>({id,kind:'task',data:{title:id,dueDate:day(now+86400000),done:false,memo:'SECRET',...patch}});
const records=[{id:'company',kind:'company',data:{name:'企業名',overview:'SECRET'}},{id:'agent',kind:'agent',data:{name:'担当エージェント',contact:'SECRET'}},event('interview',{start:iso(now+1800000),planning:{status:'tentative'}}),event('agent-meeting',{companyId:'',agentId:'agent'}),event('all-day',{allDay:true}),event('past',{start:iso(now-7200000),end:iso(now-1000)}),event('far',{start:iso(now+8*86400000),end:iso(now+9*86400000)}),event('school',{routine:{category:'school'}}),event('work',{routine:{category:'work'}}),{id:'note',kind:'note',data:{title:'SECRET',content:'SECRET'}},task('due'),task('overdue',{dueDate:day(now-86400000)}),task('done',{done:true}),task('far-task',{dueDate:day(now+9*86400000)})];
const insert=(r,owner='alice',deleted=0)=>sql.prepare('INSERT INTO records(id,owner,kind,payload,revision,deleted) VALUES(?,?,?,?,1,?)').run(r.id,owner,r.kind,JSON.stringify(r.data),deleted);
records.forEach(r=>insert(r));insert(event('BOB'),'bob');insert(event('DELETED'),'alice',1);
const snapshot=sql.prepare('SELECT * FROM records ORDER BY id').all();queries.length=0;
let response=await getFeed(created.token),b=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
assert.equal(b.events.length,3);assert.equal(b.tasks.length,2);assert.equal(b.tasks[0].title,'overdue');assert.equal(b.events.find(e=>e.title==='interview').tentative,true);assert.equal(b.events.find(e=>e.title==='all-day').allDay,true);assert.equal(b.events.find(e=>e.title==='agent-meeting').relatedName,'担当エージェント');
for(const secret of ['SECRET','BOB','DELETED','school','work','far-task'])assert.ok(!JSON.stringify(b).includes(secret));
assert.ok(queries.every(q=>q.startsWith('SELECT')));
assert.equal(buildWidgetFeed(Array.from({length:10},(_,i)=>event('e'+i)),now).events.length,6);
const rotated=await (await post('rotate',1)).json();assert.notEqual(rotated.token,created.token);assert.equal((await getFeed(created.token)).status,401);assert.equal((await getFeed(rotated.token)).status,200);
assert.equal((await post('disable',1)).status,409);
assert.equal((await post('disable',2)).status,200);assert.equal((await getFeed(rotated.token)).status,401);
const again=await (await post('rotate',3)).json();afterRead=()=>sql.prepare('UPDATE widget_access SET enabled=0,revision=revision+1 WHERE owner=?').run('alice');assert.equal((await getFeed(again.token)).status,401);
assert.deepEqual(sql.prepare('SELECT * FROM records ORDER BY id').all(),snapshot);
// Relay never forwards caller-controlled destinations, cookies or broad credentials.
const realFetch=globalThis.fetch;let called=0;
const relayReq=(path='/v1/widget',method='GET')=>new Request('https://relay.test'+path,{method,headers:{Authorization:'Bearer '+created.token,cookie:'private','OAI-Sites-Authorization':'attacker','X-Compass-Service':'attacker'}});
globalThis.fetch=async(url,options)=>{called++;assert.equal(url,'https://shukatsu-compass-yamas.polite-spool-1598.chatgpt.site/api/widget/feed');assert.equal(options.redirect,'manual');assert.deepEqual(options.headers,{'OAI-Sites-Authorization':'Bearer SERVER_ONLY','X-Compass-Widget':created.token});return Response.json({...b,secret:'SECRET',events:b.events.map(e=>({...e,memo:'SECRET'}))})};
const env={SITES_SERVICE_TOKEN:'SERVER_ONLY'};
assert.equal((await relay.fetch(relayReq('/api/records'),env)).status,404);assert.equal((await relay.fetch(relayReq('/v1/widget?url=evil'),env)).status,404);assert.equal((await relay.fetch(relayReq('/v1/widget','POST'),env)).status,405);assert.equal(called,0);
response=await relay.fetch(relayReq(),env);assert.equal(response.status,200);assert.ok(!(await response.text()).includes('SECRET'));assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),null);
globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://evil.test'}});assert.equal((await relay.fetch(relayReq(),env)).status,503);
globalThis.fetch=async()=>new Response('private error',{status:500});assert.equal((await relay.fetch(relayReq(),env)).status,503);
globalThis.fetch=realFetch;
// Exercise Scriptable's background flow with API mocks, including cached/offline/revoked states.
const source=fs.readFileSync('public/scriptable/compass.js','utf8');
assert.ok(!source.includes('SERVER_ONLY'));assert.ok(!source.includes('SITES_SERVICE_TOKEN'));
async function runPhone({status=200,offline=false,cache=null,key=created.token}={}){
 const texts=[],files=new Map(cache?[['/cache/'+ 'shukatsu-compass-widget-v1.json',JSON.stringify(cache)]]:[]);
 class Stack{addText(s){texts.push(s);return {}}addSpacer(){}addStack(){return new Stack()}layoutVertically(){}}
 class Widget extends Stack{setPadding(){}async presentMedium(){}}
 class Color{constructor(){}static dynamic(){return new Color()}}
 const context={Date,JSON,Number,String,Error,config:{runsInApp:false,widgetFamily:'medium'},ListWidget:Widget,Color,Font:{systemFont(){},semiboldSystemFont(){}},Script:{setWidget(){},complete(){}},Keychain:{contains:()=>!!key,get:()=>key},FileManager:{local:()=>({joinPath:(a,b)=>a+'/'+b,cacheDirectory:()=>'/cache',fileExists:p=>files.has(p),remove:p=>files.delete(p),readString:p=>files.get(p),writeString:(p,v)=>files.set(p,v)})},Request:class{constructor(url){assert.match(url,/^https:\/\/shukatsu-compass-widget\./);this.response={statusCode:status}}async loadJSON(){assert.equal(this.headers.Authorization,'Bearer '+key);assert.equal(this.onRedirect({}),null);if(offline)throw Error('offline');return status===200?b:{error:'unauthorized'}}}};
 await vm.runInNewContext('(async()=>{'+source+'})()',context);return {texts,files};
}
let phone=await runPhone();assert.ok(phone.texts.includes('interview'));assert.ok(phone.texts.some(t=>t.startsWith('(仮)')));
phone=await runPhone({offline:true,cache:b});assert.ok(phone.texts.some(t=>t.startsWith('未更新')));
phone=await runPhone({offline:true,cache:{...b,generatedAt:iso(now-25*3600000)}});assert.ok(!phone.texts.includes('interview'));
phone=await runPhone({status:401,cache:b});assert.equal(phone.files.size,0);assert.ok(!phone.texts.includes('interview'));
phone=await runPhone({key:null,cache:b});assert.ok(!phone.texts.includes('interview'));
console.log('PASS widget: authentication, isolation, token rotation/revocation races, read-only feed, field allowlist, relay boundary, Scriptable cache and errors');
