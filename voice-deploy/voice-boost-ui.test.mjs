import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.js';
import {enhanceVoiceBoost,ENDPOINT_MS} from './voice-boost-ui.js';

// Mini page reproducing the exact production anchors (same statements as the real listen/playAudioBuffer).
const MINI='<h3 style="margin:0 0 12px">TÙY CHỈNH GIỌNG NÓI</h3><script>'+
 'const store={};const load=(n,d)=>n in store?store[n]:d;const persist=(n,v)=>{store[n]=v;return true};'+
 'const els={};const $=id=>els[id]||(els[id]={checked:false,textContent:""});'+
 'let rec=null,heard="",active=true,gen=0,captionsOn=false,asked=[],audioCtx=null;'+
 'function closeRec(){if(rec){const r=rec;rec=null;r.onresult=r.onerror=r.onend=null;try{r.abort()}catch{}}}'+
 ' const labels={idle:1};'+
 'function listen(){closeRec();heard="";const g=gen;let r;r=new SR();rec=r;r.onresult=e=>{heard=e.text;if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110)};r.onend=()=>{if(rec!==r)return;rec=null;asked.push(heard)};r.start()}'+
 'async function apiCall(path,k,body){const c={};let controller=null;try{const r=await fetch(path,{method:"POST",body:JSON.stringify({...body,apiKey:k})});const d=await r.json();'+
 'if(!r.ok)throw Error(d.error||"HTTP "+r.status);return d}finally{if(controller===c)controller=null}}'+
 'function setVoiceSource(){}function speakDone(){setVoiceSource("OpenAI Marin — đã phát hoàn tất");listen();return}'+
 'async function playAudioBuffer(b){if(!audioCtx)throw Error("AUDIO_NOT_UNLOCKED");return 1}'+
 '$("gain").oninput=()=>{};'+
 'globalThis.api={listen,playAudioBuffer,asked:()=>asked,rec:()=>rec,$};'+
 '</script>';

function run(storage={}){
 const html=enhanceVoiceBoost(MINI);
 const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store='+JSON.stringify(storage)+';');
 const timers=[];
 const session={type:'auto',history:[]};
 const navigator={audioSession:{get type(){return session.type},set type(v){session.type=v;session.history.push(v)}}};
 class SR{constructor(){this.stopped=false}start(){}stop(){this.stopped=true;this.onend?.()}abort(){}}
 const context={navigator,SR,setTimeout:(fn,ms)=>{const t={fn,ms,live:true};timers.push(t);return t},clearTimeout:t=>{if(t)t.live=false},globalThis:null};
 context.globalThis=context;
 vm.runInNewContext(code,context);
 const fire=()=>{const live=timers.filter(t=>t.live);timers.length=0;for(const t of live){t.live=false;t.fn()}};
 return {api:context.api,session,timers,fire,html};
}

