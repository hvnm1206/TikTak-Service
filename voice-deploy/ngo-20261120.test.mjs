// 20/11/2026 owner batch: "nói trước quên sau, nói 1 đằng làm 1 nẻo, bịa đặt", reading the source note aloud, cut-off
// speech, cost ≤ 5 USD/month (Tavily search with freshness, OpenAI fallback ≤ 5/day, batch memory learning).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {runAgent,tavilySearch} from './agent-v2.js';
import {matchesCurrentUtterance} from './action-registry.js';
import {sessionUtterance} from './personal-memory.js';
import {enhanceVoiceBoost,ENDPOINT_MS,ENDPOINT_MAX_MS} from './voice-boost-ui.js';
import worker,{buildSearchContext} from './worker.js';

const key='sk-'+'a'.repeat(40);
const text=t=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:t}]}],usage:{input_tokens:10,output_tokens:5}})});
const call=(name,args,id='c1')=>({ok:true,json:async()=>({output:[{type:'function_call',name,call_id:id,arguments:JSON.stringify(args)}],usage:{}})});
const NOW=Date.parse('2026-11-20T10:00:00Z');
const tavilyJson=results=>new Response(JSON.stringify({results}),{status:200,headers:{'content-type':'application/json'}});

test('instructions: plain persona line, generic honesty rule, clock last with minute precision (stable prefix for caching)',async()=>{
  let req;
  await runAgent({apiKey:key,messages:[{role:'user',content:'chào'}],fetchImpl:async(u,o)=>{req=JSON.parse(o.body);return text('Chào anh.')}});
  const lines=req.instructions.split('\n');
  assert.match(lines[0],/^Bạn là trợ lý giọng nói NMH Voice/);
  assert.doesNotMatch(req.instructions,/Mày\/ bạn/);
  assert.match(req.instructions,/Chỉ nói đã làm, đã lưu, đã tra hay đã đọc một thứ khi TRONG LƯỢT NÀY có kết quả công cụ/);
  assert.match(lines.at(-1),/^Giờ Việt Nam hiện tại: .*\d{2}:\d{2}/);
  assert.doesNotMatch(lines.at(-1),/\d{2}:\d{2}:\d{2}/,'no seconds');
  assert.equal(req.max_output_tokens,800);
});

test('with Tavily configured: search_web function offered, hosted web_search NOT offered (no $0.01 per call)',async()=>{
  let req;
  await runAgent({apiKey:key,messages:[{role:'user',content:'giá vàng hôm nay'}],searchContext:{tavilyKey:'tvly-x'},fetchImpl:async(u,o)=>{req=JSON.parse(o.body);return text('Ừ.')}});
  assert.ok(req.tools.some(t=>t.name==='search_web'));
  assert.ok(!req.tools.some(t=>t.type==='web_search'));
  assert.equal(req.max_tool_calls,undefined);
  const tool=req.tools.find(t=>t.name==='search_web');
  assert.deepEqual(tool.parameters.properties.freshness.enum,['day','week','month','any']);
});

test('freshness: undated or out-of-window results never reach the model; dates are kept for the answer',async()=>{
  let sent;
  const f=async(u,o)=>{sent=JSON.parse(o.body);return tavilyJson([
    {title:'Giá vàng 20/11',url:'https://a.vn/1',content:'SJC 136,2 triệu',published_date:'Fri, 20 Nov 2026 07:00:00 GMT'},
    {title:'Facebook giá vàng',url:'https://facebook.com/x',content:'SJC 147 triệu'},
    {title:'Giá vàng tháng 3',url:'https://b.vn/2',content:'SJC 90 triệu',published_date:'Thu, 19 Mar 2026 07:00:00 GMT'}])};
  const r=await tavilySearch({query:'giá vàng SJC',freshness:'day'},{searchContext:{tavilyKey:'k'},fetchImpl:f,now:NOW});
  assert.equal(sent.topic,'news');assert.equal(sent.time_range,'day');
  assert.equal(r.ok,true);
  assert.deepEqual(r.data.results.map(x=>x.url),['https://a.vn/1']);
  assert.equal(r.data.dropped_stale_or_undated,2);
  assert.match(r.data.results[0].published,/20\/11\/2026/);
  assert.match(r.data.note,/không phải toàn văn/);
  const none=await tavilySearch({query:'giá vàng',freshness:'day'},{searchContext:{tavilyKey:'k'},fetchImpl:async()=>tavilyJson([{title:'cũ',url:'https://c.vn',content:'x',published_date:'Mon, 02 Nov 2026 00:00:00 GMT'}]),now:NOW});
  assert.equal(none.ok,false);assert.match(none.data.error,/các kết quả cũ hoặc không rõ ngày đã bị loại/);
  const any=await tavilySearch({query:'thủ tục đổi bằng lái',freshness:'any'},{searchContext:{tavilyKey:'k'},fetchImpl:async(u,o)=>{sent=JSON.parse(o.body);return tavilyJson([{title:'Thủ tục',url:'https://d.vn',content:'Nộp hồ sơ'}])},now:NOW});
  assert.equal(sent.topic,'general');assert.equal(sent.country,'vietnam');assert.equal(any.data.results.length,1,'timeless questions keep undated pages');
});

