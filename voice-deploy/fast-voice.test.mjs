import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.js';
import {responseLines} from './response-events.js';
import {previewRealtimeSpeech} from './realtime-speech.js';
import {currentTurnContext} from './fast-voice-ui.js';

const origin='https://voice.example';
const env={NMH_FAST_VOICE:'active'};
const key='sk-'+'k'.repeat(35);
const request=()=>new Request(origin+'/api/chat-stream',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({apiKey:key,messages:[{role:'user',content:'Xin chào'}]})});
const item={type:'message',phase:'final_answer',id:'msg_1'};
const answer='Chào anh, tôi đang nghe. Anh muốn hỏi gì?';
const events=(...items)=>items.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join('');
const added=i=>({type:'response.output_item.added',item:i});
const delta=(id,text)=>({type:'response.output_text.delta',item_id:id,delta:text});
const done=output=>({type:'response.completed',response:{output,usage:{input_tokens:23,output_tokens:15}}});
const completeMessage={...item,content:[{type:'output_text',text:answer}]};
const eventReader=response=>responseLines(response.body);

test('pilot serves runnable opt-in voice UI and legacy route stays gated',async()=>{
 const page=async target=>(await (await worker.fetch(new Request(origin+'/'),target)).text()).match(/<script>([\s\S]*?)<\/script>/)[1];
 const pilot=await page(env);
 new vm.Script(pilot);
 assert.match(pilot,/async function fastVoice/);
 assert.match(pilot,/speechEnd/);
 assert.doesNotMatch(await page({}),/async function fastVoice/);
 assert.equal((await worker.fetch(request(),{})).status,404);
});

test('a completed action closes its command context before the next turn',()=>{
 const history=[
  {role:'user',content:'Hãy ghi nhớ tôi thích trà xanh'},
  {role:'assistant',content:'Đã ghi nhớ: tôi thích trà xanh',actionBoundary:true},
  {role:'user',content:'Ngày mai thời tiết thế nào?'}
 ];
 assert.deepEqual(currentTurnContext(history),[{role:'user',content:'Ngày mai thời tiết thế nào?'}]);
 const ordinary=[
  {role:'user',content:'Hà Nội ở đâu?'},
  {role:'assistant',content:'Ở miền Bắc Việt Nam.'},
  {role:'user',content:'Còn Đà Nẵng?'}
 ];
 assert.deepEqual(currentTurnContext(ordinary),ordinary);
});

test('both fast and baseline clients mark completed actions and use closed-turn context',async()=>{
 const page=await (await worker.fetch(new Request(origin+'/'),env)).text();
 assert.match(page,/turn\.actionBoundary=!!result\.actionStatus/);
 assert.match(page,/actionBoundary:!!d\.actionStatus/);
 assert.equal((page.match(/messages:currentTurnContext\(history\)/g)||[]).length,2);
});

test('approved final sentence reaches the client before GPT completes',async()=>{
 const original=globalThis.fetch, encoder=new TextEncoder();
 let upstream,starting;
 const started=new Promise(resolve=>{starting=resolve});
 globalThis.fetch=async(_url,opts)=>{
  assert.equal(JSON.parse(opts.body).stream,true);
  return new Response(new ReadableStream({start(c){upstream=c;starting()}}));
 };
 try{
  const r=await worker.fetch(request(),env);
  const iter=eventReader(r);
  await started;
  const a=encoder.encode(events(added(item),delta(item.id,'Chào anh, tôi đang nghe. ')));
  for(let i=0;i<a.length;i+=5)upstream.enqueue(a.subarray(i,i+5));
  assert.equal(JSON.parse((await iter.next()).value).type,'firstText');
  assert.deepEqual(JSON.parse((await iter.next()).value),{type:'preview',text:'Chào anh, tôi đang nghe.'});
  upstream.enqueue(encoder.encode(events(delta(item.id,'Anh muốn hỏi gì?'),done([completeMessage]))));
  upstream.close();
  assert.equal(JSON.parse((await iter.next()).value).result.answer,answer);
  await iter.return();
 }finally{globalThis.fetch=original}
});

test('commentary and web search produce no premature spoken sentence',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(events(added({...item,phase:'commentary'}),delta(item.id,'Tôi đang kiểm tra thông tin. '),added({type:'web_search_call'}),added({...item,id:'msg_2'}),delta('msg_2','Nguồn đã xác nhận thời tiết. '),done([{type:'web_search_call'},completeMessage])));
 try{
  const r=await worker.fetch(request(),env);
  const output=[];
  for await(const line of eventReader(r))output.push(JSON.parse(line));
  assert.deepEqual(output.map(x=>x.type),['firstText','tool','done']);
 }finally{globalThis.fetch=original}
});

test('Realtime pilot waits for completed audio and returns valid 24 kHz PCM WAV',async()=>{
 class Socket extends EventTarget {
  send(raw){
   const e=JSON.parse(raw);
   if(e.type==='session.update'){
    assert.equal(e.session.audio.output.voice,'marin');
    queueMicrotask(()=>this.emit({type:'session.updated'}));
   }else if(e.type==='response.create'){
    assert.equal(e.response.input[0].content[0].text,'Xin chào.');
    queueMicrotask(()=>{
     this.emit({type:'response.output_audio.delta',delta:'AQACAA=='});
     this.emit({type:'response.done',response:{status:'completed',usage:{output_token_details:{audio_tokens:2}}}});
    });
   }
  }
  accept(){queueMicrotask(()=>this.emit({type:'session.created'}))}
  close(){this.dispatchEvent(new Event('close'))}
  emit(event){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(event)}))}
 }
 const result=await previewRealtimeSpeech({key,text:'Xin chào.',signal:new AbortController().signal,fetchImpl:async()=>({status:101,webSocket:new Socket()})});
 assert.equal(Buffer.from(result.wave.slice(0,4)).toString(),'RIFF');
 assert.equal(new DataView(result.wave.buffer).getUint32(24,true),24000);
 assert.deepEqual([...result.wave.slice(44)],[1,0,2,0]);
 assert.equal(result.usage.audioOut,2);
});
