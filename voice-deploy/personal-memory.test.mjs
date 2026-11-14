import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import worker from './worker.js';
import {learnPersonalMemory,getPersonalContext,listPersonalMemory} from './personal-memory.js';

const origin='https://voice.example';
const key='sk-'+'a'.repeat(43);
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['0001_v3.sql','0002_v3_d1_only.sql','0003_memory_v2.sql','0004_reminders.sql','0005_prompt_presets.sql','0006_personal_memory.sql','0007_personal_memory_status.sql'])
  sqlite.exec(readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8'));
 const db={prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return{
  first:async()=>statement.get(...args),all:async()=>({results:statement.all(...args)}),
  run:async()=>({meta:{changes:Number(statement.run(...args).changes)}})
 }}}}};
 const users={first:'fixture-user-1',second:'fixture-user-2'};
 const tokens={first:'A'.repeat(43),second:'B'.repeat(43)};
 for(const who of ['first','second']){
  const sub=users[who];
  sqlite.prepare('INSERT INTO v3_users(id,name,created_at) VALUES(?,?,?)').run(sub,'Test fixture',1);
  sqlite.prepare('INSERT INTO v3_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)')
   .run(createHash('sha256').update(tokens[who]).digest('hex'),sub,Date.now()+600000,1);
  sqlite.prepare('INSERT INTO v3_memory_v2_preferences(user_id,enabled,revision,updated_at) VALUES(?,?,?,?)').run(sub,1,1,1);
 }
 const request=(path,who='first',method='GET',body)=>new Request(origin+path,{method,headers:{
  origin,'content-type':'application/json',...(who?{cookie:'__Host-nmhv3='+tokens[who]}:{})},body:body&&JSON.stringify(body)});
 const env={NMH_DB:db,NMH_V3_GOOGLE_CLIENT_ID:'123456-fixture.apps.googleusercontent.com',NMH_MEMORY_V2_MODE:'active',NMH_PERSONAL_MEMORY:'pilot'};
 return {sqlite,db,users,request,env};
}
const propose=(...ops)=>Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({ops})}]}]});
const fact=(overrides={})=>({action:'add',slot:'họ hàng - người có tên nêu trong ví dụ',category:'identity',aspect:'relationship',subject:'Kim',domain:'gia đình',body:'Kim là em họ của người dùng.',evidence:'Kim là em họ của tôi',kind:'stated',terms:['Kim','em họ'],...overrides});
const learn=async(f,utterance,ops,options={})=>learnPersonalMemory({db:f.db,sub:f.users.first,apiKey:key,messages:[{role:'user',content:utterance}],
 turnId:crypto.randomUUID(),learnedAt:Date.now(),fetchImpl:async()=>propose(...ops),...options});