test('Tavily quota used up: OpenAI web_search offered once only while the daily cap allows, and the use is recorded',async()=>{
  for(const allowed of [true,false]){
    const bodies=[],recorded=[];
    const fetchImpl=async(u,o)=>{const b=JSON.parse(o.body);bodies.push(b);
      if(bodies.length===1)return call('search_web',{query:'tin mới',freshness:'week'});
      if(allowed&&bodies.length===2)return {ok:true,json:async()=>({output:[{type:'web_search_call',id:'w'},{type:'message',content:[{type:'output_text',text:'Theo tin hôm nay...'}]}],usage:{}})};
      return text('Hôm nay hết lượt tra web.')};
    const r=await runAgent({apiKey:key,messages:[{role:'user',content:'tin mới nhất'}],fetchImpl,
      toolFetchImpl:async()=>new Response('{}',{status:432}),
      searchContext:{tavilyKey:'k',fallbackAvailable:async()=>allowed,recordFallback:async n=>recorded.push(n)}});
    const second=bodies[1];
    assert.equal(second.tools.some(t=>t.type==='web_search'),allowed,'hosted search only within the cap');
    assert.ok(second.tools.some(t=>t.name==='search_web'),'22/11: still declared so the earlier function_call matches a declared tool');
    const out=JSON.parse(second.input.find(x=>x.type==='function_call_output').output);
    assert.equal(out.ok,false);
    if(allowed){assert.deepEqual(recorded,[1]);assert.equal(r.webSearchCalls,1)}
    else{assert.deepEqual(recorded,[]);assert.match(out.data.error,/hết lượt tìm web hôm nay/)}
  }
});

test('no Tavily key: previous behaviour (hosted web_search once per question)',async()=>{
  let req;
  await runAgent({apiKey:key,messages:[{role:'user',content:'x'}],fetchImpl:async(u,o)=>{req=JSON.parse(o.body);return text('Ừ.')}});
  assert.ok(req.tools.some(t=>t.type==='web_search'));assert.ok(!req.tools.some(t=>t.name==='search_web'));
  assert.equal(buildSearchContext({}),null);
  assert.equal(buildSearchContext({TAVILY_KEY:' "tvly-abc" '}).tavilyKey,'tvly-abc');
  assert.equal(buildSearchContext({TAVILY_KEY:'k',NGO_SEARCH:'openai'}),null);
});

test('daily fallback cap counts in D1 per Vietnam day and fails closed without D1',async()=>{
  const rows=new Map();
  const db={prepare:sql=>({bind:(...a)=>({first:async()=>/SELECT/.test(sql)?(rows.has(a[0])?{n:rows.get(a[0])}:null):null,run:async()=>{rows.set(a[0],(rows.get(a[0])||0)+a[1])}})})};
  const ctx=buildSearchContext({TAVILY_KEY:'k',NMH_DB:db});
  for(let i=0;i<5;i++){assert.equal(await ctx.fallbackAvailable(),true);await ctx.recordFallback(1)}
  assert.equal(await ctx.fallbackAvailable(),false,'5 per day');
  assert.equal(await buildSearchContext({TAVILY_KEY:'k'}).fallbackAvailable(),false);
  assert.equal(await buildSearchContext({TAVILY_KEY:'k',NMH_DB:db,NGO_WEB_FALLBACK_DAILY:'0'}).fallbackAvailable(),false);
});

test('utterance quote matching ignores punctuation/case but still refuses commands from earlier turns',()=>{
  const said='Ngố, ghi lại cho tao: mua bóng đèn ngày mai!';
  assert.equal(matchesCurrentUtterance({utterance_quote:'ngố ghi lại cho tao mua bóng đèn'},said),true);
  assert.equal(matchesCurrentUtterance({utterance_quote:'Ghi lại cho tao, mua bóng đèn ngày mai'},said),true);
  assert.equal(matchesCurrentUtterance({utterance_quote:'ghi nhớ tôi thích trà xanh'},said),false);
  assert.equal(matchesCurrentUtterance({utterance_quote:'mua'},said),false,'too short');
});

