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
  const document={getElementById:id=>dom[id]||null,createElement:()=>({style:{},appendChild(el){dom[el.id]=el},remove(){delete dom[this.id]}}),body:{appendChild:el=>{dom[el.id]=el}}};
  const navigator={geolocation:{watchPosition:(ok)=>{watch.push(1);if(geo)ok({coords:geo});return 7},clearWatch:()=>watch.push('clear')}};
  class SR{start(){}stop(){}abort(){}}
  const ctx={navigator,document,SR,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},Date,fetch:async(path,opt)=>{sent.push(JSON.parse(opt.body));return {ok:true,json:async()=>({answer:'x',mapsUrl:'https://www.google.com/maps/dir/?api=1&destination=M%E1%BB%B9%20%C4%90%C3%ACnh&travelmode=driving'})}},globalThis:null};
  ctx.globalThis=ctx;vm.runInNewContext(code+';globalThis.apiFn=apiCall;',ctx);return {ctx,sent,watch,dom};
 }
 const off=boot({},{latitude:21.0,longitude:105.8,accuracy:12});
 await off.ctx.apiFn('/api/chat','sk',{messages:[]});
 assert.equal(off.sent[0].route,undefined);assert.equal(off.watch.length,0,'no location access when off');
 assert.equal(off.dom.ngoMapsLink,undefined);
 const on=boot({ngo_routes_v1:'1'},{latitude:21.03,longitude:105.78,accuracy:12});
 await on.ctx.apiFn('/api/chat','sk',{messages:[]});
 assert.deepEqual(JSON.parse(JSON.stringify(on.sent[0].route)),{enabled:true,origin:{lat:21.03,lng:105.78,acc:12}});
 assert.match(on.dom.ngoMapsLink.href,/^https:\/\/www\.google\.com\/maps\/dir\//);
 on.ctx.ngoShowMapsLink('javascript:alert(1)');assert.equal(on.dom.ngoMapsLink,undefined,'non-Google links refused');
 on.ctx.ngoShowRouteError('TomTom từ chối khóa');assert.match(on.dom.ngoRouteErr.textContent,/Tra đường: TomTom từ chối khóa/);
 on.ctx.ngoShowRouteError(null);assert.equal(on.dom.ngoRouteErr,undefined);
 on.ctx.ngoShowRouteCompare('So sánh: TomTom 22 phút · Vietmap 25 phút\nTomTom qua Láng | Vietmap qua Bưởi');assert.equal(on.dom.ngoRouteCmp.textContent,'So sánh: TomTom 22 phút · Vietmap 25 phút','short line only');on.dom.ngoRouteCmp.onclick();assert.match(on.dom.ngoRouteCmp.textContent,/Vietmap qua Bưởi/,'tap shows detail');on.ctx.ngoShowRouteCompare(null);assert.equal(on.dom.ngoRouteCmp,undefined);
 off.ctx.ngoShowRouteCompare('x');assert.equal(off.dom.ngoRouteCmp,undefined);
 off.ctx.ngoShowRouteError('x');assert.equal(off.dom.ngoRouteErr,undefined,'no route banner when switch off');
});
test('route switch ON without a fix: waits for one precise GPS fix (max 8 s) before sending; denied shows how to enable',async()=>{
  const html=enhanceVoiceBoost(MINI);const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store={"ngo_routes_v1":"1"};');
  const sent=[],dom={};let asked=0;
  const document={getElementById:id=>dom[id]||(dom[id]={textContent:"",style:{}}),createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}};
  const navigator={geolocation:{watchPosition:()=>7,clearWatch(){},getCurrentPosition:(ok)=>{asked++;setTimeout(()=>ok({coords:{latitude:21.06,longitude:105.82,accuracy:20}}),5)}}};
  class SR{start(){}stop(){}abort(){}}
  const ctx={navigator,document,SR,setTimeout,clearTimeout,setInterval:(f,ms)=>ms<1000?setInterval(f,ms):0,clearInterval,Date,fetch:async(p,o)=>{sent.push(JSON.parse(o.body));return {ok:true,json:async()=>({answer:'x'})}},globalThis:null};
  ctx.globalThis=ctx;vm.runInNewContext(code+';globalThis.apiFn=apiCall;',ctx);
  await ctx.apiFn('/api/chat','sk',{messages:[]});
  assert.equal(asked,1);
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0].route)),{enabled:true,origin:{lat:21.06,lng:105.82,acc:20}});
  navigator.geolocation.getCurrentPosition=(ok,fail)=>fail({code:1});
  const html2=enhanceVoiceBoost(MINI);const code2=html2.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store={"ngo_routes_v1":"1"};');
  const ctx2={...ctx,globalThis:null};ctx2.globalThis=ctx2;vm.runInNewContext(code2+';globalThis.apiFn=apiCall;',ctx2);
  await ctx2.apiFn('/api/chat','sk',{messages:[]});
  assert.equal(JSON.parse(JSON.stringify(sent[1].route)).origin,null);
  assert.match(dom.ngoGeoStatus.textContent,/Dịch vụ định vị/);
});

