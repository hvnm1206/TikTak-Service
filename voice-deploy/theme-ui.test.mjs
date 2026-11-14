import test from 'node:test';
import assert from 'node:assert/strict';
import {enhanceThemePage} from './theme-ui.js';
import fs from 'node:fs';
import vm from 'node:vm';

test('theme is an additive visual layer with default old appearance',()=>{
 const input='<!doctype html><html><head><title>Voice</title></head><body><div id="status">Chưa bắt đầu</div><section id="setup"><h2>SETUP</h2></section><button id="start">NÓI</button><div id="nmhReminderToast"></div></body></html>';
 const output=enhanceThemePage(input);
 for(const marker of ['id="start"','id="nmhReminderToast"','ngoThemeCSS','ngoThemeScript','ngoThemeSelect','nmh_voice_theme_v1','data-state','Mắt Ngố','Mắt Vịt','Mắt Corgi'])assert.ok(output.includes(marker),marker);
 assert.equal((output.match(/<script/g)||[]).length,1);
 assert.equal((output.match(/<\/script>/g)||[]).length,1);
 assert.ok(output.includes('theme=\'default\''));
 assert.ok(output.includes("querySelector('.visual-field')")&&output.includes('field.append(stage)'));
 assert.ok(output.includes(':root[data-ngo-theme="eyes"] #avatar,:root[data-ngo-theme="duck"] #avatar,:root[data-ngo-theme="corgi"] #avatar{display:none}'));
 assert.ok(output.includes('width:min(94%,355px)'));

 const script=output.match(/<script id="ngoThemeScript">([\s\S]*?)<\/script>/)?.[1]; assert.ok(script);
 new vm.Script(script);
});
test('theme does not touch core Voice or storage of keys',()=>{
 const source=fs.readFileSync(new URL('./theme-ui.js',import.meta.url),'utf8');
 assert.ok(!/speechRecognition|SpeechRecognition|\/api\/tts|\/api\/chat|\/api\/reminders|nmh_voice_api_key_v1/.test(source));
 for(const key of ['theme','Mascot','status','MutationObserver','prefers-reduced-motion'])assert.ok(source.includes(key));
});
test('Marin volume uses WebAudio gain, compressor and persisted bounded input, not microphone replacement',()=>{
 const src=fs.readFileSync(new URL('./worker.js',import.meta.url),'utf8');
 const patch=fs.readFileSync(new URL('./volume-ui.js',import.meta.url),'utf8');
 assert.ok(patch.includes('audioCtx.createGain()')&&patch.includes('audioCtx.createDynamicsCompressor()'));
 assert.ok(patch.includes('meter.connect(gain)')&&patch.includes('avatarFace?.setAudio(meter)'));
 assert.ok(src.includes('enhanceVolumePage(enhanceVoicePage('));
 assert.ok(patch.includes('gain.connect(limiter);limiter.connect(audioCtx.destination)'));
 assert.ok(src.includes('nmh_voice_gain_v1')&&src.includes('id=\\\"gain\\\"'));
 assert.ok(src.includes('clamp(load(\\\"nmh_voice_gain_v1\\\",\\\"1.55\\\"),1,2.5,1.55)'));
 assert.ok(src.includes('enhanceThemePage(enhanceReminderPage(enhanceV3Page(PAGE,env),env))'));
 assert.ok(src.includes('window.SpeechRecognition||window.webkitSpeechRecognition'));
});