test('rejects unattested text and sensitive data, obeys opt-out even during analysis',async()=>{
 const f=fixture();
 assert.equal((await learn(f,'Hôm nay trời mát.',[fact()])).count,0);
 assert.equal((await learn(f,'Mật khẩu tài khoản của tôi có nội dung rất dài.',[fact()])).status,'ignored');
 assert.equal((await learn(f,'Kim là em họ của tôi',[fact()],{fetchImpl:async()=>{
  f.sqlite.prepare('UPDATE v3_memory_v2_preferences SET enabled=0,revision=2 WHERE user_id=?').run(f.users.first);
  return propose(fact());
 }})).count,0);
 assert.deepEqual((await listPersonalMemory(f.db,f.users.first)).entries,[]);
});
test('updates a relationship with source and history and retrieves it past newer unrelated entries',async()=>{
 const f=fixture(),start=Date.now();
 assert.equal((await learn(f,'Kim là em họ của tôi',[fact()],{learnedAt:start})).count,1);
 const old=(await listPersonalMemory(f.db,f.users.first)).entries[0];
 for(let i=1;i<=35;i++)await learn(f,'Tôi đang phụ trách kế hoạch dài hạn số '+i,[fact({slot:'kế hoạch '+i,
  category:'context',aspect:'goal',subject:'người dùng',domain:'kế hoạch',body:'Phụ trách kế hoạch dài hạn số '+i,evidence:'Tôi đang phụ trách kế hoạch dài hạn số '+i,terms:['kế hoạch']})],{learnedAt:start+i});
 const recent=await getPersonalContext(f.db,f.users.first,'Kim là ai?');
 assert.equal(recent[0].body,'Kim là em họ của người dùng.');
 assert.deepEqual(await getPersonalContext(f.db,f.users.second,'Kim là ai?'),[]);
 assert.equal((await learn(f,'Tôi đính chính: Kim là bạn cũ của tôi.',[fact({action:'update',target_id:old.id,
  body:'Kim là bạn cũ của người dùng.',evidence:'Kim là bạn cũ của tôi',terms:['Kim','bạn cũ']})],{learnedAt:start+40})).count,1);
 const row=(await getPersonalContext(f.db,f.users.first,'Kim là ai?'))[0];
 assert.equal(row.body,'Kim là bạn cũ của người dùng.');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM v3_personal_memory WHERE slot=?').get(old.slot).n,2);
 assert.equal((await worker.fetch(f.request('/api/v3/personal-memory',null),f.env)).status,401);
 assert.equal((await worker.fetch(f.request('/api/v3/personal-memory','second','DELETE',{id:old.id}),f.env)).status,404);
 assert.equal((await worker.fetch(f.request('/api/v3/personal-memory','first','DELETE',{id:old.id}),f.env)).status,200);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM v3_personal_memory WHERE slot=?').get(old.slot).n,0);
});
test('DISC stays out of replies until a second user observation supports the same dimension and context',async()=>{
 const f=fixture(),start=Date.now();
 const observation={...fact(),slot:'kiểm chứng trong vận hành',category:'disc',aspect:'C',subject:'người dùng',domain:'vận hành',
  body:'Đối chiếu số liệu trước khi quyết trong vận hành.',kind:'observed',terms:['vận hành'],evidence:'Tôi đối chiếu log trước khi duyệt.'};
 await learn(f,observation.evidence,[observation],{learnedAt:start});
 const prior=(await listPersonalMemory(f.db,f.users.first)).entries[0];
 assert.equal(prior.state,'candidate');
 assert.deepEqual(await getPersonalContext(f.db,f.users.first,'Quy trình vận hành?'),[]);
 const inference={...observation,slot:'xu hướng C khi vận hành',kind:'inferred',support_id:prior.id,
  evidence:'Ở lần xử lý khác tôi kiểm bảng số rồi mới quyết.'};
 await learn(f,inference.evidence,[{...inference,slot:'suy rộng',domain:'gia đình'}],{learnedAt:start+1});
 assert.deepEqual(await getPersonalContext(f.db,f.users.first,'Gia đình?'),[]);
 await learn(f,inference.evidence,[inference],{learnedAt:start+2});
 const result=await getPersonalContext(f.db,f.users.first,'Quy trình vận hành?');
 assert.equal(result.length,1);
 assert.equal(result[0].kind,'inferred');
});
test('voice chat schedules learning in the background and a separate turn receives ASK and collaboration context',async()=>{
 const f=fixture();
 let release;
 const hold=new Promise(resolve=>{release=resolve});
 let jobs=[],seen=[];
 const prior=globalThis.fetch;
 const ask=fact({slot:'kỹ năng kiểm tra thiết bị',category:'ask',aspect:'skill',subject:'người dùng',
  domain:'thiết bị',body:'Từng tự kiểm tra thiết bị bằng nhật ký lỗi.',evidence:'Tôi từng tự kiểm tra thiết bị bằng nhật ký lỗi',terms:['thiết bị']});
 const collaboration=fact({slot:'cách trình bày',category:'collaboration',aspect:'preference',subject:'người dùng',domain:'chung',
  body:'Muốn nghe kết luận trước.',evidence:'từ nay cho tôi nghe kết luận trước',terms:['kết luận']});
 globalThis.fetch=async(_url,opts)=>{
  const input=JSON.parse(opts.body);
  if(input.text?.format?.name==='ngo_personal_memory'){
   if(JSON.parse(input.input).utterance.includes('từng tự kiểm tra thiết bị')){
    await hold;
    return propose(ask,collaboration);
   }
   return propose();
  }
  seen.push(input.instructions);
  return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Tôi đã hiểu.'}]}]});
 };
 try{
  const chat=async text=>worker.fetch(f.request('/api/chat','first','POST',{apiKey:key,messages:[{role:'user',content:text}]}),f.env,{waitUntil:p=>jobs.push(p)});
  const response=await chat('Tôi từng tự kiểm tra thiết bị bằng nhật ký lỗi, từ nay cho tôi nghe kết luận trước.');
  assert.equal((await response.json()).answer,'Tôi đã hiểu.');
  assert.equal(jobs.length,1);
  assert.deepEqual((await listPersonalMemory(f.db,f.users.first)).entries,[]);
  release();
  await Promise.all(jobs);
  jobs=[];
  await chat('Nên kiểm tra thiết bị thế nào?');
  await Promise.all(jobs);
  assert.match(seen[1],/Từng tự kiểm tra thiết bị bằng nhật ký lỗi/);
  assert.match(seen[1],/Muốn nghe kết luận trước/);
 }finally{release();globalThis.fetch=prior}
});

