import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
const key='sk-'+ 'a'.repeat(40);
const host='https://voice.local.test';
const request=(path,data,origin=host)=>new Request(host+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)});
const msg=[{role:'user',content:'Chào'}];
const mockOpenAI=async(url)=>{
  if(String(url).includes('/models/'))return new Response('{}',{status:200});
  if(String(url).includes('/audio/speech'))return new Response(new Uint8Array([73,68,51,0]),{status:200,headers:{'content-type':'audio/mpeg'}});
  if(String(url).includes('/responses'))return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Xin chào.'}]}],usage:{input_tokens:200,output_tokens:35}});
  throw new Error('unexpected upstream '+url);
};
const withMock=async(fn)=>{const old=globalThis.fetch;globalThis.fetch=mockOpenAI;try{await fn()}finally{globalThis.fetch=old}};
test('normal chat through Responses API succeeds',async()=>withMock(async()=>{
  const r=await worker.fetch(request('/api/chat',{apiKey:key,messages:msg,style:'chem_gio'}));
  assert.equal(r.status,200);
  assert.equal((await r.json()).model,'gpt-6-luna');
}));
test('key-test reports actual new model',async()=>withMock(async()=>{
  const r=await worker.fetch(request('/api/test',{apiKey:key}));
  assert.equal(r.status,200);
  assert.equal((await r.json()).model,'gpt-6-luna');
}));
test('Marin TTS endpoint returns protected MP3',async()=>withMock(async()=>{
  const r=await worker.fetch(request('/api/tts',{apiKey:key,text:'Xin chào',style:'danh_da'}));
  assert.equal(r.status,200);
  assert.match(r.headers.get('content-type'),/audio\/mpeg/);
}));
test('security gates reject invalid origin, key, empty messages and long TTS',async()=>withMock(async()=>{
  assert.equal((await worker.fetch(request('/api/chat',{apiKey:key,messages:msg},'https://evil.test'))).status,403);
  assert.equal((await worker.fetch(request('/api/chat',{apiKey:'bad',messages:msg}))).status,400);
  assert.equal((await worker.fetch(request('/api/chat',{apiKey:key,messages:[]}))).status,400);
  assert.equal((await worker.fetch(request('/api/tts',{apiKey:key,text:'x'.repeat(501)}))).status,400);
}));
test('UI preserves voice controls, supports 3 styles, no manual search',async()=>{
  const r=await worker.fetch(new Request(host+'/'));
  const page=await r.text();
  for(const id of ['start','stop','resume','styleDanh','styleChem','styleNghiem','setupbtn','maintbtn'])assert.match(page,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(page,/id="webNext"/);
  const script=page.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function(script);
});
