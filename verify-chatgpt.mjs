import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
const out='.sites-runtime/mcp-tests';fs.mkdirSync(out,{recursive:true});
function compile(file,name,replace=[]){let source=fs.readFileSync(file,'utf8');for(const [a,b] of replace)source=source.replaceAll(a,b);fs.writeFileSync(`${out}/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)}
compile('lib/holidays.ts','holidays',[["import bundled from './holiday-dates.json';",'const bundled='+fs.readFileSync('lib/holiday-dates.json','utf8')+';']]);
for(const name of ['routine-schema','routines','model','ai-access','job-hunt-mcp','ai-access-store'])compile(`lib/${name}.ts`,name,[...['holidays','routines','routine-schema','model','ai-access'].map(s=>[`'./${s}'`,`'./${s}.mjs'`]),["'./storage'","'./deps.mjs'"]]);
fs.writeFileSync(`${out}/deps.mjs`,'export const storage=()=>globalThis.mcpDB;export const getChatGPTUser=async()=>globalThis.mcpUser;');
compile('app/api/ai-access/route.ts','settings-route',[['@/app/chatgpt-auth','./deps.mjs'],['@/lib/storage','./deps.mjs'],['@/lib/ai-access-store','./ai-access-store.mjs'],['@/lib/ai-access','./ai-access.mjs']]);
const {defaultAccess,visibleRecords,scheduleProjection,scheduleSchema}=await import(`./${out}/ai-access.mjs`);
const {handleMcp,executeReadTool,jobHuntTools}=await import(`./${out}/job-hunt-mcp.mjs`);
const {readAccess,readSavedRecords}=await import(`./${out}/ai-access-store.mjs`);
const settingsRoute=await import(`./${out}/settings-route.mjs`);
const sql=new DatabaseSync(':memory:');
for(const entry of JSON.parse(fs.readFileSync('drizzle/meta/_journal.json','utf8')).entries)sql.exec(fs.readFileSync(`drizzle/${entry.tag}.sql`,'utf8'));
const queries=[];
globalThis.mcpDB={prepare(query){queries.push(query);let args=[];return {bind(...v){args=v;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:sql.prepare(query).run(...args)}}}}};
const company=(id,name)=>({id,kind:'company',revision:1,data:{name,industry:'IT',status:'説明会',priority:'高',assessment:'説明会前',agentId:'agent',overview:'保存した概要',url:'https://example.test/',source:'',unknownFutureField:'PRIVATE_FUTURE'}});
const event=(id,start,end,patch={})=>({id,kind:'event',revision:1,data:{companyId:'c1',title:'企業面接',start,end,place:'SECRET_LOCATION',memo:'SECRET_EVENT_MEMO',...patch}});
const rows=[company('c1','共有企業'),company('c2','EXCLUDED_COMPANY'),
 {id:'n1',kind:'note',data:{companyId:'c1',title:'説明会',date:'2026-10-20',content:'本文',feeling:'本人の主観',rating:'4'}},
 {id:'n2',kind:'note',data:{companyId:'c2',title:'EXCLUDED_NOTE',content:'見せない内容'}},
 {id:'n3',kind:'note',data:{companyId:'c1',title:'INDIVIDUAL_SECRET_NOTE',content:'個別非公開'}},
 {id:'t1',kind:'task',data:{title:'履歴書',companyId:'c1',agentId:'agent',dueDate:'2026-10-25',dueTime:'',priority:'中',done:false,memo:'提出準備'}},
 {id:'agent',kind:'agent',data:{name:'SECRET_AGENT',contact:'SECRET_CONTACT',memo:'SECRET_AGENT_MEMO'}},
 event('e1','2026-10-26T09:00:00+09:00','2026-10-26T10:00:00+09:00'),
 event('e2','2026-10-26T11:00:00+09:00','2026-10-26T12:00:00+09:00',{companyId:'c2',title:'EXCLUDED_EVENT'}),
 event('private','2026-10-26T13:00:00+09:00','2026-10-26T14:00:00+09:00',{companyId:'',title:'PRIVATE_APPOINTMENT'}),
 event('all-day','2026-10-27T00:00:00+09:00','2026-10-28T00:00:00+09:00',{companyId:'',title:'PRIVATE_DAY',allDay:true})];
const insert=(r,owner='alice',deleted=0)=>sql.prepare('INSERT INTO records (id,owner,kind,payload,revision,deleted) VALUES (?,?,?,?,?,?)').run(r.id,owner,r.kind,JSON.stringify(r.data),r.revision||1,deleted);
rows.forEach(r=>insert(r));insert(company('bob-company','BOB_PRIVATE'),'bob');insert(company('deleted','DELETED_PRIVATE'),'alice',1);
const access={enabled:true,kinds:['company','note','task','event'],excludedIds:['c2','n3']};
globalThis.mcpUser={userId:'alice'};
const postSettings=(settings,revision=0,owner='alice',origin='https://app.test')=>settingsRoute.POST(new Request('https://app.test/api/ai-access',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({owner,revision,settings})}));
assert.equal((await readAccess('alice')).settings.enabled,false);
assert.equal((await postSettings(access)).status,200);
assert.equal((await postSettings(access)).status,409);
assert.equal((await postSettings(access,1,'bob')).status,400);
assert.equal((await postSettings(access,1,'alice','https://evil.test')).status,403);
assert.equal((await readAccess('bob')).settings.enabled,false);
const deps={readAccess:()=>readAccess('alice'),readRecords:()=>readSavedRecords('alice'),loadHolidays:async()=>{}};
const request=(method,params={},id=1)=>new Request('https://app.test/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method,params,id})});
const call=async(name,args={})=>(await (await handleMcp(request('tools/call',{name,arguments:args}),'alice',deps)).json()).result;
assert.equal((await handleMcp(request('tools/list'),null,deps)).status,401);
assert.equal((await (await handleMcp(request('server/discover'),'alice',deps)).json()).result.supportedVersions[0],'2026-07-28');
assert.equal((await (await handleMcp(request('initialize',{protocolVersion:'2025-03-26'}),'alice',deps)).json()).result.protocolVersion,'2025-03-26');
assert.ok(jobHuntTools.every(t=>t.annotations.readOnlyHint&&!t.annotations.destructiveHint));
const snapshot=sql.prepare('SELECT * FROM records ORDER BY id').all();
queries.length=0;
const overview=await call('get_job_hunt_overview');
assert.equal(overview.isError,false);assert.equal(JSON.parse(overview.content[0].text).counts.companies,1);
assert.ok(queries.every(q=>q.startsWith('SELECT ')));assert.ok(queries.some(q=>q.includes('owner = ? AND deleted = 0')));
const searched=JSON.parse((await call('search_job_hunt_records',{query:'',limit:1})).content[0].text);
assert.equal(searched.records.length,1);assert.equal(searched.nextOffset,1);assert.equal(searched.total,3);
const next=JSON.parse((await call('search_job_hunt_records',{query:'',limit:1,offset:1})).content[0].text);
assert.notEqual(searched.records[0].id,next.records[0].id);
for(const id of ['bob-company','deleted','c2','n2','n3','agent','e1'])assert.equal((await call('get_job_hunt_record',{id})).isError,true);
const detail=await call('get_job_hunt_record',{id:'c1'});assert.equal(detail.isError,false);assert.ok(!detail.content[0].text.includes('PRIVATE_FUTURE'));assert.ok(!detail.content[0].text.includes('agentId'));
assert.equal((await call('delete_record',{id:'c1'})).isError,true);
assert.equal((await call('search_job_hunt_records',{query:'',owner:'bob'})).isError,true);
assert.equal((await call('search_job_hunt_records',{query:'',limit:10000})).isError,true);
assert.equal((await call('get_job_hunt_schedule',{from:'2026-02-30',to:'2026-03-01'})).isError,true);
const schedule=scheduleProjection(rows,access,scheduleSchema.parse({from:'2026-10-26',to:'2026-10-27',bufferMinutes:0}), 'https://app.test',0);
assert.equal(schedule.events.length,4);assert.equal(schedule.events.filter(e=>e.title==='予定あり').length,3);
assert.ok(!JSON.stringify(schedule).includes('SECRET'));assert.ok(!JSON.stringify(schedule).includes('EXCLUDED'));assert.ok(!JSON.stringify(schedule).includes('PRIVATE_'));
assert.ok(!schedule.availability.some(d=>d.date==='2026-10-27'));
assert.equal(schedule.events.find(e=>e.allDay).beforeMinutes,0);
assert.deepEqual(schedule.availability[0].slots.map(s=>new Date(Date.parse(s.start)+9*3600000).toISOString().slice(11,16)),['10:00','12:00','14:00']);
const school=event('school','2026-10-01T00:00:00Z','2026-10-01T01:00:00Z',{companyId:'',routine:{category:'school',versions:[{from:'2026-10-01',to:'2028-12-31',weekdays:[1],title:'SECRET_CLASS',startTime:'09:00',endTime:'12:00',nextDay:false,place:'SECRET_SCHOOL',before:0,after:45}],exceptions:[]}});
let routineSchedule=scheduleProjection([school],access,scheduleSchema.parse({from:'2026-10-26',to:'2026-10-26'}),'https://app.test',0);
assert.equal(routineSchedule.events[0].title,'予定あり');assert.equal(new Date(Date.parse(routineSchedule.availability[0].slots[0].start)+9*3600000).toISOString().slice(11,16),'12:45');
assert.equal(scheduleProjection([school],access,scheduleSchema.parse({from:'2026-10-12',to:'2026-10-12'}),'https://app.test',0).events.length,0);
assert.equal(scheduleProjection([school],access,scheduleSchema.parse({from:'2028-10-02',to:'2028-10-02'}),'https://app.test',0).availability,null);
school.data.routine.exceptions=[{date:'2026-10-26',action:'cancel'}];
assert.equal(scheduleProjection([school],access,scheduleSchema.parse({from:'2026-10-26',to:'2026-10-26'}),'https://app.test',0).events.length,0);
assert.equal(visibleRecords(rows,defaultAccess).length,0);
assert.equal(visibleRecords(rows,{...access,kinds:['task']}).length,1);
assert.throws(()=>executeReadTool('get_job_hunt_schedule',{from:'2026-10-26',to:'2026-10-26'},rows,{...access,kinds:['company']},'https://app.test'));
let readCount=0;
const race=await handleMcp(request('tools/call',{name:'get_job_hunt_record',arguments:{id:'c1'}}),'alice',{...deps,readAccess:async()=>({settings:{...access,enabled:++readCount===1},revision:readCount})});
assert.equal((await race.json()).result.isError,true);
assert.equal((await postSettings({...access,enabled:false},1)).status,200);
assert.equal((await call('get_job_hunt_overview')).isError,true);
assert.deepEqual(sql.prepare('SELECT * FROM records ORDER BY id').all(),snapshot);
globalThis.mcpUser=null;assert.equal((await settingsRoute.GET()).status,401);assert.equal((await postSettings(access)).status,401);
console.log('PASS: protocol discovery/legacy initialization, authentication, owner isolation, disabled by default, settings CAS, cross-origin rejection, exclusion cascade, field allowlist, no agent data, pagination, strict inputs, private time masking, all-day blocking, school holiday/exception/buffers, unknown holiday fail-closed, revocation race, and zero saved-record changes.');
