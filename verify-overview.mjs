import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=fs.readFileSync('lib/official-overview.ts','utf8').replace("import {normalizeCompanyName} from './company-match';",fs.readFileSync('lib/company-match.ts','utf8'));
fs.mkdirSync('.sites-runtime/test',{recursive:true});fs.writeFileSync('.sites-runtime/test/official.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const {officialOverview,verifiedCandidates,publicUrl}=await import('./.sites-runtime/test/official.mjs');
const company={title:'テスト株式会社',overview:'システム開発を行う企業です。',source:'https://company.co.jp/about/',location:'東京都',official:true};
const meta={urlMetadata:[{retrievedUrl:company.source,urlRetrievalStatus:'URL_RETRIEVAL_STATUS_SUCCESS'}]};
assert.equal(verifiedCandidates('株式会社テスト',{candidates:[company]},meta).length,1);
assert.equal(verifiedCandidates('別会社',{candidates:[company]},meta).length,0);
assert.equal(verifiedCandidates(company.title,{candidates:[company]},{}).length,0);
assert.equal(verifiedCandidates(company.title,{candidates:[{...company,official:false}]},meta).length,0);
for(const url of ['http://company.co.jp','https://127.0.0.1','https://localhost','https://ja.wikipedia.org/wiki/test','javascript:alert(1)'])assert.equal(publicUrl(url),null);
const answer=()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({candidates:[company]})}]},urlContextMetadata:meta}]});
let count=0;
const direct=await officialOverview(company.title,company.source,'test',undefined,async(url,options)=>{count++;assert.deepEqual(JSON.parse(options.body).tools,[{url_context:{}}]);return answer()});assert.equal(direct.candidates.length,1);assert.equal(count,1);
let step=0;const search=await officialOverview(company.title,'','test',undefined,async(url,options)=>{step++;if(step===1){assert.equal(url,'https://api.tavily.com/search');const body=JSON.parse(options.body);assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);assert.equal(options.headers.Authorization,'Bearer tavily-test');return Response.json({results:[{url:company.source}]})}if(step===2){assert.equal(url,'https://api.tavily.com/extract');return Response.json({results:[{url:company.source,raw_content:'テスト株式会社 システム開発 東京都'}]})}assert.deepEqual(JSON.parse(options.body).tools,[]);return answer()},'tavily-test');assert.equal(step,3);assert.equal(search.candidates.length,1);
await assert.rejects(()=>officialOverview(company.title,'','test',undefined,async()=>new Response('',{status:432}),'tavily-test'),e=>e.status===429);
await assert.rejects(()=>officialOverview(company.title,'','test',undefined,async()=>{throw new Error('must not call')}),e=>e.message.includes('Tavily'));
console.log('Official URL verification, Tavily basic search, URL bypass and quota errors passed.');

const {selectCompanyUrls}=await import('./.sites-runtime/test/official.mjs');
assert.deepEqual(selectCompanyUrls('テスト株式会社',[{url:'https://other.co.jp/',title:'その他'},{url:'https://company.co.jp/about/',title:'テスト株式会社'},{url:'https://company.co.jp/',title:'テスト株式会社'}]),['https://company.co.jp/about/','https://company.co.jp/','https://other.co.jp/']);

const {hasCompanyEvidence}=await import('./.sites-runtime/test/official.mjs');
assert.equal(hasCompanyEvidence('理想科学工業株式会社','ЊTv zȊwHƊЁ RISO KAGAKU CORPORATION'),false);
assert.equal(hasCompanyEvidence('理想科学工業株式会社','理想科学工業の製品を紹介します。'),true);
assert.equal(hasCompanyEvidence('理想科学工業株式会社','理想テクノロジーズ株式会社'),false);
