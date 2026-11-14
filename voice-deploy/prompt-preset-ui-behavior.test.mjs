import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {enhanceV3Page} from './v3-ui.js';

const original='<html><head></head><body><section id="setup"><button id="back">QUAY LẠI</button></section></body></html>';
const html=enhanceV3Page(original);
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(code);
new vm.Script(code);

const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));
function createServer(){
 const profile={prompt:'',revision:0,presets:{},activePreset:''};
 const calls=[];
 return {profile,calls,fetch:async(url,opts={})=>{
  const path=String(url),method=opts.method||'GET';
  calls.push({path,method});
  let status=200,result={};
  if(path==='/api/v3/config')result={ready:true,googleClientId:'g'};
  else if(path==='/api/v3/me')result={signedIn:true,name:'Test'};
  else if(path==='/api/v3/profile'){
   if(method==='GET')result={...profile,presets:{...profile.presets}};
   else{
    const body=JSON.parse(opts.body);
    if(body.revision!==profile.revision){status=409;result={error:'Revision conflict'}}
    else{
     profile.prompt=body.prompt;profile.revision++;
     profile.activePreset=body.presetKey||'';
     if(body.presetKey)profile.presets[body.presetKey]=body.prompt;
     result={ok:true,verified:true,...profile,presets:{...profile.presets}};
    }
   }
  }else if(path==='/api/v3/memories')result={memories:[]};
  else if(path==='/api/v3/documents')result={documents:[]};
  else if(path==='/api/v3/memory-v2-preference')result={available:false,enabled:false,revision:0};
  else throw Error('Unexpected API: '+path);
  return {ok:status===200,status,json:async()=>result};
 }};
}
async function launch(server,waitForLoad=true){
 const elements=new Map(),confirmations=[];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{
   id,value:'',textContent:'',disabled:false,style:{},listeners:{},innerHTML:'',
   addEventListener(type,fn){this.listeners[type]=fn},
   replaceChildren(){},append(){},onclick:null
  });
  return elements.get(id);
 };
 const context={
  document:{getElementById:element,createElement:()=>({style:{},append(){}})},
  window:{},location:{reload(){}},fetch:server.fetch,
  confirm:msg=>{confirmations.push(msg);return false},
  prompt:()=>null,alert:()=>{},
  console
 };
 vm.runInNewContext(code,context);
 if(waitForLoad){await sleep();await sleep();await sleep();await sleep()}
 return {elements,el:element,confirmations,context};
}
async function save(ui,text){
 ui.el('v3Prompt').value=text;
 ui.el('v3Prompt').listeners.input();
 await ui.el('v3SavePrompt').onclick();
}
test('real SETUP client: choose without editing does not warn; save EACH of 3 templates, switch and reload persists',async()=>{
 const server=createServer();
 const ui=await launch(server);
 const items=[
  ['v3SampleDanh','danh','Bản Đanh Đá do người dùng viết — không phải mặc định.'],
  ['v3SampleChem','chem','Bản Chém Gió chỉnh sửa riêng.'],
  ['v3SampleNghiem','nghiem','Bản Nghiêm Túc chuẩn riêng.']
 ];
 for(const [btn,key,text] of items){
  ui.el(btn).onclick();
  assert.equal(ui.confirmations.length,0,'Clicking a preset should not count as unsaved user edit');
  await save(ui,text);
  assert.equal(server.profile.presets[key],text);
  assert.match(ui.el('v3PromptSaveStatus').textContent,/ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG/);
 }
 for(const [btn,key,text] of items){
  ui.el(btn).onclick();
  assert.equal(ui.el('v3Prompt').value,text,'Old hardcoded sample was incorrectly loaded for '+key);
 }
 assert.equal(ui.confirmations.length,0);
 const reloaded=await launch(server);
 for(const [btn,key,text] of items){
  reloaded.el(btn).onclick();
  assert.equal(reloaded.el('v3Prompt').value,text,'Reload lost customized '+key);
 }
 assert.equal(reloaded.confirmations.length,0);
});
test('only a truly manually changed draft warns; a declined switch never destroys it',async()=>{
 const server=createServer(),ui=await launch(server);
 ui.el('v3SampleDanh').onclick();
 ui.el('v3Prompt').value='Bản nháp chưa lưu';
 ui.el('v3Prompt').listeners.input();
 ui.el('v3SampleChem').onclick();
 assert.equal(ui.confirmations.length,1);
 assert.equal(ui.el('v3Prompt').value,'Bản nháp chưa lưu');
 assert.equal(server.profile.revision,0);
});
test('late profile refresh does not overwrite currently selected template before save',async()=>{
 const server=createServer(),ui=await launch(server);
 ui.el('v3SampleDanh').onclick();
 const before=ui.el('v3Prompt').value;
 await ui.context.window.nmhV3Refresh();
 assert.equal(ui.el('v3Prompt').value,before);
 assert.equal(ui.confirmations.length,0);
});

