// Run from repository root: node --test voice-deploy/web-optin.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const split=source.indexOf(';\nconst h=');
assert.ok(split>0, 'Worker PAGE delimiter');
const html=JSON.parse(source.slice('const PAGE='.length,split));
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Browser script found');

const makeApp=(fetchMock)=>{
  const compiled=new Function('fetch','Response','URL','AbortController',
    source.replace('export default {async fetch(request){','return {async fetch(request){'));
  return compiled(fetchMock,Response,URL,AbortController);
};
const key='sk-'+ 'a'.repeat(50);
const origin='https://voice.example';
const request=(data,requestedOrigin=origin)=>new Request(origin+'/api/chat',{
  method:'POST',headers:{'origin':requestedOrigin,'content-type':'application/json'},body:JSON.stringify(data)
});
const messages=[{role:'user',content:'Tin mới nhất hôm nay?'}];
const fakeOk=(data)=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
const openaiResponse=(message)=>({choices:[{message}]});

test('worker and embedded client scripts compile',()=>{
  new Function(script);
  makeApp(async()=>fakeOk({}));
  assert.match(html,/id="webNext"/);
  assert.match(html,/TRA MẠNG: TẮT/);
});
test('normal Voice route still uses existing chat model',async()=>{
  let sent;
  const app=makeApp(async(url,options)=>{sent=JSON.parse(options.body);return fakeOk(openaiResponse({content:'Xin chào'}));});
  const response=await app.fetch(request({apiKey:key,messages}));
  const data=await response.json();
  assert.equal(response.status,200);
  assert.equal(sent.model,'gpt-4o-mini');
  assert.equal(sent.web_search_options,undefined);
  assert.equal(data.answer,'Xin chào');
});
test('opt-in web lookup uses the same OpenAI key and returns citations',async()=>{
  let sent,headers;
  const app=makeApp(async(url,options)=>{
    sent=JSON.parse(options.body);headers=options.headers;
    return fakeOk(openaiResponse({content:'Giá mới [nguồn](https://example.org/a)',annotations:[
      {type:'url_citation',url_citation:{title:'Trang A',url:'https://example.org/a'}},
      {type:'url_citation',url_citation:{title:'Duplicate',url:'https://example.org/a'}},
      {type:'url_citation',url_citation:{title:'Insecure',url:'http://example.org/b'}}
    ]}));
  });
  const response=await app.fetch(request({apiKey:key,messages,webSearch:true}));
  const data=await response.json();
  assert.equal(response.status,200);
  assert.equal(sent.model,'gpt-5-search-api');
  assert.deepEqual(sent.web_search_options,{});
  assert.equal(headers.Authorization,'Bearer '+key);
  assert.equal(data.sources.length,1);
  assert.equal(data.sources[0].url,'https://example.org/a');
  assert.ok(!data.spokenAnswer.includes('https://'));
  assert.equal(data.webSearched,true);
});
test('missing citations fail rather than inventing verification',async()=>{
  const app=makeApp(async()=>fakeOk(openaiResponse({content:'Không có nguồn',annotations:[]})));
  const res=await app.fetch(request({apiKey:key,messages,webSearch:true}));
  assert.equal(res.status,502);
  assert.match((await res.json()).error,/nguồn trích dẫn/);
});
test('origin, API key and message validation retained',async()=>{
  let n=0;
  const app=makeApp(async()=>{n++;return fakeOk(openaiResponse({content:'ok'}));});
  assert.equal((await app.fetch(request({apiKey:key,messages},'https://invalid.example'))).status,403);
  assert.equal((await app.fetch(request({apiKey:'bad',messages}))).status,400);
  assert.equal((await app.fetch(request({apiKey:key,messages:[]}))).status,400);
  assert.equal(n,0);
});
test('web search upstream errors propagate and normal chat is not silently substituted',async()=>{
  const app=makeApp(async()=>new Response('',{status:429}));
  const response=await app.fetch(request({apiKey:key,messages,webSearch:true}));
  assert.equal(response.status,429);
});
test('HTML citation anchors are created via DOM text nodes, never innerHTML',()=>{
  assert.match(script,/document\.createElement\("a"\)/);
  assert.match(script,/a\.textContent=/);
  assert.doesNotMatch(script,/innerHTML/);
});