test('mascot skins are ONLY pairs of expressive eyes, no spinning face or head',()=>{
 const html=enhanceThemePage('<html><head></head><body></body></html>');
 assert.ok(html.includes("const eye=(x,id)=>"));
 assert.ok(html.includes("eye(104,'left')+eye(256,'right')"));
 assert.ok(html.includes('ngo-eye'));
 assert.ok(html.includes('ngo-iris'));
 assert.ok(html.includes('window.setInterval'));
 assert.ok(html.includes('scheduleBlink'));
 assert.ok(html.includes('pointermove'));
 assert.ok(html.includes('prefers-reduced-motion'));
 assert.ok(html.includes("phase==='listening'"));
 assert.ok(html.includes("phase==='speaking'"));
 assert.ok(html.includes("phase==='processing'"));
 assert.ok(!html.includes('ngoMascotTalk'));
 assert.ok(!html.includes('ngoMascotFloat'));
 assert.ok(!html.includes('ngoMascotThink'));
 assert.ok(!html.includes('ngoMascotStage svg{animation'));
 assert.ok(html.includes('translate(\'+x+\',124)'));
});

test('eye-only selector and state animations work with DOM behavior stub, without invoking Voice APIs',()=>{
 const html=enhanceThemePage('<html><head></head><body></body></html>');
 const source=html.match(/<script id="ngoThemeScript">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(source);
 const handlers={}, observers=[],intervals=[],store=new Map([['nmh_voice_theme_v1','eyes']]);
 const fake=(name)=>({name,dataset:{},style:{setProperty(k,v){this[k]=v}},textContent:'',
  addEventListener(type,fn){handlers[name+':'+type]=fn},
  insertAdjacentElement(){},insertAdjacentHTML(_pos,markup){this.markup=markup},
  replaceChildren(){this.markup=''},querySelectorAll(sel){
   if(!this.markup)return [];
   return sel==='.ngo-eye'?[leftEye,rightEye]:sel==='.ngo-iris'?[leftIris,rightIris]:[];
  },getBoundingClientRect(){return {left:0,top:0,width:360,height:250}}});
 const leftEye=fake('left-eye'),rightEye=fake('right-eye');
 const leftIris=fake('left-iris'),rightIris=fake('right-iris');
 const status=fake('status'),hint=fake('hint'),field=fake('field'),setup=fake('setup'),heading=fake('heading'),select=fake('select');
 const stage=fake('stage'),picker=fake('picker');
 field.append=(v)=>{assert.equal(v,stage)};
 setup.querySelector=()=>heading;
 picker.querySelector=()=>select;
 const doc={
  documentElement:{dataset:{}},hidden:false,
  getElementById(id){return id==='status'?status:id==='setup'?setup:id==='stateHint'?hint:null},
  querySelector(sel){return sel==='.visual-field'?field:null},
  createElement(type){assert.ok(type==='div'||type==='section');return type==='div'?stage:picker}
 };
 const ctx={document:doc,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
  window:{matchMedia:()=>({matches:false}),setTimeout:()=>1,clearTimeout:()=>{},setInterval:fn=>{intervals.push(fn)}},
  MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},
  Math,console};
 vm.runInNewContext(source,ctx);
 assert.equal(doc.documentElement.dataset.ngoTheme,'eyes');
 assert.equal(stage.dataset.theme,'eyes');
 assert.match(stage.markup,/class="ngo-eye"/);
 assert.match(stage.markup,/class="ngo-iris"/);
 assert.doesNotMatch(stage.markup,/ngoMascotTalk|ngoMascotFloat/);
 hint.textContent='MIC · ĐANG NGHE';observers.forEach(fn=>fn());
 assert.equal(stage.dataset.state,'listening');
 hint.textContent='MARIN · ĐANG NÓI';observers.forEach(fn=>fn());
 assert.equal(stage.dataset.state,'speaking');
 assert.equal(intervals.length,2);
 intervals.forEach(fn=>fn());
 assert.match(leftIris.style.transform,/translate\(/);
 select.value='duck';handlers['select:change']();
 assert.equal(doc.documentElement.dataset.ngoTheme,'duck');
 assert.equal(store.get('nmh_voice_theme_v1'),'duck');
 assert.match(stage.markup,/class="ngo-eye"/);
 select.value='corgi';handlers['select:change']();
 assert.equal(stage.dataset.theme,'corgi');
 select.value='default';handlers['select:change']();
 assert.equal(stage.dataset.theme,'default');
 assert.equal(stage.markup,'');
});
