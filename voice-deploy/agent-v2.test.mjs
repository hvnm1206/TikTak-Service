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
    if(host==='api.open-meteo.com')return {ok:true,json:async()=>({timezone:'Asia/Ho_Chi_Minh',current:{temperature_2m:28},current_units:{temperature_2m:'°C'},daily:{time:['2026-11-14','2026-11-15'],weather_code:[3,61],temperature_2m_max:[29,27],temperature_2m_min:[22,20],precipitation_sum:[0,8],precipitation_probability_max:[20,75],wind_speed_10m_max:[12,17]},daily_units:{temperature_2m_max:'°C',precipitation_sum:'mm',precipitation_probability_max:'%'}})};
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


test('regular conversation continues after a historical note request without save_note tool',async()=>{
 const history=[
  {role:'user',content:'Ghi lại giúp tao việc ngày mai'},
  {role:'assistant',content:'Đã ghi vào file ghi chú.'},
  {role:'user',content:'Hà Nội là thủ đô nước nào?'}
 ];
 let body;
 const r=await runAgent({apiKey:key,messages:history,fetchImpl:async(_,opts)=>{
  body=JSON.parse(opts.body);
  return say('Hà Nội là thủ đô Việt Nam.');
 }});
 assert.ok(!body.tools.some(x=>x.name==='save_note'));
 assert.equal(r.answer,'Hà Nội là thủ đô Việt Nam.');
});
test('the removed note feature cannot intercept a new voice request',async()=>{
 let body;
 const r=await runAgent({apiKey:key,messages:[{role:'user',content:'Ghi lại rằng ngày mai đi công tác'}],fetchImpl:async(_,opts)=>{
  body=JSON.parse(opts.body);
  return say('Hiện chưa có chức năng lưu ghi chú trực tiếp bằng giọng nói.');
 }});
 assert.equal(body.tools.some(x=>x.name==='save_note'),false);
 assert.ok(r.answer.includes('chưa có chức năng'));
});

test('tomorrow and 7-day weather use dated Open-Meteo daily forecast, not current values',async()=>{
 let n=0,payload=null,weatherURL=null;
 const fetchImpl=async(_url,opts)=>{
  n++;if(n===1)return tool('get_weather',{place:'Hà Nội'});
  payload=JSON.parse(opts.body).input.find(x=>x.type==='function_call_output');
  return say('Ngày mai dự báo cao nhất 27 độ, có mưa.');
 };
 const toolFetchImpl=async url=>{
  const u=new URL(url);
  if(u.hostname==='geocoding-api.open-meteo.com')
   return {ok:true,json:async()=>({results:[{name:'Hà Nội',latitude:21.02,longitude:105.84,country:'Việt Nam',timezone:'Asia/Ho_Chi_Minh'}]})};
  if(u.hostname==='api.open-meteo.com'){
   weatherURL=u;
   return {ok:true,json:async()=>({timezone:'Asia/Ho_Chi_Minh',current:{temperature_2m:32},daily:{time:['2026-11-14','2026-11-15','2026-11-16'],temperature_2m_max:[32,27,26],temperature_2m_min:[25,20,19],weather_code:[1,61,3],precipitation_sum:[0,8,2],precipitation_probability_max:[0,75,45],wind_speed_10m_max:[8,17,12]},daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_sum:'mm',precipitation_probability_max:'%'}})};
  }
  throw Error('bad source');
 };
 const answer=await runAgent({apiKey:key,messages:[{role:'user',content:'Dự báo thời tiết Hà Nội ngày mai?'}],fetchImpl,toolFetchImpl});
 assert.ok(weatherURL);
 assert.equal(weatherURL.searchParams.get('forecast_days'),'7');
 assert.match(weatherURL.searchParams.get('daily'),/precipitation_probability_max/);
 assert.ok(payload);
 const out=JSON.parse(payload.output);
 assert.equal(out.ok,true);
 assert.equal(out.data.current.temperature_2m,32);
 assert.equal(out.data.forecast[1].date,'2026-11-15');
 assert.equal(out.data.forecast[1].temperature_max,27);
 assert.equal(out.data.forecast[1].precipitation_probability_max,75);
 assert.equal(out.data.forecast_units.precipitation_probability_max,'%');
 assert.equal(out.data.forecast_kind,'daily_prediction_not_observation');
 assert.match(answer.answer,/ngày mai/i);
});
test('weather daily unavailable returns explicit failure, never a fake tomorrow forecast',async()=>{
 let n=0,output;
 const fetchImpl=async(_url,opts)=>{
  n++;if(n===1)return tool('get_weather',{place:'Đà Nẵng'});
  output=JSON.parse(opts.body).input.find(x=>x.type==='function_call_output');
  return say('Nguồn hiện chưa có dự báo theo ngày.');
 };
 const toolFetchImpl=async url=>{
  if(new URL(url).hostname==='geocoding-api.open-meteo.com')
   return {ok:true,json:async()=>({results:[{name:'Đà Nẵng',latitude:16.06,longitude:108.22}]})};
  return {ok:true,json:async()=>({current:{temperature_2m:30}})};
 };
 await runAgent({apiKey:key,messages:[{role:'user',content:'Ngày mai ở Đà Nẵng có mưa không?'}],fetchImpl,toolFetchImpl});
 const result=JSON.parse(output.output);
 assert.equal(result.ok,false);
 assert.match(result.data.error,/chưa cung cấp dữ liệu theo ngày/);
});
