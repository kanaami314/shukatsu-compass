import assert from 'node:assert/strict';
import {proofread,proofreadInput} from './lib/proofread.ts';
const input={content:'研修は3か月。',feeling:'残業は不安。'},result={...input,changes:[]};
const ok=(value=result,finishReason='STOP')=>Response.json({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(value)}]}}]});
let models=[];
assert.deepEqual(await proofread(input,'secret',undefined,async(url,options)=>{models.push(url);assert.ok(!url.includes('secret'));assert.equal(options.headers['x-goog-api-key'],'secret');assert.deepEqual(JSON.parse(JSON.parse(options.body).contents[0].parts[0].text),input);return models.length===1?new Response('',{status:503}):ok()}),result);
assert.equal(models.length,2);assert.ok(models[0].includes('gemini-3.5-flash-lite'));assert.ok(models[1].includes('gemini-3.1-flash-lite'));
for(const status of [429,403,503]){let calls=0;await assert.rejects(()=>proofread(input,'secret',undefined,async()=>{calls++;return new Response('private',{status})}),e=>!e.message.includes('private'));assert.equal(calls,status===503?2:1)}
let calls=0;await assert.rejects(()=>proofread(input,'key',undefined,async(_,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout'))))},{timeoutMs:5}),e=>e.code==='TIMEOUT');assert.equal(calls,2);
const c=new AbortController();calls=0;await assert.rejects(()=>proofread(input,'key',undefined,async(_,{signal})=>{calls++;c.abort();signal.throwIfAborted();return ok()},{signal:c.signal}),e=>e.code==='CANCELLED');assert.equal(calls,1);
await assert.rejects(()=>proofread(input,'key',undefined,async()=>ok(result,'MAX_TOKENS')),e=>e.code==='INCOMPLETE');
await assert.rejects(()=>proofread(input,'key',undefined,async()=>ok({...result,content:''})));
assert.equal((await proofread({...input,feeling:''},'key',undefined,async()=>ok())).feeling,'');
assert.equal(proofreadInput.safeParse({...input,content:'a'.repeat(10001)}).success,false);
assert.deepEqual(input,{content:'研修は3か月。',feeling:'残業は不安。'});
console.log('PASS: model fallback, no repeated model attempts, quota/auth fail fast, bounded timeouts, cancellation, output validation, source preservation.');
