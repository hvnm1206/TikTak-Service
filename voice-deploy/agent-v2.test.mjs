import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, MODEL, cleanVoiceAnswer } from './agent-v2.js';

const key='sk-'+ 'a'.repeat(40);
const msg=[{role:'user',content:'Tra thông tin cho tôi'}];
const response=(output,usage={input_tokens:120,output_tokens:45})=>({ok:true,json:async()=>({output,usage})});
const say=(text)=>response([{type:'message',content:[{type:'output_text',text}]}]);
const tool=(name,args,call_id='t1')=>response([{type:'function_call',name,arguments:JSON.stringify(args),call_id}]);

test('uses Ngáo reference model and auto tools, returns usage and estimate',async()=>{
  let body;
  const fetchImpl=async(_url,opts)=>{body=JSON.parse(opts.body);return say('Xin chào.')};
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl});
  assert.equal(MODEL,'gpt-6-luna');
  assert.equal(body.model,MODEL);
  assert.equal(body.tool_choice,'auto');
  assert.equal(body.store,false);
  assert.equal(body.reasoning.effort,'none');
  assert.ok(body.tools.length>=4);
  assert.equal(r.answer,'Xin chào.');
  assert.ok(r.estimatedModelUsd>0);
});
test('three personas are distinctly selected without keyword routing',async()=>{
  const prompts=[];
  for(const style of ['danh_da','chem_gio','nghiem_tuc']){
    await runAgent({apiKey:key,messages:msg,style,fetchImpl:async(_,opts)=>{
      prompts.push(JSON.parse(opts.body).instructions);return say('ok');
    }});
  }
  assert.match(prompts[0],/xưng tao/);
  assert.match(prompts[1],/xưng tôi/);
  assert.match(prompts[2],/điềm đạm/);
});
test('model can call time without extra public service',async()=>{
  let n=0,second;
  const fetchImpl=async(_,o)=>{const body=JSON.parse(o.body);n++;if(n===1)return tool('get_current_time',{timezone:'Asia/Ho_Chi_Minh'});second=body;return say('Bây giờ là chiều.')};
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl});
  assert.deepEqual(r.tools,['get_current_time']);
  assert.ok(second.input.some(x=>x.type==='function_call_output'&&JSON.parse(x.output).ok));
  assert.equal(r.searchProvider,'public_sources_only');
});
test('model-triggered weather fetch uses Open-Meteo sources',async()=>{
  let n=0;
  const fetchImpl=async()=>++n===1?tool('get_weather',{place:'Hà Nội'}):say('Hiện tại mát.');
  const toolFetchImpl=async(url)=>{
    const host=new URL(url).hostname;
    if(host==='geocoding-api.open-meteo.com')return {ok:true,json:async()=>({results:[{name:'Hà Nội',latitude:21.02,longitude:105.84,country:'Việt Nam'}]})};
    if(host==='api.open-meteo.com')return {ok:true,json:async()=>({current:{temperature_2m:28},current_units:{temperature_2m:'°C'}})};
    throw Error('unexpected host');
  };
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl,toolFetchImpl});
  assert.equal(r.sources.length,1);
  assert.match(r.sources[0].url,/open-meteo.com/);
});
test('Wikipedia search result provides grounded source',async()=>{
  let n=0;
  const fetchImpl=async()=>++n===1?tool('search_encyclopedia',{query:'Hà Nội'}):say('Thủ đô Việt Nam.');
  const toolFetchImpl=async()=>({ok:true,json:async()=>({query:{pages:{1:{title:'Hà Nội',extract:'Thủ đô Việt Nam'}}}})});
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl,toolFetchImpl});
  assert.match(r.sources[0].url,/wikipedia.org/);
});
test('Google News RSS sources are parsed and HTTPS-only',async()=>{
  let n=0;
  const fetchImpl=async()=>++n===1?tool('search_news',{query:'kinh tế'}):say('Tin ngắn.');
  const toolFetchImpl=async()=>({ok:true,text:async()=>'<rss><item><title>Tin A</title><link>https://news.google.com/a</link><pubDate>Fri, 13 Nov 2026</pubDate></item><item><title>Tin B</title><link>http://invalid.example</link></item></rss>'});
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl,toolFetchImpl});
  assert.equal(r.sources.length,1);
  assert.equal(r.sources[0].url,'https://news.google.com/a');
});
test('upstream invalid key returns clear error',async()=>{
  await assert.rejects(()=>runAgent({apiKey:key,messages:msg,fetchImpl:async()=>({ok:false,status:401})}),/API key không hợp lệ/);
});
test('public tool failure does not silently hallucinate a successful result',async()=>{
  let n=0,second;
  const fetchImpl=async(_,o)=>{n++;if(n===1)return tool('get_weather',{place:'Không tồn tại'});second=JSON.parse(o.body);return say('Tôi chưa lấy được dữ liệu thời tiết.')};
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl,toolFetchImpl:async()=>{throw Error('source down')}});
  assert.equal(r.sources.length,0);
  assert.ok(second.input.some(x=>x.type==='function_call_output'&&JSON.parse(x.output).ok===false));
});


