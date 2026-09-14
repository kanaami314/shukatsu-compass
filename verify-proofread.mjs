import assert from 'node:assert/strict';
import {proofread,proofreadInput} from './lib/proofread.ts';
const input={content:'研修は3か月です。',feeling:'残業が多いのは不安。'};
const result={...input,changes:[]};
const response=(value,finishReason='STOP')=>Response.json({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(value)}]}}]});
let calls=0;
assert.deepEqual(await proofread(input,'test-secret',undefined,async(url,options)=>{
  calls++;
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent');
  assert.equal(options.headers['x-goog-api-key'],'test-secret');
  assert.ok(!url.includes('test-secret'));
  const body=JSON.parse(options.body);
  assert.deepEqual(JSON.parse(body.contents[0].parts[0].text),input);
  return response(result);
}),result);
assert.equal(calls,1);
assert.equal(proofreadInput.safeParse({...input,email:'private@example.com'}).success,false);
assert.equal(proofreadInput.safeParse({content:' ',feeling:''}).success,false);
assert.equal(proofreadInput.safeParse({content:'a'.repeat(10001),feeling:''}).success,false);
assert.equal((await proofread({content:input.content,feeling:''},'key',undefined,async()=>response(result))).feeling,'');
for(const [status,expected] of [[429,429],[403,503],[500,503]]){
  let count=0;
  await assert.rejects(()=>proofread(input,'secret',undefined,async()=>{count++;return new Response('private upstream error',{status})}),e=>e.status===expected&&!e.message.includes('private upstream error'));
  assert.equal(count,1,'Do not automatically retry');
}
await assert.rejects(()=>proofread(input,'key',undefined,async()=>response(result,'MAX_TOKENS')));
await assert.rejects(()=>proofread(input,'key',undefined,async()=>response({...result,content:''})));
await assert.rejects(()=>proofread(input,'key',undefined,async()=>response({...result,changes:'bad'})));
await assert.rejects(()=>proofread(input,'key',undefined,async()=>{throw new Error('secret error')}),e=>!e.message.includes('secret'));
console.log('Proofreading validation, privacy, API responses and failure cases passed.');