test('a refused action: the model gets the current utterance to retry, and an unverified answer is flagged on screen',async()=>{
  const bodies=[];
  const actionRuntime={tools:[{type:'function',name:'save_note',parameters:{type:'object',properties:{}}}],
    execute:async()=>({ok:false,status:'failed',errorCode:'TURN_MISMATCH',answer:'Chưa thực hiện: công cụ không khớp yêu cầu hiện tại.'})};
  const r=await runAgent({apiKey:key,messages:[{role:'user',content:'ghi cái link đấy vào ghi chú'}],actionRuntime,
    fetchImpl:async(u,o)=>{bodies.push(JSON.parse(o.body));return bodies.length===1?call('save_note',{body:'x',utterance_quote:'ghi link'}):text('Đã ghi rồi.')}});
  const out=JSON.parse(bodies[1].input.find(x=>x.type==='function_call_output').output);
  assert.equal(out.executed,false);assert.equal(out.current_utterance,'ghi cái link đấy vào ghi chú');
  assert.equal(r.actionNotExecuted,'TURN_MISMATCH','screen shows the action was NOT done');
});

test('session learning text: newest utterances first within 1,800 chars, credentials left out',()=>{
  const u=sessionUtterance([{role:'user',content:'Tôi tên Hải'},{role:'assistant',content:'Chào anh'},{role:'user',content:'số tài khoản của tôi là 123456789012'},{role:'user',content:'Từ nay trả lời ngắn'}]);
  assert.equal(u,'Tôi tên Hải\nTừ nay trả lời ngắn');
  const long=sessionUtterance(Array.from({length:30},(_,i)=>({role:'user',content:'câu số '+i+' '+'x'.repeat(100)})));
  assert.ok(long.length<=1800);assert.match(long,/câu số 29/);
});

