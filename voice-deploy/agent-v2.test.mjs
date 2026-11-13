import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, MODEL } from './agent-v2.js';

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
