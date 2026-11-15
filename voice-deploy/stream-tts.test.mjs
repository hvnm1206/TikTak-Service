import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.js';
import {loudVoiceProcess} from './volume-ui.js';

async function harness({chunks,failHttp=false}){
 const html=await (await worker.fetch(new Request('https://voice.example/'),{NMH_FAST_VOICE:'active'},{})).text();
 const a=html.indexOf(' var ngoStreamSources=[];'),b=html.indexOf(' function ngoAudioSessionSafe(t)');
 assert.ok(a>0&&b>a);
 const end=html.indexOf('\n',b);
 const code=html.slice(a,end);
 const started=[];let now=0;
 class Src{constructor(){this.playbackRate={value:1}}connect(){}disconnect(){}start(at){this.at=at;started.push(this)}stop(){this.stopped=true}}
 const audioCtx={state:'running',get currentTime(){return now},resume:async()=>{},
  createAnalyser:()=>({connect(){}}),createBufferSource:()=>new Src(),
  createBuffer:(c,n,r)=>{const d=new Float32Array(n);return {numberOfChannels:1,length:n,sampleRate:r,duration:n/r,getChannelData:()=>d}}};
 const costs=[],requests=[];
 const ctx={audioCtx,key:'sk-x',voiceGain:1.55,loudVoiceProcess,recordCost:c=>costs.push(c),avatarFace:null,audioSource:null,
  nmhVoiceLatencyMark:()=>{},
  fetch:async(url,opt)=>{requests.push(JSON.parse(opt.body));if(failHttp)return {ok:false,status:500};
   let i=0;return {ok:true,body:{getReader:()=>({read:async()=>i<chunks.length?{value:chunks[i++],done:false}:{done:true},cancel:async()=>{}})}}},
  Error,Promise,Uint8Array,DataView,Math,Float32Array,Number,JSON};
 ctx.globalThis=ctx;
 vm.runInNewContext(code+';globalThis.run=ngoStreamSpeech;globalThis.stop=ngoStopStream;',ctx);
 return {ctx,started,costs,requests,setNow:t=>{now=t}};
}
function pcm(seconds,amp=8000){const n=Math.round(24000*seconds),b=new Uint8Array(n*2),v=new DataView(b.buffer);for(let i=0;i<n;i++)v.setInt16(i*2,Math.round(amp*Math.sin(i*.07)*Math.sin(i/2400)),true);return b}

test('first audio is scheduled after 0.35 s of PCM, not after the whole response',async()=>{
 const whole=pcm(3),parts=[whole.slice(0,17000),whole.slice(17000,60000),whole.slice(60000)];
 const h=await harness({chunks:parts});
 let done=false;
 const first=await h.ctx.run('Xin chào',"danh_da",new AbortController().signal,1.455,()=>{done=true},()=>true,null);
 assert.equal(first.stream,true);
 assert.equal(h.requests[0].format,'pcm');
 await new Promise(r=>setTimeout(r,10));
 assert.ok(h.started.length>=2,'blocks scheduled progressively');
 const firstLen=h.started[0].buffer.length;
 assert.ok(firstLen<=17000/2+1&&firstLen>=8400,'first block about 0.35 s: '+firstLen);
 for(let i=1;i<h.started.length;i++)assert.ok(h.started[i].at>=h.started[i-1].at+h.started[i-1].buffer.duration/1.455-1e-9,'blocks are back to back, no overlap');
 const total=h.started.reduce((s,x)=>s+x.buffer.length,0);
 assert.equal(total,24000*3,'every sample played once');
 assert.equal(h.costs.length,1);
 h.started.at(-1).onended?.();
 assert.ok(done||h.started.at(-1).onended===undefined);
});
test('HTTP failure rejects so the caller falls back to the old MP3 path',async()=>{
 const h=await harness({chunks:[],failHttp:true});
 await assert.rejects(h.ctx.run('x',"danh_da",new AbortController().signal,1,()=>{},()=>true,null),/TTS_STREAM_HTTP_500/);
});
test('interrupt stops every scheduled block',async()=>{
 const h=await harness({chunks:[pcm(1),pcm(1)]});
 await h.ctx.run('x',"danh_da",new AbortController().signal,1,()=>{},()=>true,null);
 await new Promise(r=>setTimeout(r,10));
 h.ctx.stop();
 assert.ok(h.started.length>=1&&h.started.every(s=>s.stopped));
});
test('later blocks reuse the gain measured on the first block (no level pumping)',()=>{
 const make=amp=>{const d=new Float32Array(24000);for(let i=0;i<d.length;i++)d[i]=amp*Math.sin(i*.07)*Math.sin(i/2400);return {numberOfChannels:1,length:d.length,sampleRate:24000,getChannelData:()=>d}};
 const r1=loudVoiceProcess(make(.2),1.55);assert.ok(r1.measured);
 const r2=loudVoiceProcess(make(.4),1.55,r1.gain);
 assert.equal(r2.gain,r1.gain);
});
test('TTS endpoint requests PCM from OpenAI only when asked, MP3 otherwise',async()=>{
 const seen=[];const orig=globalThis.fetch;
 globalThis.fetch=async(url,opt)=>{seen.push(JSON.parse(opt.body).response_format);return new Response(new Uint8Array(4),{headers:{'content-type':'audio/pcm'}})};
 try{
  for(const format of ['pcm',undefined]){
   const r=await worker.fetch(new Request('https://voice.example/api/tts',{method:'POST',headers:{origin:'https://voice.example','content-type':'application/json'},body:JSON.stringify({apiKey:'sk-'+'a'.repeat(40),text:'xin chào',format})}),{},{});
   assert.equal(r.status,200);
   assert.equal(r.headers.get('content-type'),format?'audio/L16;rate=24000;channels=1':'audio/mpeg');
  }
 }finally{globalThis.fetch=orig}
 assert.deepEqual(seen,['pcm','mp3']);
});