test('late first profile response cannot remove early choice and must persist edited template to correct slot',async()=>{
 const server=createServer();
 let release;
 const initialProfile=new Promise(resolve=>{release=resolve});
 const originalFetch=server.fetch;
 let first=true;
 server.fetch=async(url,opts={})=>{
  if(url==='/api/v3/profile'&&(!opts.method||opts.method==='GET')&&first){
   first=false;await initialProfile;
  }
  return originalFetch(url,opts);
 };
 const ui=await launch(server,false);
 ui.el('v3SampleChem').onclick();
 assert.match(ui.el('v3ActivePreset').textContent,/CHÉM GIÓ/);
 assert.match(ui.el('v3PromptSaveStatus').textContent,/MẪU GỐC/);
 release();
 await sleep();await sleep();await sleep();await sleep();
 assert.match(ui.el('v3ActivePreset').textContent,/CHÉM GIÓ/);
 await save(ui,'Chém Gió viết riêng ngay khi mở app.');
 assert.equal(server.profile.activePreset,'chem');
 assert.equal(server.profile.presets.chem,'Chém Gió viết riêng ngay khi mở app.');
 assert.match(ui.el('v3PromptSaveStatus').textContent,/ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG/);
 ui.el('v3SampleDanh').onclick();
 ui.el('v3SampleChem').onclick();
 assert.equal(ui.el('v3Prompt').value,'Chém Gió viết riêng ngay khi mở app.');
 assert.match(ui.el('v3PromptSaveStatus').textContent,/ĐÃ CÓ MẪU TÙY CHỈNH/);
});

test('legacy default Chém Gió profile is recognized as editing this template, never loses attribution',async()=>{
 const server=createServer();
 server.profile.prompt='Dí dỏm, thông minh, kể chuyện ngắn. Xưng tôi, gọi người dùng là anh. Không bịa.';
 server.profile.revision=4;
 const ui=await launch(server);
 assert.match(ui.el('v3ActivePreset').textContent,/CHÉM GIÓ/);
 await save(ui,'Nội dung Chém Gió mới được sửa từ mẫu gốc đang hiện.');
 assert.equal(server.profile.activePreset,'chem');
 assert.equal(server.profile.presets.chem,'Nội dung Chém Gió mới được sửa từ mẫu gốc đang hiện.');
 const again=await launch(server);
 again.el('v3SampleChem').onclick();
 assert.equal(again.el('v3Prompt').value,server.profile.presets.chem);
});

test('late profile restores existing custom preset instead of saving factory text over it',async()=>{
 const server=createServer();
 Object.assign(server.profile,{prompt:'Prompt khác',revision:2,presets:{chem:'Chém Gió đã lưu'},activePreset:'danh'});
 let release;
 const delayed=new Promise(resolve=>{release=resolve});
 const original=server.fetch;
 let first=true;
 server.fetch=async(path,opts={})=>{
  if(path==='/api/v3/profile'&&opts.method==='GET'&&first){first=false;await delayed}
  return original(path,opts);
 };
 const ui=await launch(server,false);
 ui.el('v3SampleChem').onclick();
 release();
 for(let i=0;i<4;i++)await sleep();
 assert.equal(ui.el('v3Prompt').value,'Chém Gió đã lưu');
 await ui.el('v3SavePrompt').onclick();
 assert.equal(server.profile.presets.chem,'Chém Gió đã lưu');
});

test('revision change protects the selected preset even if the active prompt is unchanged',async()=>{
 const server=createServer();
 Object.assign(server.profile,{prompt:'Prompt hiện tại',revision:1,presets:{chem:'Chém Gió cũ'},activePreset:'danh'});
 const ui=await launch(server);
 ui.el('v3SampleChem').onclick();
 server.profile.presets.chem='Chém Gió từ máy khác';
 server.profile.revision+=2;
 await save(ui,'Bản nháp máy thứ nhất');
 assert.equal(server.profile.presets.chem,'Chém Gió từ máy khác');
 assert.equal(ui.el('v3Prompt').value,'Bản nháp máy thứ nhất');
 assert.match(ui.el('v3PromptSaveStatus').textContent,/Bản nháp vẫn được giữ/);
 assert.ok(!server.calls.some(call=>call.path==='/api/v3/profile'&&call.method==='PUT'));
});
