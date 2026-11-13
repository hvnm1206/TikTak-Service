import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.js';

class ClassList {
 constructor(){this.items=new Set()}
 add(x){this.items.add(x)}
 remove(x){this.items.delete(x)}
 contains(x){return this.items.has(x)}
 toggle(x,force){const v=force===undefined?!this.items.has(x):!!force;if(v)this.items.add(x);else this.items.delete(x);return v}
}
class Element {
 constructor(id){this.id=id;this.classList=new ClassList();this.children=[];this.style={};this.dataset={};this.textContent='';this.value='';this.checked=false;this.attributes={};this.onload=null;this.onclick=null;this.oninput=null;this.onchange=null;this.disabled=false}
 replaceChildren(...arr){this.children=arr}
 append(...x){this.children.push(...x)}
 appendChild(x){this.children.push(x);return x}
 setAttribute(n,v){this.attributes[n]=v}
 getAttribute(n){return this.attributes[n]}
 addEventListener(){}
 getBoundingClientRect(){return {width:410,height:340,left:0,top:0}}
 getContext(){return {setTransform(){}}}
 scrollTo(){}
 select(){}
 remove(){}
}
function makeBrowser({search='off',micError='',apiFailure=''}={}){
 const elements=new Map(),writes=[],calls=[],recInstances=[];
 const $=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)};
 const storage=new Map([['nmh_voice_api_key_v1','sk-'+'a'.repeat(40)],['nmh_voice_web_search_v1',search]]);
 class AudioContext{
  constructor(){this.state='running';this.sampleRate=44100;this.destination={}}
  createBuffer(){return {}}
  createAnalyser(){return {fftSize:256,connect(){},getByteTimeDomainData(){}}}
  createBufferSource(){return {buffer:null,playbackRate:{value:1},connect(){},disconnect(){},stop(){},start(){},onended:null}}
  async resume(){this.state='running'}
  async decodeAudioData(){return {duration:1.3}}
 }
 class Recognition{
  constructor(){this.continuous=false;this.interimResults=false;this.lang='';recInstances.push(this)}
  start(){this.started=true;if(micError)queueMicrotask(()=>this.onerror?.({error:micError}))}
  abort(){this.aborted=true}
  emit(text){this.onresult?.({results:[{isFinal:true,0:{transcript:text}}]});this.onend?.()}
 }
 const fetchImpl=async (url,opts={})=>{
  calls.push({url:String(url),opts});
  if(String(url)==='/api/v3/config')return Response.json({ready:false,googleClientId:''});
  if(String(url)==='/api/chat'){
   writes.push(JSON.parse(opts.body));
   return apiFailure?Response.json({error:apiFailure},{status:502}):Response.json({answer:'Xin chào.',sources:[],estimatedModelUsd:0.00001,estimatedSearchUsd:0});
  }
  if(String(url)==='/api/tts')return new Response(new Uint8Array(500),{status:200,headers:{'content-type':'audio/mpeg'}});
  throw Error('Unexpected browser fetch '+url);
 };
 const window={
  SpeechRecognition:Recognition,
  speechSynthesis:{speak(){},cancel(){}},
  SpeechSynthesisUtterance:class{constructor(s){this.text=s}},
  AudioContext,devicePixelRatio:1,
  matchMedia:()=>({matches:false}),
  addEventListener(){},
  isSecureContext:true,
  ResizeObserver:null
 };
 const document={hidden:false,getElementById:$,createElement:tag=>new Element(tag),addEventListener(){},body:new Element('body')};
 const sandbox={window,document,navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  performance,fetch:fetchImpl,Response,Request,URL,AbortController,AbortSignal,SpeechSynthesisUtterance:window.SpeechSynthesisUtterance,
  requestAnimationFrame:()=>0,cancelAnimationFrame(){},clearTimeout,setTimeout,clearInterval,setInterval,console,TextDecoder,TextEncoder,
  alert(){},confirm(){return false},prompt(){return null},location:{reload(){}}
 };
 window.window=window;
 return {sandbox,$,recInstances,writes,calls,storage};
}
async function initialize(options){
 const app=await worker.fetch(new Request('https://example.test/'),{});
 assert.equal(app.status,200);
 const html=await app.text();
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.equal(scripts.length,2,'Core Voice and V3 Setup should each have their own script');
 const harness=makeBrowser(options);
 const context=vm.createContext(harness.sandbox);
 for(const script of scripts)vm.runInContext(script,context,{timeout:1500});
 return harness;
}
async function microtaskFlush(){await new Promise(resolve=>setTimeout(resolve,15))}
test('real page START binds mic, STT end reaches /api/chat, web defaults OFF',async()=>{
 const h=await initialize();
 assert.equal(typeof h.$('start').onclick,'function','START control must be wired');
 h.$('start').onclick();
 assert.equal(h.recInstances.length,1,'Microphone did not launch');
 assert.equal(h.recInstances[0].lang,'vi-VN');
 assert.equal(h.$('stateHint').textContent,'MIC · ĐANG NGHE');
 h.recInstances[0].emit('Xin chào');
 await microtaskFlush();
 assert.equal(h.writes.length,1,'Speech transcription must trigger chat');
 assert.equal(h.writes[0].messages.at(-1).content,'Xin chào');
 assert.equal(h.writes[0].webSearch,false);
 assert.ok(h.calls.some(x=>x.url==='/api/tts'),'AI must continue to Marin TTS');
});
test('web toggle ON never breaks mic-to-API request; only changes opt-in flag',async()=>{
 const h=await initialize({search:'on'});
 h.$('start').onclick();
 h.recInstances[0].emit('Giá vàng hôm nay?');
 await microtaskFlush();
 assert.equal(h.writes.length,1);
 assert.equal(h.writes[0].webSearch,true);
 assert.match(h.writes[0].messages.at(-1).content,/Giá vàng/);
});
test('permission denial is visibly reported and offers resume, not silent freeze',async()=>{
 const h=await initialize({micError:'not-allowed'});
 h.$('start').onclick();
 await microtaskFlush();
 assert.match(h.$('error').textContent,/not-allowed/);
 assert.equal(h.$('resume').classList.contains('hidden'),false);
});
test('API failure is reported as an error after successful speech recognition',async()=>{
 const h=await initialize({apiFailure:'Mock API 502'});
 h.$('start').onclick();
 h.recInstances[0].emit('Tìm thông tin');
 await microtaskFlush();
 assert.match(h.$('error').textContent,/Mock API 502/);
});

test('iOS final speech result must reach GPT even when recognition onend never fires',async()=>{
 const h=await initialize();
 h.$('start').onclick();
 const recognition=h.recInstances[0];
 recognition.onresult?.({results:[{isFinal:true,0:{transcript:'Kiểm tra cảm biến máy'}}]});
 await microtaskFlush();
 assert.equal(h.writes.length,1,'Safari may not fire onend; final STT must still submit a chat request');
 assert.equal(h.writes[0].messages.at(-1).content,'Kiểm tra cảm biến máy');
});
