import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {executeReminderAction,handleReminderApi,remindersEnabled,reminderToolSchemas} from './reminders.js';
import {enhanceReminderPage} from './reminders-client.js';
import {runAgent} from './agent-v2.js';
import {matchesCurrentUtterance,buildActionRuntime,memoryToolSchema} from './action-registry.js';
import {loadV3Context} from './v3-backend.js';
import {createHash} from 'node:crypto';

function dbFixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of ['0001_v3.sql','0002_v3_d1_only.sql','0003_memory_v2.sql','0004_reminders.sql'])
  sqlite.exec(readFileSync(new URL('./migrations/'+f,import.meta.url),'utf8'));
 return {sqlite,db:{
  prepare(sql){return {bind(...p){const stmt=sqlite.prepare(sql);return {
   first:async()=>stmt.get(...p)||null,
   all:async()=>({results:stmt.all(...p)}),
   run:async()=>{const ret=stmt.run(...p);return {meta:{changes:Number(ret.changes)}}}
  }}}}
 }};
}
const now=Date.parse('2026-11-14T08:00:00Z'); // 15:00 Viet Nam
const set={text:'uống thuốc',mode:'relative',delay_seconds:120,local_at:'',timezone:'Asia/Ho_Chi_Minh'};
function doAction(db,name,args,opts={}){return executeReminderAction(name,args,{db,sub:'user-A',utterance:'2 phút nữa nhắc tao uống thuốc',now,...opts})}
const req=(path,method='GET',body)=>new Request('https://ngo.example'+path,{method,headers:body?{'origin':'https://ngo.example','content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
const api=(db,path,method='GET',body,sub='user-A')=>handleReminderApi(req(path,method,body),{NMH_DB:db,NMH_REMINDERS_MODE:'active'},async()=>sub);

test('P0 feature flag is OFF by default and does not inject UI',async()=>{
 assert.equal(remindersEnabled({}),false);
 assert.equal(enhanceReminderPage('<body>Voice</body>',{}),'<body>Voice</body>');
 assert.match(enhanceReminderPage('<body>Voice</body>',{NMH_REMINDERS_MODE:'active'}),/nmhReminderToast/);
 assert.deepEqual(reminderToolSchemas.map(x=>x.name),['set_reminder','list_reminders','cancel_reminder']);
 assert.equal((await handleReminderApi(req('/api/reminders'),{},async()=>null)).status,404);
});

test('D1 schema additive; old user, memory and document tables remain',()=>{
 const {sqlite}=dbFixture();
 for(const t of ['v3_users','v3_sessions','v3_profiles','v3_memories','v3_documents','v3_chunks','v3_memory_v2_turns','v3_memory_v2_preferences','nmh_reminders','nmh_reminder_audit']){
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM sqlite_master WHERE type=? AND name=?').get('table',t).n,1,t);
 }
});

test('readback-verified relative reminder; 2 minute delay; repeated command deduplicated',async()=>{
 const {db,sqlite}=dbFixture();
 const a=await doAction(db,'set_reminder',set);
 assert.equal(a.ok,true);assert.equal(a.status,'verified');
 assert.match(a.answer,/Đã đặt nhắc/);
 assert.equal(sqlite.prepare('SELECT due_at_ms AS due FROM nmh_reminders').get().due,now+120000);
 const b=await doAction(db,'set_reminder',set,{now:now+30000});
 assert.equal(b.id,a.id);assert.equal(b.duplicate,true);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM nmh_reminders').get().n,1);
 const log=sqlite.prepare('SELECT action_name,trace_id,phase,ack_status,owner_ref FROM nmh_reminder_audit ORDER BY created_at_ms').all();
 assert.equal(log.length,10);assert.equal(log.filter(x=>x.phase==='ACK_SAVED').length,2);
 assert.equal(log.filter(x=>x.phase==='READBACK_VERIFIED').length,2);
 assert.equal(new Set(log.map(x=>x.trace_id)).size,2);
 assert.ok(log.every(x=>x.action_name==='set_reminder'&&x.owner_ref.length===20));
 assert.ok(log.every(x=>!JSON.stringify(x).includes('thuốc')));
});

test('relative invalid time and expired absolute must fail without writes',async()=>{
 const {db,sqlite}=dbFixture();
 for(const x of [{...set,delay_seconds:0},{...set,timezone:'UTC'},{...set,mode:'absolute',delay_seconds:0,local_at:'2026-11-14T14:59:59'},
  {...set,mode:'absolute',delay_seconds:0,local_at:'2026-02-30T20:00:00'},{...set,text:'x'}, {...set,delay_seconds:2592001}]){
  const r=await doAction(db,'set_reminder',x);assert.equal(r.ok,false);assert.match(r.answer,/^Chưa (?:đặt|hiểu|lưu)/);
 }
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM nmh_reminders').get().n,0);
});

test('absolute Viet Nam time across midnight interpreted in UTC without local system timezone',async()=>{
 const {db,sqlite}=dbFixture();
 const a=await doAction(db,'set_reminder',{text:'họp sáng',mode:'absolute',delay_seconds:0,local_at:'2026-11-15T00:05:00',timezone:'Asia/Ho_Chi_Minh'});
 assert.equal(a.ok,true);
 assert.equal(sqlite.prepare('SELECT due_at_ms AS due FROM nmh_reminders').get().due,Date.parse('2026-11-14T17:05:00Z'));
});

test('listing, cancel by content, cancel not found and cross-user isolation',async()=>{
 const {db,sqlite}=dbFixture();const created=await doAction(db,'set_reminder',set);
 assert.match((await doAction(db,'list_reminders',{status:'pending'})).answer,/uống thuốc/);
 const foreign=await executeReminderAction('list_reminders',{status:'pending'},{db,sub:'user-B',now});
 assert.match(foreign.answer,/không có/);
 const removed=await doAction(db,'cancel_reminder',{query:'uống thuốc'});
 assert.equal(removed.ok,true);assert.equal(removed.id,created.id);
 assert.equal(sqlite.prepare('SELECT status FROM nmh_reminders').get().status,'canceled');
 assert.equal((await doAction(db,'cancel_reminder',{query:'uống thuốc'})).ok,false);
 assert.match((await doAction(db,'list_reminders',{status:'pending'})).answer,/không có/);
});

test('ambiguous cancels are rejected; both reminders preserved',async()=>{
 const {db,sqlite}=dbFixture();
 await doAction(db,'set_reminder',set,{utterance:'nhắc uống thuốc A'});
 await doAction(db,'set_reminder',{...set,text:'uống thuốc B',delay_seconds:240},{utterance:'nhắc uống thuốc B',now:now+1000});
 const x=await doAction(db,'cancel_reminder',{query:'uống thuốc'});
 assert.equal(x.ok,false);assert.equal(x.errorCode,'AMBIGUOUS');
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM nmh_reminders WHERE status='pending'").get().n,2);
});

test('GET due reload, multi-tab atomic claim and owner-scoped notification once',async()=>{
 const {db,sqlite}=dbFixture();const setResult=await doAction(db,'set_reminder',set);
 const time=Date.now;Date.now=()=>now+121000;
 try{
  const first=await api(db,'/api/reminders/due');
  assert.equal(first.status,200);
  assert.equal((await first.json()).reminders[0].id,setResult.id);
  const [r1,r2]=await Promise.all([api(db,'/api/reminders/claim','POST',{id:setResult.id}),api(db,'/api/reminders/claim','POST',{id:setResult.id})]);
  assert.deepEqual([r1.status,r2.status].sort(),[200,409]);
  assert.deepEqual((await (await api(db,'/api/reminders/due')).json()).reminders,[]);
  assert.equal(sqlite.prepare('SELECT status FROM nmh_reminders').get().status,'triggered');
  assert.equal((await api(db,'/api/reminders/claim','POST',{id:setResult.id},'user-B')).status,409);
 }finally{Date.now=time}
});

test('unauthenticated and malformed-origin calls never create or claim',async()=>{
 const {db}=dbFixture();
 assert.equal((await api(db,'/api/reminders','GET',undefined,null)).status,401);
 const r=await handleReminderApi(new Request('https://ngo.example/api/reminders/claim',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'00000000-0000-0000-0000-000000000000'})}),{NMH_DB:db,NMH_REMINDERS_MODE:'active'},async()=> 'user-A');
 assert.equal(r.status,403);
});

