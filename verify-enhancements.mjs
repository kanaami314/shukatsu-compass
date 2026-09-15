import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {schemas} from './lib/model.ts';
const company={name:'検証企業',industry:'IT',status:'説明会',priority:'高',agentId:'',overview:'',url:'',source:''};
assert.equal(schemas.company.parse(company).assessment,'未設定');
assert.equal(schemas.company.parse({...company,assessment:'説明会前'}).assessment,'説明会前');
assert.equal(schemas.company.parse({...company,assessment:'説明会後'}).priority,'高');
assert.equal(schemas.company.safeParse({...company,assessment:'unknown'}).success,false);
fs.mkdirSync('.sites-runtime/test',{recursive:true});
async function component(name){fs.writeFileSync('.sites-runtime/test/'+name+'.mjs',ts.transpileModule(fs.readFileSync('app/'+name+'.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);return (await import('./.sites-runtime/test/'+name+'.mjs')).default}
const Text=await component('note-text');const html=renderToStaticMarkup(React.createElement(Text,{text:'## 働き方\n- **週2日**まで\n<script>alert(1)</script>'}));assert.ok(html.includes('<h4>働き方</h4>'));assert.ok(html.includes('<strong>週2日</strong>'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
const Priority=await component('company-priority');assert.ok(renderToStaticMarkup(React.createElement(Priority,{data:company})).includes('未設定'));assert.ok(renderToStaticMarkup(React.createElement(Priority,{data:{...company,assessment:'説明会前'}})).includes('仮評価'));assert.ok(renderToStaticMarkup(React.createElement(Priority,{data:{...company,assessment:'説明会後'}})).includes('評価済み'));
const Calendar=await component('calendar-week');const events=[{id:'all',kind:'event',data:{title:'外出',allDay:true,start:'2027-01-01T00:00:00+09:00',end:'2027-01-03T00:00:00+09:00'}},{id:'timed',kind:'event',data:{title:'オンライン面談',allDay:false,start:'2027-01-02T10:00:00+09:00',end:'2027-01-02T11:00:00+09:00'}}];
const cal=renderToStaticMarkup(React.createElement(Calendar,{days:['2027-01-01','2027-01-02','2027-01-03'],events,tasks:[{id:'task',data:{title:'履歴書提出',dueDate:'2027-01-02',done:false}}],today:'2027-01-01',dateLabel:d=>d,eventWho:()=>'',eventTime:()=>'',onEvent:()=>{},onTask:()=>{},onAdd:()=>{},disabled:false}));assert.equal((cal.match(/class="calendar-all-day"/g)||[]).length,2);assert.ok(cal.includes('オンライン面談'));assert.ok(cal.includes('履歴書提出'));
console.log('Assessment defaults and validation, safe note formatting, priority badges, multi-day blocks with timed events and deadlines passed.');