test('usage estimate uses current Standard short-context GPT-6 Luna rates and cache discount',async()=>{
  const fetchImpl=async()=>response([{type:'message',content:[{type:'output_text',text:'Kết quả'}]}],{input_tokens:1_000_000,output_tokens:1_000_000,input_tokens_details:{cached_tokens:500_000}});
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl});
  assert.equal(r.usage.cached_input_tokens,500_000);
  assert.equal(r.usage.api_calls,1);
  assert.equal(r.estimatedModelUsd,0.555);
  assert.match(r.estimateBasis,/excludes_other_fees/);
});

test('hosted web search returns cited sources with one charged call and clean spoken answer',async()=>{
  let req;
  const fetchImpl=async(_,o)=>{req=JSON.parse(o.body);return response([
    {type:'web_search_call',id:'ws1',status:'completed'},
    {type:'message',content:[{type:'output_text',text:'Có quán bia gần sân Mỹ Đình. citeturn0search0',annotations:[
      {type:'url_citation',url:'https://example.org/quan-bia',title:'Danh sách địa điểm'},
      {type:'url_citation',url:'http://insecure.example/skip',title:'Unsafe'}
    ]}]}
  ])};
  const r=await runAgent({apiKey:key,messages:[{role:'user',content:'Có quán bia hơi nào gần sân Mỹ Đình?'}],fetchImpl});
  assert.equal(req.tools.filter(t=>t.type==='web_search').length,1);
  assert.equal(req.max_tool_calls,1);
  assert.equal(r.webSearchCalls,1);
  assert.equal(r.estimatedWebSearchUsd,0.01);
  assert.equal(r.searchProvider,'openai_web_search');
  assert.deepEqual(r.tools,['web_search']);
  assert.equal(r.sources.length,1);
  assert.equal(r.sources[0].url,'https://example.org/quan-bia');
  assert.doesNotMatch(r.answer,/cite/);
});

test('normal question does not claim a web call or incur web search charge',async()=>{
  const r=await runAgent({apiKey:key,messages:[{role:'user',content:'2 cộng 3 bằng bao nhiêu?'}],fetchImpl:async()=>say('5')});
  assert.equal(r.webSearchCalls,0);
  assert.equal(r.estimatedWebSearchUsd,0);
  assert.equal(r.searchProvider,'public_sources_only');
});

test('existing function tool survives alongside web search without extra charge',async()=>{
  let round=0,second;
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl:async(_,o)=>{
    round++;if(round===1)return tool('get_current_time',{timezone:'Asia/Ho_Chi_Minh'});
    second=JSON.parse(o.body);return say('Đã tra giờ.');
  }});
  assert.equal(r.webSearchCalls,0);
  assert.equal(r.estimatedWebSearchUsd,0);
  assert.ok(second.tools.some(t=>t.type==='web_search'));
  assert.deepEqual(r.tools,['get_current_time']);
});

test('OpenAI web search incompatibility does not silently fall back or invent results',async()=>{
  await assert.rejects(()=>runAgent({apiKey:key,messages:msg,fetchImpl:async()=>({ok:false,status:400})}),/quyền hỗ trợ web_search/);
});

test('multiple hosted searches fail closed before claiming cost control',async()=>{
  await assert.rejects(()=>runAgent({apiKey:key,messages:msg,fetchImpl:async()=>response([
    {type:'web_search_call',id:'1',status:'completed'},
    {type:'web_search_call',id:'2',status:'completed'},
    {type:'message',content:[{type:'output_text',text:'Found'}]}
  ])}),/vượt giới hạn/);
});

test('speech text omits URLs and citation lists while keeping source links separate',()=>{
 const x=cleanVoiceAnswer('Có hai quán gần Mỹ Đình. citeturn0search0\nNguồn: https://example.com/very-long-url\nTham khảo: https://example.org/more');
 assert.equal(x,'Có hai quán gần Mỹ Đình.');
 const y=cleanVoiceAnswer('Chi tiết xem [trang quán](https://example.com/test), không đọc đường dẫn.');
 assert.equal(y,'Chi tiết xem trang quán, không đọc đường dẫn.');
});