test('DB outage and missing audit cannot claim success',async()=>{
 const broken={prepare(){throw Error('D1_OFFLINE')}};
 const res=await doAction(broken,'set_reminder',set);assert.equal(res.ok,false);assert.doesNotMatch(res.answer,/^Đã đặt/);
 assert.equal((await doAction(null,'set_reminder',set)).ok,false);
 assert.equal((await doAction(dbFixture().db,'set_reminder',set,{sub:null})).errorCode,'AUTH');
});

test('GPT tool execution returns only backend receipt, not a model-invented confirmation',async()=>{
 let calls=0;const toolFetch=async(url,opts)=>{
  calls++;const body=JSON.parse(opts.body);
  assert.ok(body.tools.some(x=>x.name==='set_reminder'));
  return new Response(JSON.stringify({output:[{type:'function_call',name:'set_reminder',call_id:'call-1',arguments:JSON.stringify(set)}],usage:{input_tokens:80,output_tokens:20}}),{status:200,headers:{'content-type':'application/json'}});
 };
 let actions=0;
 const r=await runAgent({apiKey:'sk-abcdefghijklmnopqrstuvwxyz123456',messages:[{role:'user',content:'2 phút nữa nhắc tao uống thuốc'}],fetchImpl:toolFetch,actionRuntime:{tools:reminderToolSchemas,execute:async()=>{actions++;return {ok:true,status:'verified',id:'r1',answer:'Đã đặt nhắc sau readback D1.'}}}});
 assert.equal(calls,1);assert.equal(actions,1);assert.equal(r.actionOk,true);assert.equal(r.answer,'Đã đặt nhắc sau readback D1.');
 const err=await runAgent({apiKey:'sk-abcdefghijklmnopqrstuvwxyz123456',messages:[{role:'user',content:'2 phút nữa nhắc tao uống thuốc'}],fetchImpl:toolFetch,actionRuntime:{tools:reminderToolSchemas,execute:async()=>({ok:false,status:'failed',answer:'Chưa đặt: D1 lỗi',errorCode:'DB_ERROR'})}});
 assert.equal(err.actionOk,false);assert.equal(err.answer,'Chưa đặt: D1 lỗi');
});

