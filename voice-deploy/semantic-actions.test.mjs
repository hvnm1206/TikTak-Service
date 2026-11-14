import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import worker from './worker.js';
import {runAgent} from './agent-v2.js';
import {buildActionRuntime} from './action-registry.js';

const origin='https://voice.local.test';
const key='sk-'+'a'.repeat(43);
const token='A'.repeat(43),sub='owner-test-123';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of ['0001_v3.sql','0002_v3_d1_only.sql','0003_memory_v2.sql','0004_reminders.sql'])
  sqlite.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO v3_users(id,name,created_at) VALUES (?,?,?)').run(sub,'Test',Date.now());
 sqlite.prepare('INSERT INTO v3_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),sub,Date.now()+600000,Date.now());
 const db={
  prepare(sql){return {bind(...args){const stmt=sqlite.prepare(sql);return{
   first:async()=>stmt.get(...args)||null,
   all:async()=>({results:stmt.all(...args)}),
   run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})
  }}}},
  async batch(ops){
   const result=[];sqlite.exec('BEGIN');
   try{for(const op of ops)result.push(await op.run());sqlite.exec('COMMIT')}
   catch(e){sqlite.exec('ROLLBACK');throw e}
   return result;
  }
 };
 const env={NMH_DB:db,NMH_V3_GOOGLE_CLIENT_ID:'691734271661-abcdef.apps.googleusercontent.com',NMH_REMINDERS_MODE:'active',NMH_MEMORY_V2_MODE:'off'};
 const request=(text,auth=true)=>new Request(origin+'/api/chat',{method:'POST',headers:{origin,'content-type':'application/json',...(auth?{cookie:'__Host-nmhv3='+token}:{})},body:JSON.stringify({apiKey:key,messages:[{role:'user',content:text}]})});
 return {sqlite,db,env,request};
}
function toolResponse(name,args){return Response.json({output:[{type:'function_call',call_id:'call-'+name,name,arguments:JSON.stringify(args)}],usage:{input_tokens:70,output_tokens:30}})}
test('single GPT path stores user-requested personal fact without timed reminder',async()=>{
 const {sqlite,env,request}=fixture();
 const utterance='Tôi muốn lưu thông tin mẹ của bé Nam tên là Lan';
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url)=>{assert.match(String(url),/api.openai.com\/v1\/responses/);calls++;return toolResponse('save_memory',{body:'Mẹ bé Nam tên là Lan',utterance_quote:'mẹ của bé Nam tên là Lan'})};
 try{
  const response=await worker.fetch(request(utterance),env);
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.actionOk,true,JSON.stringify(result));
  assert.equal(result.actionStatus,'verified');
  for(const key of ['memoryMs','agentMs','serverMs'])assert.ok(Number.isInteger(result.latency[key])&&result.latency[key]>=0,key);
  assert.ok(!JSON.stringify(result.latency).includes('Lan'),'timing must not contain user text');
  assert.match(result.answer,/Đã ghi nhớ/);
  assert.equal(calls,1,'one GPT call, no separate regex classifier');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminders').get().n,0);
 }finally{globalThis.fetch=previous}
});
test('single semantic save_note tool writes document and chunk with verified D1 readback',async()=>{
 const {sqlite,db,env,request}=fixture();
 const utterance='Lưu vào ghi chú việc kiểm tra máy vào ngày mai';
 const action=buildActionRuntime({request:request(utterance),env,utterance,requestId:'note-1'});
 assert.ok(action.tools.some(t=>t.name==='save_note'));
 const result=await action.execute('save_note',{body:'Kiểm tra máy vào ngày mai',utterance_quote:'ghi chú việc kiểm tra máy vào ngày mai'});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.match(result.answer,/Đã ghi và kiểm tra/);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_documents').get().n,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_chunks').get().n,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminders').get().n,0);
});
test('durable memory writes work with reminder feature flag disabled',async()=>{
 const {sqlite,env,request}=fixture();
 env.NMH_REMINDERS_MODE='off';
 const utterance='Hãy nhớ rằng tôi thích nhạc không lời';
 const action=buildActionRuntime({request:request(utterance),env,utterance});
 assert.ok(action.tools.some(x=>x.name==='save_memory'));
 assert.ok(!action.tools.some(x=>x.name==='set_reminder'));
 const result=await action.execute('save_memory',{body:'Tôi thích nhạc không lời',utterance_quote:'tôi thích nhạc không lời'});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,1);
});
test('owner auth and current-turn quote are required for any write',async()=>{
 const {sqlite,env,request}=fixture();
 const utterance='Tôi muốn ghi nhớ ngày khai giảng';
 const unauth=buildActionRuntime({request:request(utterance,false),env,utterance});
 const no=await unauth.execute('save_memory',{body:'Ngày khai giảng',utterance_quote:'ghi nhớ ngày khai giảng'});
 assert.equal(no.ok,false);assert.equal(no.errorCode,'AUTH');
 const auth=buildActionRuntime({request:request(utterance),env,utterance});
 const stale=await auth.execute('save_memory',{body:'Ghi nhớ khác',utterance_quote:'câu khác ở lượt trước'});
 assert.equal(stale.ok,false);assert.equal(stale.errorCode,'TURN_MISMATCH');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,0);
});
test('no write on ordinary questions; no secondary classifier or keyword routing',async()=>{
 const {sqlite,env,request}=fixture();
 const before=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Đã hiểu câu hỏi.'}]}],usage:{input_tokens:30,output_tokens:20}})};
 try{
  const response=await worker.fetch(request('Bạn giải thích sự khác nhau giữa ghi nhớ và nhắc việc?'),env);
  const data=await response.json();
  assert.equal(data.answer,'Đã hiểu câu hỏi.');
  assert.equal(calls,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminders').get().n,0);
 }finally{globalThis.fetch=before}
});
test('memory edit and delete use authenticated uniqueness and D1 write/readback',async()=>{
 const {sqlite,env,request}=fixture();
 sqlite.prepare('INSERT INTO v3_memories(id,user_id,body,created_at) VALUES(?,?,?,?)').run('original',sub,'Tôi thích trà xanh',Date.now());
 const utterance='Hãy sửa ghi nhớ thích trà xanh thành thích trà đen';
 const tool=buildActionRuntime({request:request(utterance),env,utterance});
 const update=await tool.execute('update_memory',{match:'Tôi thích trà xanh',body:'Tôi thích trà đen',utterance_quote:'sửa ghi nhớ thích trà xanh'});
 assert.equal(update.ok,true,JSON.stringify(update));
 assert.equal(sqlite.prepare("SELECT body FROM v3_memories WHERE id='original'").get().body,'Tôi thích trà đen');
 const remove=buildActionRuntime({request:request('Xóa thông tin tôi thích trà đen'),env,utterance:'Xóa thông tin tôi thích trà đen'});
 const deleted=await remove.execute('delete_memory',{match:'Tôi thích trà đen',utterance_quote:'Xóa thông tin tôi thích trà đen'});
 assert.equal(deleted.ok,true,JSON.stringify(deleted));
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,0);
});
test('GPT tool-choice is general; application adds no relationship grammar or phrase router',async()=>{
 const {env,request}=fixture();
 const utterance='Tôi cần lưu một thông tin mới';
 const action=buildActionRuntime({request:request(utterance),env,utterance});
 const names=action.tools.map(t=>t.name);
 for(const name of ['save_memory','save_note','update_memory','delete_memory','set_reminder','list_reminders','cancel_reminder'])assert.ok(names.includes(name),name);
 let options;
 await runAgent({apiKey:key,messages:[{role:'user',content:utterance}],actionRuntime:action,
  fetchImpl:async(_,o)=>{options=JSON.parse(o.body);return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Bạn muốn lưu thông tin gì?'}]}],usage:{input_tokens:30,output_tokens:22}})}
 });
 assert.ok(options.tools.some(t=>t.name==='save_memory'));
 assert.ok(options.tools.some(t=>t.name==='save_note'));
 assert.doesNotMatch(options.instructions,/cùng là cha mẹ|quan hệ vợ chồng|Minh mèo|Thanh Vịt/);
});

test('read_memories retrieves older owner-scoped facts through pages, GPT continues rather than speaking receipt',async()=>{
 const {sqlite,env,request}=fixture();
 const other='another-owner';
 sqlite.prepare('INSERT INTO v3_users(id,name,created_at) VALUES (?,?,?)').run(other,'Other',Date.now());
 sqlite.prepare('INSERT INTO v3_memories(id,user_id,body,created_at) VALUES(?,?,?,?)').run('foreign',other,'Unrelated owner secret',Date.now());
 for(let i=0;i<65;i++)sqlite.prepare('INSERT INTO v3_memories(id,user_id,body,created_at) VALUES(?,?,?,?)').run('m'+i,sub,'Fact number '+i,Date.now()+i);
 const utterance='Bạn còn nhớ những thông tin tôi đã kể không?';
 const action=buildActionRuntime({request:request(utterance),env,utterance});
 const first=await action.execute('read_memories',{offset:0,utterance_quote:'những thông tin tôi đã kể'});
 assert.equal(first.ok,true,JSON.stringify(first));
 assert.equal(first.continueModel,true);
 assert.equal(first.data.items.length,50);
 assert.equal(first.data.nextOffset,50);
 const second=await action.execute('read_memories',{offset:50,utterance_quote:'những thông tin tôi đã kể'});
 assert.equal(second.ok,true);
 assert.equal(second.data.items.length,15);
 assert.equal(second.data.nextOffset,null);
 assert.ok(!JSON.stringify(first.data).includes('Unrelated owner secret'));
 assert.ok(!JSON.stringify(second.data).includes('Unrelated owner secret'));
});
test('read-only GPT memory retrieval makes a second model call and answers naturally',async()=>{
 const {env,request}=fixture();
 const utterance='Tôi đã kể thông tin gì về dự án?';
 const action=buildActionRuntime({request:request(utterance),env,utterance});
 let count=0;
 const out=await runAgent({apiKey:key,messages:[{role:'user',content:utterance}],actionRuntime:action,
 fetchImpl:async(_url,opts)=>{
  count++;
  const data=JSON.parse(opts.body);
  if(count===1)return toolResponse('read_memories',{offset:0,utterance_quote:'thông tin gì về dự án'});
  assert.ok(data.input.some(x=>x.type==='function_call_output'&&JSON.parse(x.output).ok===true));
  return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Chưa có thông tin dự án đã lưu.'}]}],usage:{input_tokens:80,output_tokens:20}});
 }});
 assert.equal(count,2);
 assert.equal(out.answer,'Chưa có thông tin dự án đã lưu.');
 assert.equal(out.actionStatus,undefined);
});

test('failed D1 receipt overrides any later model claim of success',async()=>{
 const utterance='Tôi muốn lưu ghi nhớ về lịch làm việc';
 let calls=0;
 const result=await runAgent({apiKey:key,messages:[{role:'user',content:utterance}],
  actionRuntime:{tools:[{type:'function',name:'save_memory',description:'Store memory',parameters:{type:'object',properties:{body:{type:'string'},utterance_quote:{type:'string'}},required:['body','utterance_quote'],additionalProperties:false},strict:true}],
    execute:async()=>({ok:false,status:'failed',errorCode:'MEMORY_DB_ERROR',answer:'Ghi nhớ chưa được lưu do D1 báo lỗi.'})},
  fetchImpl:async()=>{
   calls++;
   return calls===1?toolResponse('save_memory',{body:'lịch làm việc',utterance_quote:'lưu ghi nhớ về lịch làm việc'}):
    Response.json({output:[{type:'message',content:[{type:'output_text',text:'Đã ghi nhớ thành công!'}]}],usage:{input_tokens:40,output_tokens:15}});
  }
 });
 assert.equal(calls,2);
 assert.equal(result.actionOk,false);
 assert.equal(result.actionStatus,'failed');
 assert.equal(result.actionErrorCode,'MEMORY_DB_ERROR');
 assert.equal(result.answer,'Ghi nhớ chưa được lưu do D1 báo lỗi.');
 assert.doesNotMatch(result.answer,/Đã ghi nhớ thành công/);
});