test('GPT can call authenticated save_note for a naturally phrased request without a regex match',async()=>{
 let seen=false,body;
 const fetchImpl=async(_,opts)=>{body=JSON.parse(opts.body);return tool('save_note',{content:'Ngày mai họp 8 giờ'})};
 const r=await runAgent({apiKey:key,messages:[{role:'user',content:'Ngố, hãy giữ lại giúp tao là ngày mai họp 8 giờ nhé'}],fetchImpl,onSaveNote:async content=>{assert.equal(content,'Ngày mai họp 8 giờ');seen=true;return {ok:true,data:{}}}});
 assert.ok(body.tools.some(x=>x.name==='save_note'));
 assert.equal(seen,true);
 assert.equal(r.answer,'Đã ghi vào file ghi chú.');
 assert.deepEqual(r.tools,['save_note']);
});
test('save_note never claims success when backend reports no Google session',async()=>{
 const r=await runAgent({apiKey:key,messages:[{role:'user',content:'Ghi lời nhắc này giúp tao'}],fetchImpl:async()=>tool('save_note',{content:'Việc thử'}),onSaveNote:async()=>({ok:false,data:{error:'Cần đăng nhập Google để lưu. Chưa lưu.'}})});
 assert.equal(r.answer,'Cần đăng nhập Google để lưu. Chưa lưu.');
});
test('save_note disabled without authenticated backend callback',async()=>{
 let tools;
 const r=await runAgent({apiKey:key,messages:msg,fetchImpl:async(_,o)=>{tools=JSON.parse(o.body).tools;return say('Xin chào')}});
 assert.ok(!tools.some(x=>x.name==='save_note'));
 assert.equal(r.answer,'Xin chào');
});

test('a saved note on prior turn NEVER exposes save_note on unrelated next question',async()=>{
 const history=[
  {role:'user',content:'Ngố, ghi lại cho tao mai gọi anh Nam'},
  {role:'assistant',content:'Đã ghi vào file ghi chú.'},
  {role:'user',content:'Hà Nội là thủ đô nước nào?'}
 ];
 let body;
 let writes=0;
 const r=await runAgent({apiKey:key,messages:history,onSaveNote:async()=>{writes++;return {ok:true,data:{}}},fetchImpl:async(_,o)=>{
   body=JSON.parse(o.body);
   return say('Hà Nội là thủ đô của Việt Nam.');
 }});
 assert.equal(writes,0);
 assert.ok(!body.tools.some(t=>t.name==='save_note'),'no saved note tool on unrelated question');
 assert.equal(r.answer,'Hà Nội là thủ đô của Việt Nam.');
 assert.deepEqual(r.tools,[]);
});
test('unrequested save_note from upstream is refused without invoking D1 or hijacking answer',async()=>{
 const messages=[
  {role:'user',content:'Ghi vào file ghi chú mua đèn'},
  {role:'assistant',content:'Đã ghi vào file ghi chú.'},
  {role:'user',content:'Hai cộng ba bằng bao nhiêu?'}
 ];
 let n=0,writes=0;
 let secondBody;
 const r=await runAgent({apiKey:key,messages,onSaveNote:async()=>{writes++;return {ok:true,data:{}}},fetchImpl:async(_,o)=>{
   n++;
   if(n===1)return tool('save_note',{content:'mua đèn'});
   secondBody=JSON.parse(o.body);
   return say('Bằng năm.');
 }});
 assert.equal(writes,0,'save callback must never fire on unrelated turn');
 assert.equal(n,2);
 assert.equal(r.answer,'Bằng năm.');
 assert.ok(!r.tools.includes('save_note'));
 assert.equal(secondBody.input.filter(x=>x.type==='function_call').length,1);
 assert.equal(secondBody.input.filter(x=>x.type==='function_call_output').length,1,'no duplicated upstream tool call');
});
test('explicit note request remains writeable even after an ordinary question',async()=>{
 const history=[
  {role:'user',content:'Thời tiết thế nào?'},
  {role:'assistant',content:'Trời mát.'},
  {role:'user',content:'Ghi lại cho tao ngày mai kiểm tra dây điện'}
 ];
 let writes=0;
 const r=await runAgent({apiKey:key,messages:history,onSaveNote:async text=>{
   writes++;
   assert.equal(text,'ngày mai kiểm tra dây điện');
   return {ok:true,data:{}};
 },fetchImpl:async(_,o)=>{
   const b=JSON.parse(o.body);
   assert.ok(b.tools.some(x=>x.name==='save_note'));
   return tool('save_note',{content:'ngày mai kiểm tra dây điện'});
 }});
 assert.equal(writes,1);
 assert.equal(r.answer,'Đã ghi vào file ghi chú.');
});
