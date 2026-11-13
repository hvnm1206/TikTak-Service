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

test('audio speech is chunked rather than truncating long answers',async()=>{
  const r=await worker.fetch(new Request(host+'/'));
  const page=await r.text();
  const script=page.match(/<script>([\s\S]*?)<\/script>/)[1];
  const fnSrc=script.match(/function speechParts\(text\)\{[\s\S]*?return out\}/)?.[0];
  assert.ok(fnSrc,'speechParts exists');
  const speechParts=new Function(fnSrc+';return speechParts')();
  const input=('Đây là một câu nói tiếng Việt dài với thông tin cần đọc đầy đủ. ').repeat(25);
  const chunks=speechParts(input);
  assert.ok(chunks.length>=3);
  assert.ok(chunks.every(c=>c.length>0&&c.length<=440));
  assert.ok(chunks.join(' ').length>=input.trim().length-5);
});

test('Marin TTS reports upstream errors instead of hiding them behind Safari fallback',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({error:{message:'Voice model unavailable'}},{status:400});
 try{
  const r=await worker.fetch(request('/api/tts',{apiKey:key,text:'Xin chào',style:'danh_da'}));
  assert.equal(r.status,400);
  const data=await r.json();
  assert.equal(data.code,'TTS_INVALID_REQUEST');
  assert.match(data.detail,/Voice model unavailable/);
 }finally{globalThis.fetch=previous}
});
test('Marin route refuses non-audio content and preserves source header on valid MP3',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response('unexpected text',{status:200,headers:{'content-type':'text/html'}});
 try{
  const r=await worker.fetch(request('/api/tts',{apiKey:key,text:'Xin chào'}));
  assert.equal((await r.json()).code,'TTS_NON_AUDIO_RESPONSE');
 }finally{globalThis.fetch=previous}
 await withMock(async()=>{
   const r=await worker.fetch(request('/api/tts',{apiKey:key,text:'Xin chào'}));
   assert.equal(r.headers.get('x-nmh-tts-source'),'openai-marin');
 });
});
test('iPhone browser unlocks Web Audio from START and RESUME gestures; AI failure is explicit',async()=>{
 const r=await worker.fetch(new Request(host+'/'));
 const html=await r.text();
 assert.match(html,/id="testVoice"/);
 assert.match(html,/id="ttsDiagnostic"/);
 assert.match(html,/id="voiceStatus"/);
 assert.match(html,/\$\("start"\)\.onclick=\(\)=>\{try\{audioUnlock\(\)/);
 assert.match(html,/\$\("resume"\)\.onclick=\(\)=>\{if\(active\)\{try\{audioUnlock\(\)/);
 assert.match(html,/AUDIO_CONTEXT_SUSPENDED/);
 assert.match(html,/AUDIO_DECODE_FAILED/);
 assert.doesNotMatch(html,/function speakFallback/);
 assert.doesNotMatch(html,/Giọng dự phòng Safari/);
});

test('V2.1 health identifies new iPhone AudioContext engine',async()=>{
 const r=await worker.fetch(new Request(host+'/health'));
 assert.equal(r.status,200);
 assert.equal((await r.json()).version,'v2-tts-audioctx');
});

test('maintenance handover uses canonical source and cost ledger is estimate-only',async()=>{
  const page=await (await worker.fetch(new Request(host+'/'))).text();
  assert.match(page,/id="usageSummary"/);
  assert.match(page,/không phải hóa đơn/);
  assert.match(page,/recordCost/);
  assert.doesNotMatch(page,/sẽ dùng giọng Safari dự phòng/);
  const previous=globalThis.fetch;
  let fetched='';
  globalThis.fetch=async(url)=>{fetched=String(url);return new Response('canonical doc',{status:200})};
  try{
    const r=await worker.fetch(new Request(host+'/api/docs/handover'));
    assert.equal(r.status,200);
    assert.match(fetched,/voice-deploy\/START_HERE_NEXT_CHAT\.md$/);
  }finally{globalThis.fetch=previous}
});