test('/api/memory-session validates input and never learns without the personal-memory pilot',async()=>{
  const origin='https://nmh-voice-gpt-test.magical-budget.workers.dev';
  const post=(body,env={})=>worker.fetch(new Request(origin+'/api/memory-session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env,{waitUntil(){}});
  assert.equal((await post({apiKey:key,messages:[]})).status,400);
  assert.equal((await post({apiKey:key,messages:[{role:'assistant',content:'x'}]})).status,400);
  const off=await post({apiKey:key,messages:[{role:'user',content:'Tôi tên Hải'}]});
  assert.equal(off.status,200);assert.equal((await off.json()).learning,'off');
});

test('cut-off speech: default wait 1.8 s, owner-tunable and clamped, stored on the iPhone',()=>{
  assert.equal(ENDPOINT_MS,1800);
  const MINI='<h3 style="margin:0 0 12px">TÙY CHỈNH GIỌNG NÓI</h3><script>'+
   'const store={};const load=(n,d)=>n in store?store[n]:d;const persist=(n,v)=>{store[n]=v;return true};'+
   'const els={};const $=id=>els[id]||(els[id]={checked:false,textContent:"",value:""});'+
   'let rec=null,heard="",active=true,gen=0,captionsOn=false,asked=[],audioCtx=null;'+
   'function closeRec(){if(rec){const r=rec;rec=null;r.onresult=r.onerror=r.onend=null;try{r.abort()}catch{}}}'+
   ' const labels={idle:1};'+
   'function listen(){closeRec();heard="";const g=gen;let r;r=new SR();rec=r;r.onresult=e=>{heard=e.text;if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110)};r.onend=()=>{if(rec!==r)return;rec=null;asked.push(heard)};r.start()}'+
   'async function apiCall(path,k,body){const c={};let controller=null;try{const r=await fetch(path,{method:"POST",body:JSON.stringify({...body,apiKey:k})});const d=await r.json();'+
   'if(!r.ok)throw Error(d.error||"HTTP "+r.status);return d}finally{if(controller===c)controller=null}}'+
   'function setVoiceSource(){}function speakDone(){setVoiceSource("OpenAI Marin — đã phát hoàn tất");listen();return}'+
   'async function playAudioBuffer(b){if(!audioCtx)throw Error("AUDIO_NOT_UNLOCKED");return 1}'+
   '$("gain").oninput=()=>{};globalThis.api={listen,rec:()=>rec,$};</script>';
  const html=enhanceVoiceBoost(MINI);
  assert.match(html,/id="ngoEndpointMs" type="range" min="1000" max="3500"/);
  for(const [stored,expected] of [[undefined,1800],['2600',2600],['99999',ENDPOINT_MAX_MS],['abc',1800]]){
    const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace('const store={};','const store='+JSON.stringify(stored===undefined?{}:{ngo_endpoint_ms_v1:stored})+';');
    const timers=[];
    class SR{start(){}stop(){this.onend?.()}abort(){}}
    const c={navigator:{},SR,setTimeout:(fn,ms)=>{timers.push(ms);return {}},clearTimeout(){},globalThis:null};c.globalThis=c;
    vm.runInNewContext(code,c);
    c.api.listen();c.api.rec().onresult({text:'anh ơi cho tôi hỏi'});
    assert.equal(timers.at(-1),expected,String(stored));
  }
});

test('20/11 20:34 "GPT không hoàn tất phản hồi": OpenAI reason shown, one retry for server_error, no retry for other codes',async()=>{
  const sse=events=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{status:200,headers:{'content-type':'text/event-stream'}});
  const failed=code=>({type:'response.failed',response:{error:{code,message:'Boom for sk-'+'z'.repeat(30)}}});
  const done={type:'response.completed',response:{output:[{type:'message',content:[{type:'output_text',text:'Ổn rồi.'}]}],usage:{}}};
  let n=0;
  const r=await runAgent({apiKey:key,messages:[{role:'user',content:'x'}],onEvent:async()=>{},fetchImpl:async()=>++n===1?sse([failed('server_error')]):sse([done])});
  assert.equal(n,2);assert.equal(r.answer,'Ổn rồi.');
  n=0;
  await assert.rejects(runAgent({apiKey:key,messages:[{role:'user',content:'x'}],onEvent:async()=>{},fetchImpl:async()=>{n++;return sse([failed('invalid_prompt')])}}),
    e=>/GPT không hoàn tất phản hồi \(invalid_prompt\): Boom for sk-\*\*\*\./.test(e.message)&&!e.message.includes('zzzz'));
  assert.equal(n,1,'no retry for a non-transient code');
});

test('22/11 HTTP 400: OpenAI reason shown instead of the guessed web_search text; whitespace-only history never sent',async()=>{
  const bad=new Response(JSON.stringify({error:{message:"Invalid 'input[3].content': string too short. key sk-"+"q".repeat(30),param:'input[3].content',code:'string_below_min_length'}}),{status:400});
  await assert.rejects(runAgent({apiKey:key,messages:[{role:'user',content:'x'}],fetchImpl:async()=>bad}),
    e=>e.message.startsWith('OpenAI HTTP 400: string_below_min_length · input[3].content · Invalid')&&!/qqqq|web_search/.test(e.message));
  let req;
  await runAgent({apiKey:key,messages:[{role:'user',content:'a'},{role:'assistant',content:'   '},{role:'user',content:'b'}],fetchImpl:async(u,o)=>{req=JSON.parse(o.body);return text('ok')}});
  assert.deepEqual(req.input.map(m=>m.content),['a','b']);
});

test('22/11 HTTP 400 root cause: stateless calls ask for encrypted reasoning, and the second round replays it intact',async()=>{
  const bodies=[];
  const reasoningItem={type:'reasoning',id:'rs_1',summary:[],encrypted_content:'gAAA-enc'};
  await runAgent({apiKey:key,messages:[{role:'user',content:'giá vàng hôm nay'}],searchContext:{tavilyKey:'k'},
    toolFetchImpl:async()=>new Response(JSON.stringify({results:[{title:'Giá vàng',url:'https://a.vn',content:'SJC 136',published_date:new Date().toUTCString()}]}),{status:200}),
    fetchImpl:async(u,o)=>{const b=JSON.parse(o.body);bodies.push(b);
      return bodies.length===1?{ok:true,json:async()=>({output:[reasoningItem,{type:'function_call',name:'search_web',call_id:'c1',arguments:JSON.stringify({query:'giá vàng',freshness:'day'})}],usage:{}})}:text('SJC 136 triệu.')}});
  for(const b of bodies){assert.equal(b.store,false);assert.deepEqual(b.include,['reasoning.encrypted_content'])}
  assert.deepEqual(bodies[1].input.find(x=>x.type==='reasoning'),reasoningItem);
});