test('fast endpoint stops recognition after silence, only for the live recognizer',()=>{
 const {api,timers,fire}=run();
 api.listen();
 const r=api.rec();
 r.onresult({text:'thời tiết'});
 r.onresult({text:'thời tiết hà nội'});
 assert.equal(timers.filter(t=>t.live).length,1,'timer restarts on every new result');
 assert.equal(timers.find(t=>t.live).ms,ENDPOINT_MS);
 fire();
 assert.equal(r.stopped,true);
 assert.deepEqual([...api.asked()],['thời tiết hà nội']);
});
test('stale timer from an old recognizer cannot stop the new one',()=>{
 const {api,timers}=run();
 api.listen();const old=api.rec();old.onresult({text:'a'});
 const stale=timers.find(t=>t.live);
 api.listen();const fresh=api.rec();
 stale.fn();
 assert.equal(fresh.stopped,false);
});
test('fast endpoint switch off keeps Safari default endpointing',()=>{
 const {api,timers}=run({ngo_fast_endpoint_v1:'0'});
 api.listen();api.rec().onresult({text:'xin chào'});
 assert.equal(timers.filter(t=>t.live).length,0);
});
test('audio session: playback while speaking, auto before mic; switch off forces auto',async()=>{
 const on=run();
 on.api.listen();
 await on.api.playAudioBuffer(new ArrayBuffer(1)).catch(()=>{});
 on.api.listen();
 assert.deepEqual([...on.session.history],['playback','auto']);
 const off=run({ngo_loud_speaker_v1:'0'});
 await off.api.playAudioBuffer(new ArrayBuffer(1)).catch(()=>{});
 assert.equal(off.session.type,'auto');
 assert.deepEqual([...off.session.history],[]);
});
test('pages without navigator.audioSession are unaffected',async()=>{
 const html=enhanceVoiceBoost(MINI);
 const code=html.match(/<script>([\s\S]*)<\/script>/)[1];
 class SR{start(){}stop(){}abort(){}}
 const context={navigator:{},SR,setTimeout,clearTimeout};context.globalThis=context;
 vm.runInNewContext(code,context);
 await assert.rejects(context.api.playAudioBuffer(),/AUDIO_NOT_UNLOCKED/);
});
test('real Worker page (basic and fast voice) carries both switches, compiles, and has kill switch',async()=>{
 for(const env of [{},{NMH_FAST_VOICE:'active'}]){
  const html=await (await worker.fetch(new Request('https://voice.example/'),env,{})).text();
  for(const marker of ['ngoAudioSession("playback")','ngoAudioSession("auto")','ngoEndTimer','id="ngoLoudSpeaker"','id="ngoFastEndpoint"'])assert.ok(html.includes(marker),marker);
  for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
  const off=await (await worker.fetch(new Request('https://voice.example/'),{...env,NMH_VOICE_BOOST:'off'},{})).text();
  assert.ok(!off.includes('let ngoLoudSpeaker')&&!off.includes('ngoEndTimer'));
 }
});
test('microphone reopens only after output latency + margin, and not if the turn changed',async()=>{
 const html=enhanceVoiceBoost(MINI.replace(',audioCtx=null',',audioCtx={outputLatency:.1,baseLatency:.02}'));
 const code=html.match(/<script>([\s\S]*)<\/script>/)[1];
 const timers=[];class SR{start(){}stop(){}abort(){}}
 const ctx={navigator:{},SR,setTimeout:(fn,ms)=>{timers.push({fn,ms})},clearTimeout(){},globalThis:null};ctx.globalThis=ctx;
 vm.runInNewContext(code+';globalThis.speakDone=speakDone;globalThis.bump=()=>{gen++};',ctx);
 ctx.speakDone();
 assert.equal(ctx.api.rec(),null,'mic not opened immediately');
 assert.equal(timers.length,1);assert.equal(timers[0].ms,420);
 timers[0].fn();assert.ok(ctx.api.rec(),'mic opens after the delay');
 ctx.api.rec().onend?.();
 ctx.speakDone();ctx.bump();timers.at(-1).fn();
 assert.equal(ctx.api.rec(),null,'stale delayed listen ignored after the turn changed');
});
test('route switch: OFF by default sends nothing and reads no location; ON sends location and shows only Google Maps links',async()=>{
 function boot(storage,geo){
  const html=enhanceVoiceBoost(MINI);const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store='+JSON.stringify(storage)+';');
  const sent=[],watch=[],dom={};
  const document={getElementById:id=>dom[id]||null,createElement:()=>({style:{},remove(){delete dom.ngoMapsLink}}),body:{appendChild:el=>{dom.ngoMapsLink=el}}};
  const navigator={geolocation:{watchPosition:(ok)=>{watch.push(1);if(geo)ok({coords:geo});return 7},clearWatch:()=>watch.push('clear')}};
  class SR{start(){}stop(){}abort(){}}
  const ctx={navigator,document,SR,setTimeout:()=>0,clearTimeout:()=>{},Date,fetch:async(path,opt)=>{sent.push(JSON.parse(opt.body));return {ok:true,json:async()=>({answer:'x',mapsUrl:'https://www.google.com/maps/dir/?api=1&destination=M%E1%BB%B9%20%C4%90%C3%ACnh&travelmode=driving'})}},globalThis:null};
  ctx.globalThis=ctx;vm.runInNewContext(code+';globalThis.apiFn=apiCall;',ctx);return {ctx,sent,watch,dom};
 }
 const off=boot({},{latitude:21.0,longitude:105.8});
 await off.ctx.apiFn('/api/chat','sk',{messages:[]});
 assert.equal(off.sent[0].route,undefined);assert.equal(off.watch.length,0,'no location access when off');
 assert.equal(off.dom.ngoMapsLink,undefined);
 const on=boot({ngo_routes_v1:'1'},{latitude:21.03,longitude:105.78});
 await on.ctx.apiFn('/api/chat','sk',{messages:[]});
 assert.deepEqual(JSON.parse(JSON.stringify(on.sent[0].route)),{enabled:true,origin:{lat:21.03,lng:105.78}});
 assert.match(on.dom.ngoMapsLink.href,/^https:\/\/www\.google\.com\/maps\/dir\//);
 on.ctx.ngoShowMapsLink('javascript:alert(1)');assert.equal(on.dom.ngoMapsLink,undefined,'non-Google links refused');
});
test('route switch ON without a fix: waits for one getCurrentPosition (max 6 s) before sending; denied shows how to enable',async()=>{
  const html=enhanceVoiceBoost(MINI);const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store={"ngo_routes_v1":"1"};');
  const sent=[],dom={};let asked=0;
  const document={getElementById:id=>dom[id]||(dom[id]={textContent:"",style:{}}),createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}};
  const navigator={geolocation:{watchPosition:()=>7,clearWatch(){},getCurrentPosition:(ok)=>{asked++;setTimeout(()=>ok({coords:{latitude:21.06,longitude:105.82}}),5)}}};
  class SR{start(){}stop(){}abort(){}}
  const ctx={navigator,document,SR,setTimeout,clearTimeout,Date,fetch:async(p,o)=>{sent.push(JSON.parse(o.body));return {ok:true,json:async()=>({answer:'x'})}},globalThis:null};
  ctx.globalThis=ctx;vm.runInNewContext(code+';globalThis.apiFn=apiCall;',ctx);
  await ctx.apiFn('/api/chat','sk',{messages:[]});
  assert.equal(asked,1);
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0].route)),{enabled:true,origin:{lat:21.06,lng:105.82}});
  navigator.geolocation.getCurrentPosition=(ok,fail)=>fail({code:1});
  const html2=enhanceVoiceBoost(MINI);const code2=html2.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store={"ngo_routes_v1":"1"};');
  const ctx2={...ctx,globalThis:null};ctx2.globalThis=ctx2;vm.runInNewContext(code2+';globalThis.apiFn=apiCall;',ctx2);
  await ctx2.apiFn('/api/chat','sk',{messages:[]});
  assert.equal(JSON.parse(JSON.stringify(sent[1].route)).origin,null);
  assert.match(dom.ngoGeoStatus.textContent,/Dịch vụ định vị/);
});