test('action tools require evidence from the current user turn, never previous conversation',()=>{
 assert.equal(matchesCurrentUtterance({utterance_quote:'nhắc tao uống thuốc'},'2 phút nữa nhắc tao uống thuốc'),true);
 assert.equal(matchesCurrentUtterance({utterance_quote:'nhắc tao uống thuốc'},'Ngày mai trời mưa không?'),false);
 assert.equal(matchesCurrentUtterance({utterance_quote:'nhắc'},'nhắc tao uống thuốc'),false);
 assert.ok(reminderToolSchemas.every(x=>x.parameters.required.includes('utterance_quote')));
});

test('audit retention purges events older than 30 days on next action',async()=>{
 const {db,sqlite}=dbFixture();
 await doAction(db,'set_reminder',set);
 sqlite.prepare('UPDATE nmh_reminder_audit SET created_at_ms=?').run(now-2592000001);
 await doAction(db,'list_reminders',{status:'pending'}, {now:now+1});
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminder_audit WHERE created_at_ms<?').get(now-2592000000).n,0);
});

test('stale tool call is refused and normal current-turn response resumes',async()=>{
 let count=0;
 const mock=async(_url,opts)=>{
  count++;
  if(count===1)return new Response(JSON.stringify({output:[{type:'function_call',name:'set_reminder',call_id:'old',arguments:JSON.stringify(set)}],usage:{input_tokens:2,output_tokens:3}}),{status:200});
  assert.ok(JSON.parse(opts.body).input.some(x=>x.type==='function_call_output'));
  return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Trả lời câu hỏi hiện tại.'}]}],usage:{input_tokens:2,output_tokens:3}}),{status:200});
 };
 const out=await runAgent({apiKey:'unit-test-placeholder',messages:[{role:'user',content:'Câu hỏi thông thường'}],fetchImpl:mock,actionRuntime:{tools:reminderToolSchemas,execute:async()=>({errorCode:'TURN_MISMATCH',answer:'Chưa thực hiện'})}});
 assert.equal(count,2);assert.equal(out.answer,'Trả lời câu hỏi hiện tại.');
});