import {TRIP_LOGIC} from './voice-boost-ui.js';
function decideFn(){const c={};vm.runInNewContext(TRIP_LOGIC+';globalThis.d=ngoTripDecide;globalThis.dist=ngoDistM;',c);return c}
const R=(path,min,slow=[])=>({path,seconds_now:min*60,slow_points:slow});
test('trip monitor decision: silent when nothing changed; speaks on +5 min, on a closure, on a faster alternative; no repeats',()=>{
  const {d,dist}=decideFn();const T0=Date.UTC(2026,10,17,1,0);
  const trip={path:'Láng → Phạm Hùng',expectEnd:T0+20*60000,lastAlertAt:0,alerted:[]};
  // 4 min later, 16 min left on the same road -> on schedule
  let o=d(trip,{routes:[R('Láng → Phạm Hùng',16)]},T0+4*60000);assert.equal(o.say,null);
  // jam: 22 min left -> 6 min later than baseline, street named, ETA given
  o=d(trip,{routes:[R('Láng → Phạm Hùng',22,[{street:'Phạm Hùng',kind:'ùn tắc',delay_minutes:6}])]},T0+4*60000);
  assert.match(o.say,/chậm thêm khoảng 6 phút, tắc ở Phạm Hùng\. Dự kiến tới lúc 08:26/);
  // same state again right after -> silent (baseline moved, quiet period)
  assert.equal(d(o.trip,{routes:[R('Láng → Phạm Hùng',21)]},T0+8*60000).say,null);
  // closure always reported once
  const c=d(trip,{routes:[R('Láng → Phạm Hùng',16,[{street:'Láng',kind:'đóng đường',delay_minutes:3}])]},T0+4*60000);
  assert.match(c.say,/Phía trước có đóng đường ở Láng/);assert.equal(d(c.trip,{routes:[R('Láng → Phạm Hùng',16,[{street:'Láng',kind:'đóng đường',delay_minutes:3}])]},T0+5*60000).say,null);
  // faster alternative (TomTom best first) while user is on the old road
  const a=d(trip,{routes:[R('Trần Duy Hưng → Khuất Duy Tiến',12),R('Láng → Phạm Hùng',17)]},T0+4*60000);
  assert.match(a.say,/Có đường nhanh hơn khoảng 5 phút, đi qua Trần Duy Hưng → Khuất Duy Tiến\. Bấm nút Google Maps/);assert.equal(a.trip.altUrl,true);
  // under 4 min gain -> silent
  assert.equal(d(trip,{routes:[R('Trần Duy Hưng',14),R('Láng → Phạm Hùng',16)]},T0+4*60000).say,null);
  // empty/invalid check -> silent, trip untouched
  assert.equal(d(trip,{},T0).say,null);
  assert.ok(Math.abs(dist({lat:21.0285,lng:105.8542},{lat:21.0285,lng:105.8642})-1037)<15,'haversine ~1 km');
});
test('trip monitor on page: starts from a route answer, checks TomTom every 4 min (no GPT), speaks only while listening, chip stops it, switch off stops it',async()=>{
  const html=enhanceVoiceBoost(MINI);let T=Date.UTC(2026,10,17,1,0);
  class D extends Date{constructor(...a){super(...(a.length?a:[T]))}static now(){return T}}
  const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store={"ngo_routes_v1":"1"};let step="listening",history=[],key="sk-test";const render=()=>{};function speak(t,g){globalThis.spoken.push(t)}');
  const dom={},ticks=[],calls=[];
  const document={hidden:false,getElementById:id=>dom[id]||null,createElement:()=>({style:{},appendChild(el){dom[el.id]=el},remove(){delete dom[this.id]}}),body:{appendChild:el=>{dom[el.id]=el}}};
  const navigator={geolocation:{watchPosition:ok=>{ok({coords:{latitude:21.03,longitude:105.78,accuracy:15}});return 1},clearWatch(){},getCurrentPosition(ok){ok({coords:{latitude:21.03,longitude:105.78,accuracy:15}})}}};
  let reply={routes:[R('Láng → Phạm Hùng',16)]};
  const ctx={navigator,document,Date:D,Math,JSON,Number,String,Array,setTimeout:()=>0,clearTimeout(){},setInterval:(f,ms)=>{if(ms===20000)ticks.push(f);return 0},clearInterval(){},spoken:[],
    fetch:async(p,o)=>{calls.push([p,JSON.parse(o.body)]);if(p==='/api/route-check')return {ok:true,status:200,json:async()=>reply};return {ok:true,json:async()=>({answer:'x',trip:{to:{lat:21.05,lng:105.82,name:'Hồ Tây'},seconds:20*60,path:'Láng → Phạm Hùng'}})}}};
  ctx.globalThis=ctx;vm.runInNewContext(code+';globalThis.apiFn=apiCall;globalThis.peek=()=>({step,history,gen});globalThis.setStep=s=>{step=s};',ctx);
  await ctx.apiFn('/api/chat','sk',{messages:[]});
  assert.match(dom.ngoTripChip.textContent,/🚗 Hồ Tây ✕/);assert.ok(dom.ngoDock,'route widgets live in the bottom dock');
  const tick=ticks[0];await tick();assert.equal(calls.filter(c=>c[0]==='/api/route-check').length,0,'nothing before 4 min');
  T+=4*60000;await tick();const rc=calls.filter(c=>c[0]==='/api/route-check');
  assert.equal(rc.length,1);assert.deepEqual(rc[0][1].to,{lat:21.05,lng:105.82,name:'Hồ Tây'});assert.equal(rc[0][1].apiKey,'sk-test');assert.equal(ctx.spoken.length,0,'on schedule -> silent');
  // jam while Ngố is busy answering: queued, spoken once it is listening again
  reply={routes:[R('Láng → Phạm Hùng',22,[{street:'Phạm Hùng',kind:'ùn tắc',delay_minutes:6}])]};ctx.setStep('speaking');
  T+=4*60000;await tick();assert.equal(ctx.spoken.length,0);
  ctx.setStep('listening');T+=20000;await tick();assert.equal(ctx.spoken.length,1);assert.match(ctx.spoken[0],/chậm thêm khoảng/);
  assert.equal(ctx.peek().history.at(-1).content,ctx.spoken[0],'alert kept in conversation for follow-up questions');
  dom.ngoTripChip.onclick();assert.equal(dom.ngoTripChip,undefined);T+=5*60000;await tick();assert.equal(calls.filter(c=>c[0]==='/api/route-check').length,2,'stopped');
});

