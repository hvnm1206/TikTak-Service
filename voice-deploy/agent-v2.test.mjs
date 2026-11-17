import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, MODEL, cleanVoiceAnswer, drivingRoute, tomtomRoute, vietmapRoute, vietmapCalc } from './agent-v2.js';

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

test('url_citation annotation spans are structurally removed even without citation symbols',async()=>{
 const text='Hà Nội hôm nay 25 độ. Vietnam Weather Daily';
 const start=Array.from(text).indexOf('V');
 const r=await runAgent({apiKey:key,messages:msg,fetchImpl:async()=>response([
  {type:'web_search_call',id:'ws1',status:'completed'},
  {type:'message',content:[{type:'output_text',text,annotations:[
   {type:'url_citation',start_index:start,end_index:Array.from(text).length,url:'https://example.org/weather',title:'Vietnam Weather Daily'}
  ]}]}
 ])});
 assert.equal(r.answer,'Hà Nội hôm nay 25 độ.');
 assert.equal(r.sources.length,1);
 assert.equal(r.sources[0].url,'https://example.org/weather');
});

test('source appendix without a colon is removed from voice text',()=>{
 assert.equal(cleanVoiceAnswer('Kết quả chính.\nNguồn tham khảo\nExample News\nAnother Site'),'Kết quả chính.');
 assert.equal(cleanVoiceAnswer('Kết quả chính.\n• Sources\nExample News'),'Kết quả chính.');
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

test('extra hosted search calls returned by OpenAI keep the paid answer and are all counted in cost',async()=>{
  const r=await runAgent({apiKey:key,messages:msg,fetchImpl:async()=>response([
    {type:'web_search_call',id:'1',status:'completed'},
    {type:'web_search_call',id:'2',status:'completed'},
    {type:'message',content:[{type:'output_text',text:'Found'}]}
  ])});
  assert.equal(r.answer,'Found');
  assert.equal(r.webSearchCalls,2);
  assert.ok(r.estimatedWebSearchUsd>0);
});

test('speech text omits URLs and citation lists while keeping source links separate',()=>{
 const x=cleanVoiceAnswer('Có hai quán gần Mỹ Đình. citeturn0search0\nNguồn: https://example.com/very-long-url\nTham khảo: https://example.org/more');
 assert.equal(x,'Có hai quán gần Mỹ Đình.');
 const y=cleanVoiceAnswer('Chi tiết xem [trang quán](https://example.com/test), không đọc đường dẫn.');
 assert.equal(y,'Chi tiết xem trang quán, không đọc đường dẫn.');
});


test('all known citation artifacts are removed from captions and speech',()=>{
 const samples=[
  ['Kết quả đúng. 【1†source】','Kết quả đúng.'],
  ['Kết quả đúng. [1] [turn0search0]','Kết quả đúng.'],
  ['Kết quả đúng turn2search3.','Kết quả đúng.'],
  ['Kết quả đúng. (Nguồn: Example News)','Kết quả đúng.'],
  ['Kết quả đúng. Citation: Example News','Kết quả đúng.'],
  ['Kết quả đúng.\nSources: Example News','Kết quả đúng.']
 ];
 for(const [raw,want] of samples)assert.equal(cleanVoiceAnswer(raw),want);
});

test('streaming preview is cleaned by the same citation filter as final speech',async()=>{
 const encoder=new TextEncoder();
 const events=[
  {type:'response.output_item.added',item:{type:'message',phase:'final_answer',id:'m1'}},
  {type:'response.output_text.delta',item_id:'m1',delta:'Kết quả đã xác minh. [turn0search0] '},
  {type:'response.completed',response:{output:[{type:'message',phase:'final_answer',id:'m1',content:[{type:'output_text',text:'Kết quả đã xác minh. [turn0search0]'}]}],usage:{input_tokens:10,output_tokens:5}}}
 ];
 const body=new ReadableStream({start(c){for(const e of events)c.enqueue(encoder.encode('data: '+JSON.stringify(e)+'\n\n'));c.close()}});
 const seen=[];
 const r=await runAgent({apiKey:key,messages:msg,onEvent:async e=>seen.push(e),fetchImpl:async()=>({ok:true,body})});
 assert.equal(seen.find(x=>x.type==='preview')?.text,'Kết quả đã xác minh.');
 assert.equal(r.answer,'Kết quả đã xác minh.');
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

function sseBody(events){
 const encoder=new TextEncoder();
 return new ReadableStream({start(c){for(const e of events)c.enqueue(encoder.encode('data: '+JSON.stringify(e)+'\n\n'));c.close()}});
}
async function previewsFor(events){
 const seen=[];
 const r=await runAgent({apiKey:key,messages:msg,onEvent:async e=>seen.push(e),fetchImpl:async()=>({ok:true,body:sseBody(events)})});
 return {previews:seen.filter(x=>x.type==='preview').map(x=>x.text),answer:r.answer};
}
test('early voice preview also works when the model does not label message phase',async()=>{
 const text='Hà Nội hôm nay mát, khoảng hai mươi độ. Chiều có thể mưa nhẹ.';
 const {previews,answer}=await previewsFor([
  {type:'response.output_item.added',item:{type:'message',id:'m1'}},
  {type:'response.output_text.delta',item_id:'m1',delta:'Hà Nội hôm nay mát, khoảng hai mươi độ. '},
  {type:'response.output_text.delta',item_id:'m1',delta:'Chiều có thể mưa nhẹ.'},
  {type:'response.completed',response:{output:[{type:'message',id:'m1',content:[{type:'output_text',text}]}],usage:{input_tokens:10,output_tokens:5}}}
 ]);
 assert.deepEqual(previews,['Hà Nội hôm nay mát, khoảng hai mươi độ.']);
 assert.ok(answer.startsWith(previews[0]));
});
test('commentary-phase messages never start early voice',async()=>{
 const {previews}=await previewsFor([
  {type:'response.output_item.added',item:{type:'message',phase:'commentary',id:'c1'}},
  {type:'response.output_text.delta',item_id:'c1',delta:'Đang suy nghĩ về câu hỏi này nhé. '},
  {type:'response.completed',response:{output:[{type:'message',phase:'commentary',id:'c1',content:[{type:'output_text',text:'Đang suy nghĩ về câu hỏi này nhé.'}]}],usage:{input_tokens:1,output_tokens:1}}}
 ]);
 assert.deepEqual(previews,[]);
});
test('long first sentence starts early voice at a comma pause; decimal commas are not split',async()=>{
 const part1='Theo dự báo thì nhiệt độ trung bình khoảng 1,5 độ cao hơn hôm qua,';
 const part2=' gió đông bắc nhẹ cấp hai cấp ba và độ ẩm khá cao nên anh nhớ mang theo áo khoác mỏng khi ra ngoài buổi tối nhé';
 const text=part1+part2+'.';
 const {previews,answer}=await previewsFor([
  {type:'response.output_item.added',item:{type:'message',phase:'final_answer',id:'m1'}},
  {type:'response.output_text.delta',item_id:'m1',delta:part1},
  {type:'response.output_text.delta',item_id:'m1',delta:part2},
  {type:'response.output_text.delta',item_id:'m1',delta:'.'},
  {type:'response.completed',response:{output:[{type:'message',phase:'final_answer',id:'m1',content:[{type:'output_text',text}]}],usage:{input_tokens:1,output_tokens:1}}}
 ]);
 assert.deepEqual(previews,[part1]);
 assert.ok(answer.startsWith(previews[0]));
});
test('short complete first sentence still wins over comma fallback',async()=>{
 const {previews}=await previewsFor([
  {type:'response.output_item.added',item:{type:'message',phase:'final_answer',id:'m1'}},
  {type:'response.output_text.delta',item_id:'m1',delta:'Có chứ, tao nhớ mày mà. Mày là Hải béo, chủ nhân của tao, người hay hỏi linh tinh lúc nửa đêm,'},
  {type:'response.output_text.delta',item_id:'m1',delta:' đúng không.'},
  {type:'response.completed',response:{output:[{type:'message',phase:'final_answer',id:'m1',content:[{type:'output_text',text:'x'}]}],usage:{input_tokens:1,output_tokens:1}}}
 ]);
 assert.deepEqual(previews,['Có chứ, tao nhớ mày mà.']);
});
test('cost rules: web_search marked paid with free tools first, voice answers short by default',async()=>{
  let req;
  await runAgent({apiKey:key,messages:msg,fetchImpl:async(url,opt)=>{req=JSON.parse(opt.body);return response([{type:'message',content:[{type:'output_text',text:'Ừ.'}]}])}});
  assert.match(req.instructions,/web_search là công cụ TỐN PHÍ/);
  assert.match(req.instructions,/Ưu tiên công cụ miễn phí trước: thời tiết dùng get_weather/);
  assert.match(req.instructions,/1–2 câu ngắn \(khoảng 15–35 từ\)/);
  assert.ok(!/không dùng tìm kiếm cho câu hỏi kiến thức đơn giản/.test(req.instructions));
});
test('markdown symbols are never left for TTS to read as "sao"; lists and headings become separate phrases',()=>{
  assert.equal(cleanVoiceAnswer('**Hà Nội** hôm nay *khoảng* 20 độ.'),'Hà Nội hôm nay khoảng 20 độ.');
  assert.equal(cleanVoiceAnswer('Có 3 quán:\n* **Phở Thìn** – ngon\n* Phở Bát Đàn\n1. Bún chả'),'Có 3 quán: Phở Thìn – ngon, Phở Bát Đàn, Bún chả');
  assert.equal(cleanVoiceAnswer('## Kết quả\nGiá vàng **SJC** là 85 triệu/lượng'),'Kết quả, Giá vàng SJC là 85 triệu/lượng');
  assert.equal(cleanVoiceAnswer('Tỷ lệ 5*3=15'),'Tỷ lệ 5 nhân 3=15');
  assert.equal(cleanVoiceAnswer('Ngày 1,5 độ.\n\nThứ hai trời đẹp.'),'Ngày 1,5 độ. Thứ hai trời đẹp.');
  for(const t of ['**a** *b* `c` # d','| x | y |','__z__ ~~w~~'])assert.ok(!/[*#_`~|]/.test(cleanVoiceAnswer(t)),t);
});
test('driving route tool: offered only when the user switch is on; car + live traffic; one Google call; maps link',async()=>{
  let req;
  await runAgent({apiKey:key,messages:msg,fetchImpl:async(u,o)=>{req=JSON.parse(o.body);return response([{type:'message',content:[{type:'output_text',text:'Ừ.'}]}])}});
  assert.ok(!req.tools.some(t=>t.name==='get_driving_route'),'off by default');
  assert.ok(!/get_driving_route/.test(req.instructions));
  const calls=[];
  const g=async(u,o)=>{calls.push({u:String(u),h:o.headers,b:JSON.parse(o.body)});return new Response(JSON.stringify({routes:[
    {duration:'1560s',staticDuration:'1080s',distanceMeters:9800,description:'Phạm Hùng',routeLabels:['DEFAULT_ROUTE'],travelAdvisory:{speedReadingIntervals:[{speed:'NORMAL'},{speed:'TRAFFIC_JAM'}]}},
    {duration:'1680s',staticDuration:'1500s',distanceMeters:11200,description:'Trần Duy Hưng',travelAdvisory:{speedReadingIntervals:[{speed:'NORMAL'}]}}]}),{headers:{'content-type':'application/json'}})};
  const r=await drivingRoute({destination:'Mỹ Đình, Hà Nội',origin:''},{routeContext:{apiKey:'gk',origin:{lat:21.03,lng:105.78}},fetchImpl:g});
  assert.equal(calls.length,1);
  assert.match(calls[0].u,/routes\.googleapis\.com\/directions\/v2:computeRoutes/);
  assert.equal(calls[0].h['X-Goog-Api-Key'],'gk');
  assert.equal(calls[0].b.travelMode,'DRIVE');assert.equal(calls[0].b.routingPreference,'TRAFFIC_AWARE');assert.equal(calls[0].b.computeAlternativeRoutes,true);
  assert.deepEqual(calls[0].b.origin,{location:{latLng:{latitude:21.03,longitude:105.78}}});
  assert.equal(r.ok,true);
  assert.equal(r.data.routes[0].duration_now,'26 phút');assert.equal(r.data.routes[0].delay_minutes,8);assert.equal(r.data.routes[0].status,'có đoạn tắc');
  assert.equal(r.data.routes[1].status,'thông thoáng');
  assert.match(r.mapsUrl,/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=21\.03000,105\.78000&destination=M/);
  const no=await drivingRoute({destination:'Mỹ Đình',origin:''},{routeContext:{apiKey:'gk',origin:null},fetchImpl:g});
  assert.equal(no.ok,false);assert.match(no.data.error,/điểm xuất phát/);assert.equal(calls.length,1,'no Google call without an origin');
  const denied=await drivingRoute({destination:'Mỹ Đình',origin:'Cầu Giấy'},{routeContext:{apiKey:'gk'},fetchImpl:async()=>new Response('{}',{status:403})});
  assert.equal(denied.ok,false);assert.match(denied.data.error,/chưa bật Routes API/);
});
test('agent offers the route tool and returns mapsUrl when route context is present',async()=>{
  let n=0,first;
  const r=await runAgent({apiKey:key,messages:msg,routeContext:{apiKey:'gk',origin:{lat:21,lng:105.8}},
    toolFetchImpl:async()=>new Response(JSON.stringify({routes:[{duration:'600s',staticDuration:'600s',distanceMeters:3000,description:'Láng'}]})),
    fetchImpl:async(u,o)=>{const b=JSON.parse(o.body);if(!n++){first=b;return response([{type:'function_call',name:'get_driving_route',call_id:'c1',arguments:JSON.stringify({destination:'Láng',origin:''})}])}
      return response([{type:'message',content:[{type:'output_text',text:'Mất 10 phút, đường thoáng.'}]}])}});
  assert.ok(first.tools.some(t=>t.name==='get_driving_route'));
  assert.match(first.instructions,/get_driving_route/);
  assert.equal(r.answer,'Mất 10 phút, đường thoáng.');
  assert.match(r.mapsUrl,/^https:\/\/www\.google\.com\/maps\/dir\//);
});
test('TomTom provider: 2 calls (place + route with live traffic), car, 3 options, jam street names, Google Maps link for navigation',async()=>{
  const calls=[];
  const f=async(u)=>{u=new URL(String(u));calls.push(u);
    if(u.pathname.startsWith('/search/'))return new Response(JSON.stringify({results:[{position:{lat:21.0285,lon:105.7782},poi:{name:'SVĐ Mỹ Đình'},address:{freeformAddress:'Mỹ Đình, Hà Nội'}}]}));
    return new Response(JSON.stringify({routes:[
      {summary:{lengthInMeters:9800,travelTimeInSeconds:1560,trafficDelayInSeconds:480,noTrafficTravelTimeInSeconds:1080},
       guidance:{instructions:[{routeOffsetInMeters:0,pointIndex:0,street:'Láng'},{routeOffsetInMeters:2000,pointIndex:40,street:'Phạm Hùng'},{routeOffsetInMeters:9800,pointIndex:200}]},
       sections:[{sectionType:'TRAFFIC',startPointIndex:60,simpleCategory:'JAM',delayInSeconds:420},{sectionType:'TRAFFIC',startPointIndex:10,simpleCategory:'JAM',delayInSeconds:20}]},
      {summary:{lengthInMeters:11200,travelTimeInSeconds:1680,trafficDelayInSeconds:60,noTrafficTravelTimeInSeconds:1620},guidance:{instructions:[{routeOffsetInMeters:0,pointIndex:0,street:'Trần Duy Hưng'}]},sections:[]}]}));
  };
  const r=await drivingRoute({destination:'Mỹ Đình',origin:''},{routeContext:{provider:'tomtom',apiKey:'tk',origin:{lat:21.02,lng:105.81}},fetchImpl:f});
  assert.equal(calls.length,2,'one place search + one route');
  assert.equal(calls[0].searchParams.get('countrySet'),'VN');assert.equal(calls[0].searchParams.get('key'),'tk');
  assert.match(calls[1].pathname,/calculateRoute\/21\.02,105\.81:21\.0285,105\.7782\/json/);
  for(const [k,v] of [['traffic','true'],['travelMode','car'],['maxAlternatives','2'],['sectionType','traffic'],['instructionsType','text']])assert.equal(calls[1].searchParams.get(k),v);
  assert.equal(calls[1].searchParams.get('routeRepresentation'),null,'TomTom rejects instructionsType with routeRepresentation=none');
  assert.equal(r.ok,true);assert.equal(r.data.to,'SVĐ Mỹ Đình');
  assert.equal(r.data.routes[0].duration_now,'26 phút');assert.equal(r.data.routes[0].delay_minutes,8);
  assert.equal(r.data.routes[0].status,'có đoạn tắc');
  assert.deepEqual(JSON.parse(JSON.stringify(r.data.routes[0].slow_points)),[{street:'Phạm Hùng',kind:'ùn tắc',delay_minutes:7}],'only delays >= 1 min, named by street');
  assert.equal(r.data.routes[0].via,'Phạm Hùng, Láng');
  assert.equal(r.data.routes[0].path,'Láng → Phạm Hùng','streets in driving order');assert.match(r.data.routes[0].arrive_at,/^\d{2}:\d{2}$/);
  assert.equal(r.data.routes[1].status,'thông thoáng');
  assert.equal(r.mapsUrl,'https://www.google.com/maps/dir/?api=1&origin=21.02000,105.81000&destination=21.02850,105.77820&travelmode=driving');
  const bad=await tomtomRoute({destination:'Hồ Gươm',origin:'Cầu Giấy'},{routeContext:{provider:'tomtom',apiKey:'bad'},fetchImpl:async()=>new Response('{}',{status:403})});
  assert.equal(bad.ok,false);assert.match(bad.data.error,/TOMTOM_KEY/);
  const none=await tomtomRoute({destination:'Hồ Gươm',origin:''},{routeContext:{provider:'tomtom',apiKey:'tk',origin:null},fetchImpl:async()=>{throw Error('should not call')}});
  assert.match(none.data.error,/điểm xuất phát/);
});

test('TomTom 400 on a parameter: one minimal retry instead of failing the whole question; error text never leaks the key',async()=>{
  const seen=[];
  const f=async(u)=>{u=new URL(String(u));seen.push(u);
    if(u.pathname.startsWith('/search/'))return new Response(JSON.stringify({results:[{position:{lat:21.05,lon:105.82},poi:{name:'Hồ Tây'}}]}));
    if(u.searchParams.get('instructionsType'))return new Response('{"error":"bad param"}',{status:400});
    return new Response(JSON.stringify({routes:[{summary:{lengthInMeters:5000,travelTimeInSeconds:900,trafficDelayInSeconds:0,noTrafficTravelTimeInSeconds:900}}]}));};
  const r=await tomtomRoute({destination:'Hồ Tây',origin:''},{routeContext:{provider:'tomtom',apiKey:'secret123',origin:{lat:21.0,lng:105.8}},fetchImpl:f});
  assert.equal(r.ok,true);assert.equal(r.data.routes[0].duration_now,'15 phút');assert.equal(r.data.routes[0].status,'thông thoáng');
  assert.equal(seen.filter(x=>x.pathname.includes('calculateRoute')).length,2);
  const bad=await tomtomRoute({destination:'Hồ Tây',origin:''},{routeContext:{provider:'tomtom',apiKey:'secret123',origin:{lat:21,lng:105.8}},fetchImpl:async(u)=>String(u).includes('/search/')?new Response(JSON.stringify({results:[{position:{lat:21.05,lon:105.82}}]})):new Response('bad key=secret123 x',{status:500})});
  assert.equal(bad.ok,false);assert.ok(!bad.data.error.includes('secret123'));
});

test('failed route tool: exact reason returned as routeError (key masked) and the model is told to say it',async()=>{
  let n=0,first;
  const r=await runAgent({apiKey:key,messages:msg,routeContext:{apiKey:'tk',provider:'tomtom',origin:{lat:21,lng:105.8}},
    toolFetchImpl:async()=>new Response('denied key=tk',{status:403}),
    fetchImpl:async(u,o)=>{const b=JSON.parse(o.body);if(!n++){first=b;return response([{type:'function_call',name:'get_driving_route',call_id:'c1',arguments:JSON.stringify({destination:'Hồ Tây',origin:''})}])}
      return response([{type:'message',content:[{type:'output_text',text:'TomTom từ chối khóa.'}]}])}});
  assert.match(first.instructions,/đúng lý do trong trường error/);
  assert.match(r.routeError,/TomTom Search từ chối TOMTOM_KEY \(HTTP 403\): denied key=\*\*\*/);assert.ok(!r.routeError.includes('=tk'));assert.equal(r.mapsUrl,null);
});

const vmPath=(min,km,streets,heavy=[])=>({distance:km*1000,time:min*60000,instructions:streets.map(([n,d])=>({street_name:n,distance:d})),congestion_distance:heavy});
test('Vietmap route: search v4 -> place v4 (refid) -> route v4 car + alternatives + congestion; heavy km and path in order',async()=>{
  const seen=[];
  const f=async(u)=>{u=new URL(String(u));seen.push(u);
    if(u.pathname==='/api/search/v4')return Response.json([{ref_id:'geocode:ABC',name:'Hồ Tây',address:'Tây Hồ, Hà Nội'}]);
    if(u.pathname==='/api/place/v4')return Response.json({lat:21.055,lng:105.818});
    if(u.pathname==='/api/route/v4')return Response.json({code:'OK',paths:[vmPath(24,7.2,[['Láng',2500],['Bưởi',1800],['ngõ 1',100]],[800,700]),vmPath(27,8,[['Kim Mã',3000]])]});
    throw Error('unexpected '+u)};
  const r=await vietmapRoute({destination:'Hồ Tây',origin:''},{routeContext:{provider:'vietmap',apiKey:'vk',origin:{lat:21.0,lng:105.8}},fetchImpl:f});
  assert.equal(r.ok,true);assert.equal(r.data.provider,'Vietmap');assert.equal(r.data.to,'Hồ Tây, Tây Hồ, Hà Nội');
  assert.equal(seen[0].searchParams.get('focus'),'21,105.8');assert.equal(seen[1].searchParams.get('refid'),'geocode:ABC');
  const rt=seen[2];assert.deepEqual(rt.searchParams.getAll('point'),['21,105.8','21.055,105.818']);
  for(const [k,v] of [['vehicle','car'],['alternative','true'],['annotations','congestion,congestion_distance']])assert.equal(rt.searchParams.get(k),v);
  const a=r.data.routes[0];assert.equal(a.path,'Láng → Bưởi');assert.equal(a.duration_now,'24 phút');assert.equal(a.heavy_km,1.5);assert.equal(a.status,'có đoạn tắc');
  assert.equal(r.data.routes[1].status,'thông thoáng');assert.equal(r.trip.to.lat,21.055);assert.match(r.mapsUrl,/destination=21\.05500,105\.81800/);
  const bad=await vietmapCalc({lat:21,lng:105.8},{lat:21.05,lng:105.82},'vk',async()=>new Response('denied apikey=vk',{status:401}));
  assert.match(bad.error,/HTTP 401/);assert.ok(!bad.error.includes('=vk'));
});
test('TomTom primary with Vietmap compare key: same coordinates sent to Vietmap, one comparison line returned',async()=>{
  const seen=[];
  const f=async(u)=>{u=new URL(String(u));seen.push(u.host+u.pathname);
    if(u.pathname.startsWith('/search/'))return Response.json({results:[{position:{lat:21.05,lon:105.82},poi:{name:'Hồ Tây'}}]});
    if(u.pathname.includes('calculateRoute'))return Response.json({routes:[{summary:{lengthInMeters:6000,travelTimeInSeconds:1320,trafficDelayInSeconds:120,noTrafficTravelTimeInSeconds:1200},guidance:{instructions:[{routeOffsetInMeters:0,pointIndex:0,street:'Láng'}]}}]});
    if(u.pathname==='/api/route/v4'){assert.deepEqual(u.searchParams.getAll('point'),['21,105.8','21.05,105.82']);return Response.json({code:'OK',paths:[vmPath(25,6.5,[['Bưởi',3000]],[1200])]})}
    throw Error('unexpected '+u)};
  const r=await tomtomRoute({destination:'Hồ Tây',origin:''},{routeContext:{provider:'tomtom',apiKey:'tk',compareKey:'vk',origin:{lat:21,lng:105.8}},fetchImpl:f});
  assert.equal(r.ok,true);assert.equal(r.routeCompare.split('\n')[0],'So sánh: TomTom 22 phút · Vietmap 25 phút');assert.match(r.routeCompare.split('\n')[1],/^TomTom qua Láng.*\| Vietmap qua Bưởi, đông 1,2 km$/);
  assert.equal(seen.filter(x=>x.includes('vietmap')).length,1,'compare costs exactly one Vietmap transaction (no Vietmap search)');
  const off=await tomtomRoute({destination:'Hồ Tây',origin:''},{routeContext:{provider:'tomtom',apiKey:'tk',origin:{lat:21,lng:105.8}},fetchImpl:f});
  assert.equal(off.routeCompare,null);
});
test('Vietmap primary with TomTom compare key (owner 17/11): Ngố speaks Vietmap, screen line compares with one TomTom call',async()=>{
  const seen=[];
  const f=async(u)=>{u=new URL(String(u));seen.push(u.host+u.pathname);
    if(u.pathname==='/api/search/v4')return Response.json([{ref_id:'r1',name:'Hồ Tây',address:'Hà Nội'}]);
    if(u.pathname==='/api/place/v4')return Response.json({lat:21.05,lng:105.82});
    if(u.pathname==='/api/route/v4')return Response.json({code:'OK',paths:[vmPath(25,6.5,[['Bưởi',3000]],[1200])]});
    if(u.pathname.includes('calculateRoute')){assert.ok(u.pathname.includes('21,105.8:21.05,105.82'));return Response.json({routes:[{summary:{lengthInMeters:6000,travelTimeInSeconds:1320,trafficDelayInSeconds:120,noTrafficTravelTimeInSeconds:1200},guidance:{instructions:[{routeOffsetInMeters:0,pointIndex:0,street:'Láng'}]}}]})}
    throw Error('unexpected '+u)};
  const r=await drivingRoute({destination:'Hồ Tây',origin:''},{routeContext:{provider:'vietmap',apiKey:'vk',compareKey:'tk',origin:{lat:21,lng:105.8}},fetchImpl:f});
  assert.equal(r.ok,true);assert.equal(r.data.provider,'Vietmap');assert.equal(r.data.routes[0].duration_now,'25 phút');
  assert.equal(r.routeCompare.split('\n')[0],'So sánh: TomTom 22 phút · Vietmap 25 phút');
  assert.equal(seen.filter(x=>x.includes('tomtom')).length,1,'one TomTom call, no TomTom search');
});

test('voice answers: route arrows become pauses (never read "mũi tên")',()=>{
  assert.equal(cleanVoiceAnswer('Đi Láng → Phạm Hùng -> Đại lộ Thăng Long.'),'Đi Láng, Phạm Hùng, Đại lộ Thăng Long.');
});

import { currentLocation } from './agent-v2.js';
test('current location (owner 17/11 "hỏi vị trí hiện tại nó không biết"): Vietmap reverse, TomTom fallback, honest when no fix; tool offered with routes',async()=>{
  const seen=[];
  const f=async(u)=>{u=new URL(String(u));seen.push(u);
    if(u.pathname==='/api/reverse/v4')return Response.json([{display:'Số 12 Phố Thái Hà, Phường Đống Đa, Hà Nội'}]);
    if(u.pathname.includes('reverseGeocode'))return Response.json({addresses:[{address:{freeformAddress:'Thái Hà, Đống Đa, Hà Nội'}}]});
    throw Error('unexpected '+u)};
  const ctx={provider:'vietmap',apiKey:'vk',compareKey:'tk',origin:{lat:21.0121,lng:105.8203,acc:18}};
  let r=await currentLocation({routeContext:ctx,fetchImpl:f});
  assert.equal(r.ok,true);assert.equal(r.data.address,'Số 12 Phố Thái Hà, Phường Đống Đa, Hà Nội');assert.equal(r.data.accuracy_m,18);
  assert.equal(seen[0].searchParams.get('lat'),'21.0121');assert.equal(seen[0].searchParams.get('apikey'),'vk');
  r=await currentLocation({routeContext:{provider:'tomtom',apiKey:'tk',origin:{lat:21.0121,lng:105.8203}},fetchImpl:f});
  assert.equal(r.data.source,'TomTom');
  r=await currentLocation({routeContext:{provider:'vietmap',apiKey:'vk',origin:null},fetchImpl:f});
  assert.equal(r.ok,false);assert.match(r.data.error,/Vị trí chính xác/);
  let first;
  await runAgent({apiKey:key,messages:msg,routeContext:ctx,fetchImpl:async(u,o)=>{first??=JSON.parse(o.body);return response([{type:'message',content:[{type:'output_text',text:'ok'}]}])}});
  assert.ok(first.tools.some(t=>t.name==='get_current_location'));assert.match(first.instructions,/get_current_location/);
});