test('two simultaneous set commands with distinct request IDs create exactly one row',async()=>{
 const {db,sqlite}=dbFixture();
 const [left,right]=await Promise.all([
  doAction(db,'set_reminder',set,{requestId:'request_tab_A_123'}),
  doAction(db,'set_reminder',set,{requestId:'request_tab_B_456'})
 ]);
 assert.equal(left.ok,true);assert.equal(right.ok,true);
 assert.equal(left.id,right.id);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminders').get().n,1);
});

test('natural spoken 7pm tonight is valid without user giving calendar date or ISO seconds',async()=>{
 const {db,sqlite}=dbFixture();
 const utterance='7 giờ tối nay gọi tao dậy xem bóng đá';
 const r=await executeReminderAction('set_reminder',{
  text:'gọi dậy xem bóng đá',mode:'absolute',delay_seconds:0,local_at:'19:00',timezone:'Asia/Ho_Chi_Minh'
 },{db,sub:'user-A',utterance,now});
 assert.equal(r.ok,true);assert.equal(r.status,'verified');
 assert.match(r.answer,/Đã đặt nhắc/);
 const got=sqlite.prepare('SELECT due_at_ms AS due,text FROM nmh_reminders').get();
 assert.equal(got.due,Date.parse('2026-11-14T12:00:00Z'));
 assert.equal(got.text,'gọi dậy xem bóng đá');
});
test('ordinary time formats with / without seconds accepted; past, impossible, and ambiguous rejected',async()=>{
 const {db,sqlite}=dbFixture();
 const next=await doAction(db,'set_reminder',{text:'đi họp',mode:'absolute',delay_seconds:0,local_at:'2026-11-15T08:30',timezone:'Asia/Ho_Chi_Minh'});
 assert.equal(next.ok,true);
 assert.equal(sqlite.prepare("SELECT due_at_ms FROM nmh_reminders WHERE text='đi họp'").get().due_at_ms,Date.parse('2026-11-15T01:30:00Z'));
 const yesterday=await doAction(db,'set_reminder',{...set,mode:'absolute',delay_seconds:0,local_at:'10:00'});
 assert.equal(yesterday.ok,false);
 const impossible=await doAction(db,'set_reminder',{...set,mode:'absolute',delay_seconds:0,local_at:'2026-11-14T25:00'});
 assert.equal(impossible.ok,false);
 const ambiguous=await doAction(db,'set_reminder',{...set,mode:'absolute',delay_seconds:0,local_at:''});
 assert.equal(ambiguous.ok,false);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminders').get().n,1);
});
test('reminder prompt instructs GPT to understand natural time, not demand dates from user',async()=>{
 let instructions='';
 const r=await runAgent({apiKey:'sk-abcdefghijklmnopqrstuvwxyz123456',
  messages:[{role:'user',content:'7 giờ tối nay gọi tao dậy xem bóng đá'}],
  actionRuntime:{tools:reminderToolSchemas,execute:async(name,args)=>{
   assert.equal(name,'set_reminder');
   assert.equal(args.local_at,'19:00');
   return {ok:true,status:'verified',answer:'Đã đặt nhắc lúc 19 giờ tối nay.'};
  }},
  fetchImpl:async(_url,options)=>{
   const body=JSON.parse(options.body);instructions=body.instructions;
   return new Response(JSON.stringify({output:[{type:'function_call',call_id:'call-tonight',name:'set_reminder',
    arguments:JSON.stringify({text:'gọi dậy xem bóng đá',utterance_quote:'gọi tao dậy xem bóng đá',mode:'absolute',
     delay_seconds:0,local_at:'19:00',timezone:'Asia/Ho_Chi_Minh'})}],usage:{input_tokens:100,output_tokens:40}}),{status:200});
  }
 });
 assert.equal(r.actionOk,true);assert.match(r.answer,/Đã đặt nhắc/);
 assert.match(instructions,/không bắt người dùng nói ngày tháng/);
});

