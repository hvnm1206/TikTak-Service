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
  assert.ok(!off.includes('ngoAudioSession'));
 }
});
