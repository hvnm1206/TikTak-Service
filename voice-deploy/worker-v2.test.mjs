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
 const body=await r.json();assert.equal(body.version,'v2-tts-audioctx');assert.equal(body.uiVersion,'presence-canvas-v1');
});

test('maintenance handover uses canonical source and cost ledger is estimate-only',async()=>{
  const page=await (await worker.fetch(new Request(host+'/'))).text();
  assert.match(page,/id="usageSummary"/);
  assert.match(page,/không phải hóa đơn/);
  assert.match(page,/recordCost/);
  assert.doesNotMatch(page,/sẽ dùng giọng Safari dự phòng/);
  const previous=globalThis.fetch;
  let fetched='';
  globalThis.fetch=async(url)=>{fetched=String(url);return Response.json({encoding:'base64',content:Buffer.from('canonical doc','utf8').toString('base64')})};
  try{
    const r=await worker.fetch(new Request(host+'/api/docs/handover'));
    assert.equal(r.status,200);
    assert.match(fetched,/contents\/voice-deploy\/START_HERE_NEXT_CHAT\.md\?ref=nmh-voice-gpt-v1&v=\d+$/);
  }finally{globalThis.fetch=previous}
});

test('NMH Presence makes expressive Canvas primary, transcript optional and keeps all production controls',async()=>{
 const page=await (await worker.fetch(new Request(host+'/'))).text();
 for(const id of ['avatar','stateHint','journalBtn','closeJournal','subsBtn','transcriptPanel','history','status','start','stop','interrupt','resume','styleDanh','styleChem','styleNghiem','setupbtn','maintbtn','usageSummary','testVoice','key','clear']){
  assert.match(page,new RegExp('id="'+id+'"'),id+' present');
 }
 assert.match(page,/class PresenceFace/);
 assert.match(page,/getByteTimeDomainData/);
 assert.match(page,/new PresenceFace/);
 assert.match(page,/captionRefresh/);
 assert.match(page,/avatarFace\?\.setState/);
 assert.match(page,/aria-expanded="false"/);
 assert.match(page,/PHỤ ĐỀ: TẮT/);
 assert.match(page,/function speechParts/);
 const s=page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(s,'inline UI script');
 new Function(s);
});
test('NMH Presence has no external JavaScript/CSS and no new upstream API calls',async()=>{
 const r=await worker.fetch(new Request(host+'/'));
 const page=await r.text();
 assert.doesNotMatch(page,/<script[^>]+src=/);
 assert.doesNotMatch(page,/<link[^>]+stylesheet/);
 assert.match(page,/Marin/);
 assert.match(r.headers.get('content-security-policy'),/connect-src 'self'/);
});

// NMH Presence release verification: live deploy remains separately gated by the workflow.

test('live maintenance documents use GitHub Contents API and decode Unicode reliably',async()=>{
 const original=globalThis.fetch;
 let path='';
 const md='# BẢO TRÌ — NMH PRESENCE\n## A. HIỆN TRẠNG ĐANG CHẠY\n“Tao thấy khá tốt đấy”\n';
 globalThis.fetch=async(url)=>{
   path=String(url);
   return Response.json({encoding:'base64',content:Buffer.from(md,'utf8').toString('base64').replace(/(.{32})/g,'$1\n')});
 };
 try{
   const response=await worker.fetch(new Request(host+'/api/docs/maintenance'));
   assert.equal(response.status,200);
   assert.equal(response.headers.get('x-nmh-doc-source'),'github-contents-api');
   assert.equal(await response.text(),md);
   assert.match(path,/api.github.com\/repos\/hvnm1206\/TikTak-Service\/contents\/MAINTENANCE\.md/);
 }finally{globalThis.fetch=original}
});
test('invalid Github docs API result fails visibly instead of presenting stale maintenance',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({encoding:'unknown',content:'stale'});
 try{
   const response=await worker.fetch(new Request(host+'/api/docs/maintenance'));
   assert.equal(response.status,502);
 }finally{globalThis.fetch=original}
});

test('maintenance source fallback serves only canonical fresh Raw content if Github API returns 403',async()=>{
 const orig=globalThis.fetch;
 let attempts=[];
 const md="# BẢO TRÌ\n## A. HIỆN TRẠNG ĐANG CHẠY\nTao thấy khá tốt đấy";
 globalThis.fetch=async(url)=>{
  attempts.push(String(url));
  if(String(url).startsWith('https://api.github.com'))return Response.json({message:'rate limit'},{status:403});
  if(String(url).startsWith('https://raw.githubusercontent.com'))return new Response(md,{status:200});
  throw Error('unexpected '+url);
 };
 try{
  const res=await worker.fetch(new Request(host+'/api/docs/maintenance'));
  assert.equal(res.status,200);
  assert.equal(res.headers.get('x-nmh-doc-source'),'github-raw-fallback');
  assert.equal(await res.text(),md);
  assert.equal(attempts.length,2);
 }finally{globalThis.fetch=orig}
});
test('maintenance refuses stale Raw fallback when GitHub API unavailable',async()=>{
 const orig=globalThis.fetch;
 globalThis.fetch=async(url)=>String(url).includes('api.github.com')?Response.json({}, {status:403}):new Response('old stale doc',{status:200});
 try{
  const res=await worker.fetch(new Request(host+'/api/docs/maintenance'));
  assert.equal(res.status,502);
  const body=await res.json();
  assert.match(body.error,/GitHub/);
 }finally{globalThis.fetch=orig}
});
