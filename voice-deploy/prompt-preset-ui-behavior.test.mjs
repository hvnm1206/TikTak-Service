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
async function launch(server){
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
 await sleep();await sleep();await sleep();await sleep();
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