test('pilot exposes the section before loading and records only account-scoped status for the last turn',async()=>{
 const f=fixture(),before=globalThis.fetch;
 const page=await (await worker.fetch(new Request(origin),f.env)).text();
 assert.match(page,/id="v3MemoryV2Section" open/);
 assert.match(page,/id="v3LearnedReload"/);
 const jobs=[];
 let rejectAnalysis=true;
 globalThis.fetch=async(_url,o)=>JSON.parse(o.body).text?.format?.name==='ngo_personal_memory'
  ? rejectAnalysis?new Response('{}',{status:429}):propose()
  : Response.json({output:[{type:'message',content:[{type:'output_text',text:'Tôi đã hiểu.'}]}]});
 try{
  const chat=()=>worker.fetch(f.request('/api/chat','first','POST',{apiKey:key,messages:[{role:'user',content:'Hôm nay tôi đi bộ.'}]}),f.env,{waitUntil:p=>jobs.push(p)});
  const profile=async who=>(await worker.fetch(f.request('/api/v3/personal-memory',who),f.env)).json();
  await chat();await Promise.all(jobs.splice(0));
  const failed=(await profile('first')).lastRun;
  assert.equal(failed.state,'analysis-failed');
  assert.equal(failed.reason,'http-429');
  assert.equal((await profile('second')).lastRun,null);
  assert.deepEqual(Object.keys(failed).sort(),['learned_at','reason','saved_count','state']);
  rejectAnalysis=false;
  await chat();await Promise.all(jobs.splice(0));
  const done=(await profile('first')).lastRun;
  assert.equal(done.state,'no-change');
  assert.equal(done.reason,'no-proposal');
 }finally{globalThis.fetch=before}
});

test('pilot refresh is visible clear of the login and result wrappers and can retry settings',async()=>{
 const {default:vm}=await import('node:vm');
 const f=fixture();
 const html=await (await worker.fetch(new Request(origin),f.env)).text();
 const button=html.indexOf('<button type="button" id="v3LearnedReload">');
 assert.ok(button>0 && button<html.indexOf('id="v3LearnedPanel" hidden') && button<html.indexOf('id="v3App"'));
 const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const nodes=new Map();
 const el=id=>{
  if(!nodes.has(id))nodes.set(id,{style:{},hidden:id==='v3LearnedPanel',addEventListener(){},replaceChildren(){},append(){}});
  return nodes.get(id);
 };
 let available=false,results=0;
 const get=async path=>{
  if(path==='/api/v3/config')return {ready:true};
  if(path==='/api/v3/me')return {signedIn:true};
  if(path==='/api/v3/memory-v2-preference'){
   if(!available)throw Error('settings server unavailable');
   return {available:true,mode:'active',enabled:true,revision:1};
  }
  if(path.startsWith('/api/v3/personal-memory')){
   results++;
   return {entries:[],nextOffset:null,lastRun:{state:'no-change',reason:'no-proposal',learned_at:1}};
  }
  if(path==='/api/v3/documents')throw Error('documents unavailable');
  return {};
 };
 const ctx={window:{},document:{getElementById:el},fetch:async path=>Response.json(await get(path))};
 vm.runInNewContext(code,ctx);
 await ctx.window.nmhV3Refresh();
 assert.match(el('v3MemoryV2Status').textContent,/settings server unavailable/);
 assert.equal(el('v3MemoryV2Toggle').disabled,true);
 available=true;
 await el('v3LearnedReload').onclick();
 assert.equal(results,1);
 assert.equal(el('v3LearnedPanel').hidden,false);
 assert.match(el('v3LearnedRun').textContent,/GPT không đề xuất mục nào/);
});