test('a Vietnamese personal fact is a memory, never a reminder; Google session scoped D1 readback',async()=>{
 const {db,sqlite}=dbFixture();
 const raw='A'.repeat(43), hash=createHash('sha256').update(raw).digest('hex');
 const subject='google-user-A';
 sqlite.prepare('INSERT INTO v3_users(id,name,created_at) VALUES (?,?,?)').run(subject,'Test User',Date.now());
 sqlite.prepare('INSERT INTO v3_sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(hash,subject,Date.now()+600000,Date.now());
 const utterance='Tao muốn mày ghi nhớ rằng mẹ của Minh mèo tên là Thanh Vịt';
 const request=new Request('https://ngo.example/api/chat',{headers:{cookie:'__Host-nmhv3='+raw}});
 const env={NMH_DB:db,NMH_REMINDERS_MODE:'active',NMH_V3_GOOGLE_CLIENT_ID:'691734271661-abcdef.apps.googleusercontent.com'};
 const action=buildActionRuntime({request,env,utterance,requestId:'mem-unit'});
 assert.ok(action.tools.some(x=>x.name==='save_memory'));
 const saved=await action.execute('save_memory',{body:'Mẹ của Minh mèo tên là Thanh Vịt',utterance_quote:'mẹ của Minh mèo tên là Thanh Vịt'});
 assert.equal(saved.ok,true,JSON.stringify(saved));
 assert.equal(saved.status,'verified');
 const m=sqlite.prepare('SELECT user_id,body FROM v3_memories').all();
 assert.deepEqual(m.map(x=>({user_id:x.user_id,body:x.body})),[{user_id:subject,body:'Mẹ của Minh mèo tên là Thanh Vịt'}]);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM nmh_reminders').get().n,0);
 const forged=await action.execute('save_memory',{body:'Thông tin không được yêu cầu',utterance_quote:'đây không phải lời nói người dùng'});
 assert.equal(forged.ok,false);
 assert.equal(forged.errorCode,'TURN_MISMATCH');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,1);
 const noLogin=buildActionRuntime({request:new Request('https://ngo.example/api/chat'),env,utterance,requestId:'mem-no-login'});
 const denied=await noLogin.execute('save_memory',{body:'Không được lưu',utterance_quote:'mẹ của Minh mèo tên là Thanh Vịt'});
 assert.equal(denied.ok,false);
 assert.equal(denied.errorCode,'AUTH');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM v3_memories').get().n,1);
});
test('natural GPT memory tool is returned as verified storage, never an invalid timed reminder',async()=>{
 let instructions='';
 const out=await runAgent({apiKey:'sk-abcdefghijklmnopqrstuvwxyz123456',
  messages:[{role:'user',content:'Tao muốn mày ghi nhớ rằng mẹ của Minh mèo tên là Thanh Vịt'}],
  actionRuntime:{tools:[...reminderToolSchemas,memoryToolSchema],execute:async(name,args)=>{
   assert.equal(name,'save_memory');
   assert.equal(args.body,'Mẹ của Minh mèo tên là Thanh Vịt');
   return {ok:true,status:'verified',answer:'Đã ghi nhớ: Mẹ của Minh mèo tên là Thanh Vịt'};
  }},
  fetchImpl:async(_url,options)=>{
   const body=JSON.parse(options.body);instructions=body.instructions;
   return new Response(JSON.stringify({output:[{type:'function_call',call_id:'save-1',name:'save_memory',arguments:JSON.stringify({
    body:'Mẹ của Minh mèo tên là Thanh Vịt',utterance_quote:'mẹ của Minh mèo tên là Thanh Vịt'})}],usage:{input_tokens:120,output_tokens:50}}),{status:200});
  }});
 assert.equal(out.actionOk,true);
 assert.match(out.answer,/Đã ghi nhớ/);
 assert.match(instructions,/KHÔNG phải đặt lời nhắc/);
});
test('wrong reminder time routes tool feedback back to GPT to recover as memory',async()=>{
 const memoryMessage='Ghi nhớ rằng mẹ của Minh mèo tên là Thanh Vịt';
 let round=0;
 const out=await runAgent({apiKey:'sk-abcdefghijklmnopqrstuvwxyz123456',
  messages:[{role:'user',content:memoryMessage}],
  actionRuntime:{tools:[...reminderToolSchemas,memoryToolSchema],execute:async(name,args)=>{
   if(name==='set_reminder')return {ok:false,status:'failed',errorCode:'TIME',answer:'Chưa đặt: khoảng thời gian chưa hợp lệ'};
   assert.equal(name,'save_memory');
   return {ok:true,status:'verified',answer:'Đã ghi nhớ: Mẹ của Minh mèo tên là Thanh Vịt'};
  }},
  fetchImpl:async(_url,options)=>{
   round++;
   const body=JSON.parse(options.body);
   if(round===1)return new Response(JSON.stringify({output:[{type:'function_call',call_id:'bad1',name:'set_reminder',arguments:JSON.stringify({
    text:'Mẹ của Minh mèo tên là Thanh Vịt',utterance_quote:'mẹ của Minh mèo tên là Thanh Vịt',
    mode:'relative',delay_seconds:0,local_at:'',timezone:'Asia/Ho_Chi_Minh'})}],usage:{input_tokens:30,output_tokens:25}}),{status:200});
   assert.ok(body.input.some(x=>x.type==='function_call_output'&&JSON.parse(x.output).error==='TIME'));
   return new Response(JSON.stringify({output:[{type:'function_call',call_id:'mem2',name:'save_memory',arguments:JSON.stringify({
    body:'Mẹ của Minh mèo tên là Thanh Vịt',utterance_quote:'mẹ của Minh mèo tên là Thanh Vịt'})}],usage:{input_tokens:20,output_tokens:20}}),{status:200});
  }});
 assert.equal(round,2);
 assert.equal(out.actionOk,true);
 assert.match(out.answer,/Đã ghi nhớ/);
 assert.doesNotMatch(out.answer,/khoảng thời gian/);
});

