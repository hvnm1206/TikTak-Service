import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
const KEY='sk-'+'a'.repeat(40);
function wav(samples){const data=new Uint8Array(samples*2).map((_,i)=>i%251);const h=new Uint8Array(44+data.length),v=new DataView(h.buffer);
 h.set([82,73,70,70],0);v.setUint32(4,36+data.length,true);h.set([87,65,86,69,102,109,116,32],8);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,24000,true);v.setUint32(28,48000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);h.set([100,97,116,97],36);v.setUint32(40,data.length,true);h.set(data,44);return {h,data}}
const b64=u=>Buffer.from(u).toString('base64');
async function tts(env,body,fake){
 const seen=[];const orig=globalThis.fetch;
 globalThis.fetch=async(url,opt)=>{seen.push({url:String(url),body:JSON.parse(opt.body)});return fake(String(url))};
 try{const r=await worker.fetch(new Request('https://voice.example/api/tts',{method:'POST',headers:{origin:'https://voice.example','content-type':'application/json'},body:JSON.stringify({apiKey:KEY,...body})}),env,{});return {r,seen,bytes:new Uint8Array(await r.arrayBuffer())}}
 finally{globalThis.fetch=orig}
}
test('Google Leda is used when the key exists; PCM has the WAV header stripped; kid speed kept',async()=>{
 const {h,data}=wav(2400);
 const {r,seen,bytes}=await tts({GOOGLE_TTS_KEY:'g'},{text:'Xin chào',style:'danh_da',format:'pcm'},()=>new Response(JSON.stringify({audioContent:b64(h)}),{headers:{'content-type':'application/json'}}));
 assert.equal(r.status,200);
 assert.equal(r.headers.get('x-nmh-tts-source'),'google-chirp3-leda');
 assert.equal(r.headers.get('content-type'),'audio/L16;rate=24000;channels=1');
 assert.deepEqual([...bytes],[...data]);
 assert.equal(seen.length,1);
 assert.match(seen[0].url,/texttospeech\.googleapis\.com/);
 assert.equal(seen[0].body.voice.name,'vi-VN-Chirp3-HD-Leda');
 assert.equal(seen[0].body.audioConfig.speakingRate,0.756);
 assert.equal(seen[0].body.audioConfig.audioEncoding,'LINEAR16');
});
test('Google MP3 path for the non-stream player; serious style at normal speed',async()=>{
 const mp3=new Uint8Array(400).fill(7);
 const {r,seen,bytes}=await tts({GOOGLE_TTS_KEY:'g'},{text:'Xin chào',style:'nghiem_tuc'},()=>new Response(JSON.stringify({audioContent:b64(mp3)})));
 assert.equal(r.headers.get('content-type'),'audio/mpeg');
 assert.equal(bytes.length,400);
 assert.equal(seen[0].body.audioConfig.audioEncoding,'MP3');
 assert.equal(seen[0].body.audioConfig.speakingRate,1);
});
test('Google failure falls back to OpenAI Marin; no Google key or kill switch uses Marin directly',async()=>{
 const marin=()=>new Response(new Uint8Array(300),{headers:{'content-type':'audio/mpeg'}});
 const a=await tts({GOOGLE_TTS_KEY:'g'},{text:'x'},u=>u.includes('google')?new Response('quota',{status:429}):marin());
 assert.equal(a.r.status,200);assert.equal(a.r.headers.get('x-nmh-tts-source'),'openai-marin');assert.equal(a.seen.length,2);
 const b=await tts({},{text:'x'},marin);assert.equal(b.seen.length,1);assert.match(b.seen[0].url,/openai/);
 const c=await tts({GOOGLE_TTS_KEY:'g',NGO_GOOGLE_TTS:'off'},{text:'x'},marin);assert.equal(c.seen.length,1);assert.match(c.seen[0].url,/openai/);
});
test('page does not charge per-second TTS cost when audio came from Google',async()=>{
 const html=await (await worker.fetch(new Request('https://voice.example/'),{NMH_FAST_VOICE:'active'},{})).text();
 assert.ok(html.includes('globalThis.ngoTtsSource=r.headers.get("x-nmh-tts-source")'));
 assert.ok(html.includes('startsWith("google")&&delta&&delta.ttsSeconds'));
});
test('TTS endpoint strips leftover markdown symbols before synthesis',async()=>{
 const {seen}=await tts({GOOGLE_TTS_KEY:'g'},{text:'**Phở** *ngon* # 5*3'},()=>new Response(JSON.stringify({audioContent:b64(new Uint8Array(400))})));
 assert.equal(seen[0].body.input.text,'Phở ngon 5 nhân 3');
});

test('long route sentence: arrows -> commas and split into short sentences for Google; fallback reason exposed',async()=>{
 const long='Đi qua '+Array.from({length:12},(_,i)=>'Phố Số '+(i+1)).join(' → ')+' rồi tới nơi';
 const {r,seen}=await tts({GOOGLE_TTS_KEY:'g'},{apiKey:KEY,text:long,style:'danh_da'},u=>u.includes('googleapis')?Response.json({audioContent:b64(new Uint8Array(400))}):Response.json({}));
 assert.equal(r.headers.get('x-nmh-tts-source'),'google-chirp3-leda');
 const sent=seen[0].body.input.text;assert.ok(!sent.includes('→'));
 for(const sn of sent.split(/(?<=[.!?…])\s+/))assert.ok(sn.length<=160,'sentence too long for Google: '+sn.length);
 const fb=await tts({GOOGLE_TTS_KEY:'g'},{apiKey:KEY,text:'Xin chào.',style:'danh_da'},u=>u.includes('googleapis')?Response.json({error:{message:'This request contains sentences that are too long.'}},{status:400}):new Response(new Uint8Array(300),{headers:{'content-type':'audio/mpeg'}}));
 assert.equal(fb.r.headers.get('x-nmh-tts-source'),'openai-marin');assert.match(fb.r.headers.get('x-nmh-tts-google-error'),/HTTP 400 This request contains sentences/);
});
test('18/11 CPU fix: wire b64 passes Google JSON through untouched (no server decode); old clients keep binary',async()=>{
 const {h}=wav(2400);const payload=JSON.stringify({audioContent:b64(h)});
 const orig=globalThis.fetch;globalThis.fetch=async()=>new Response(payload,{headers:{'content-type':'application/json'}});
 try{
  const r=await worker.fetch(new Request('https://voice.example/api/tts',{method:'POST',headers:{origin:'https://voice.example','content-type':'application/json'},body:JSON.stringify({apiKey:KEY,text:'Xin chào',format:'pcm',wire:'b64'})}),{GOOGLE_TTS_KEY:'g'},{});
  assert.equal(r.status,200);assert.equal(r.headers.get('x-nmh-tts-wire'),'google-b64');assert.equal(r.headers.get('x-nmh-tts-source'),'google-chirp3-leda');
  assert.equal(await r.text(),payload);
  const old=await worker.fetch(new Request('https://voice.example/api/tts',{method:'POST',headers:{origin:'https://voice.example','content-type':'application/json'},body:JSON.stringify({apiKey:KEY,text:'Xin chào',format:'pcm'})}),{GOOGLE_TTS_KEY:'g'},{});
  assert.equal(old.headers.get('content-type'),'audio/L16;rate=24000;channels=1');assert.equal(old.headers.get('x-nmh-tts-wire'),null);
 }finally{globalThis.fetch=orig}
});