test('location quality (owner 17/11 "nhận vị trí linh tinh"): GPS on, fresh precise fix only; coarse fix (> 500 m) never sent',async()=>{
  const html=enhanceVoiceBoost(MINI);const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store={"ngo_routes_v1":"1"};');
  const sent=[],dom={},opts=[];let fix={latitude:21.2,longitude:105.9,accuracy:1800};
  const document={getElementById:id=>dom[id]||(dom[id]={textContent:"",style:{}}),createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}};
  const navigator={geolocation:{watchPosition:(ok,f,o)=>{opts.push(o);ok({coords:fix});return 7},clearWatch(){},getCurrentPosition:(ok,f,o)=>{opts.push(o);ok({coords:fix})}}};
  class SR{start(){}stop(){}abort(){}}
  const ctx={navigator,document,SR,setTimeout:(f,ms)=>ms>=8000?setTimeout(f,5):setTimeout(f,ms),clearTimeout,setInterval:(f,ms)=>ms<1000?setInterval(f,ms):0,clearInterval,Date,fetch:async(p,o)=>{sent.push(JSON.parse(o.body));return {ok:true,json:async()=>({answer:'x'})}},globalThis:null};
  ctx.globalThis=ctx;vm.runInNewContext(code+';globalThis.apiFn=apiCall;',ctx);
  assert.equal(opts[0].enableHighAccuracy,true);assert.ok(opts[0].maximumAge<=5000);
  await ctx.apiFn('/api/chat','sk',{messages:[]});
  assert.equal(JSON.parse(JSON.stringify(sent[0].route)).origin,null,'1.8 km uncertainty -> ask the user instead of guessing');
  assert.match(dom.ngoGeoStatus.textContent,/±1800 m.*chưa đủ chính xác/);
  fix={latitude:21.03,longitude:105.78,accuracy:25};
  await ctx.apiFn('/api/chat','sk',{messages:[]});
  assert.deepEqual(JSON.parse(JSON.stringify(sent[1].route.origin)),{lat:21.03,lng:105.78,acc:25});
  assert.equal(opts.at(-1).maximumAge,0,'route question asks for a brand-new GPS fix');
});

test('trip decision on the planned road (onReference): routes[0] is the driver\'s road even if slower; faster alternative suggested; off-route adopts the new road',()=>{
  const {d}=decideFn();const T0=Date.UTC(2026,10,17,1,0);
  const trip={path:'Láng → Bưởi',polyline:'abc',expectEnd:T0+30*60000,lastAlertAt:0,alerted:[]};
  const o=d(trip,{onReference:true,routes:[R('Phố Láng → Đường Bưởi',27),R('Kim Mã → Liễu Giai',20)]},T0+4*60000);
  assert.match(o.say,/Có đường nhanh hơn khoảng 7 phút, đi qua Kim Mã → Liễu Giai/);
  const off=d(trip,{offRoute:true,routes:[R('Kim Mã → Liễu Giai',20)]},T0+4*60000);
  assert.equal(off.trip.polyline,null);assert.equal(off.trip.path,'Kim Mã → Liễu Giai');
});