test('generic relational two-hop recall connects a mother with a child and the speaker, not assumed marriage',async()=>{
 const {db,sqlite}=dbFixture();
 const raw='B'.repeat(43), hash=createHash('sha256').update(raw).digest('hex'),sub='owner-parent';
 sqlite.prepare('INSERT INTO v3_users(id,name,created_at) VALUES (?,?,?)').run(sub,'Owner',Date.now());
 sqlite.prepare('INSERT INTO v3_sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(hash,sub,Date.now()+600000,Date.now());
 // Several direct matches crowd the top rank, but the child's relation shares the bridge entity.
 const facts=[
   'Thanh Vịt thích trồng cây.',
   'Thanh Vịt uống trà buổi sáng.',
   'Thanh Vịt hay đi bộ cuối tuần.',
   'Thanh Vịt là mẹ của Minh mèo.',
   'Minh mèo là con của tao.'
 ];
 facts.forEach((body,i)=>sqlite.prepare('INSERT INTO v3_memories(id,user_id,body,created_at) VALUES(?,?,?,?)').run('mem'+i,sub,body,1000+i));
 const req=new Request('https://ngo.example/api/chat',{headers:{cookie:'__Host-nmhv3='+raw}});
 const env={NMH_DB:db,NMH_V3_GOOGLE_CLIENT_ID:'691734271661-abcdef.apps.googleusercontent.com'};
 const got=await loadV3Context(req,env,'Thanh Vịt có quan hệ gì với tao?');
 assert.equal(got.contextError,undefined);
 assert.ok(got.memories.includes('Thanh Vịt là mẹ của Minh mèo.'));
 assert.ok(got.memories.includes('Minh mèo là con của tao.'));
 // Other user memory is never leaked into the subject's context.
 sqlite.prepare('INSERT INTO v3_memories(id,user_id,body,created_at) VALUES(?,?,?,?)').run('foreign','other-user','Thông tin người dùng khác',Date.now());
 const after=await loadV3Context(req,env,'Thanh Vịt là ai?');
 assert.ok(!after.memories.includes('Thông tin người dùng khác'));
});
