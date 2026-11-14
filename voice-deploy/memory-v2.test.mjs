import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProposal,analyzeMemory,saveMemoryOps,runMemoryV2,memoryMode} from './memory-v2.js';
const id1='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
const old=[{id:id1,body:'Người dùng nuôi chó tên Mít'},{id:id2,body:'Người dùng thích chạy bộ'}];
const add=(body,evidence,confidence=.99)=>({type:'add',body,evidence,confidence});
const mod=(id,body,evidence)=>({type:'update',id,body,evidence,confidence:.99});
const del=(id,evidence)=>({type:'delete',id,evidence,confidence:.99});
const result=ops=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({ops})}]}],usage:{input_tokens:40,output_tokens:30}})});
function memoryDB(initial=[]){
 const memories=new Map(initial.map(x=>[x.id,{...x}])),ledger=new Set();
 let writes=0;
 const db={
  get writes(){return writes},memories,ledger,
  prepare(sql){
   return {bind(...args){
    return {
     async first(){
      if(sql.startsWith('SELECT turn_id'))return ledger.has(args[0]+'|'+args[1])?{turn_id:args[1]}:null;
      if(sql.startsWith('SELECT body')){const x=memories.get(args[1]);return x&&x.user_id===args[0]?{body:x.body}:null}
      throw Error('unhandled first '+sql);
     },
     async all(){
      if(sql.startsWith('SELECT id,body'))return {results:[...memories.values()].filter(x=>x.user_id===args[0]).map(x=>({id:x.id,body:x.body}))};
      throw Error('unhandled all '+sql);
     },
     _sql:sql,_args:args
    }
   }}
  },
  async batch(statements){
   // Atomic mock: copy first, only commit if every operation valid.
   const nextM=new Map(memories),nextL=new Set(ledger),outputs=[];
   for(const stmt of statements){
    const sql=stmt._sql,a=stmt._args;let changes=0;
    if(sql.startsWith('INSERT INTO v3_memory_v2_turns')){
     const key=a[0]+'|'+a[1];if(nextL.has(key))throw Error('duplicate');nextL.add(key);changes=1;
    }else if(sql.startsWith('INSERT INTO v3_memories')){
     if(nextM.has(a[0]))throw Error('duplicate memory');nextM.set(a[0],{id:a[0],user_id:a[1],body:a[2]});changes=1;
    }else if(sql.startsWith('UPDATE v3_memories')){
     const row=nextM.get(a[1]);if(row?.user_id===a[2]&&row.body===a[3]){row.body=a[0];changes=1}
    }else if(sql.startsWith('DELETE FROM v3_memories')){
     const row=nextM.get(a[0]);if(row?.user_id===a[1]&&row.body===a[2]){nextM.delete(a[0]);changes=1}
    }else throw Error('unhandled batch '+sql);
    outputs.push({meta:{changes}});
   }
   // Even 0-change conflicts are reported by D1 after a committed batch.
   for(const [k,v] of nextM)memories.set(k,v);
   for(const k of memories.keys())if(!nextM.has(k))memories.delete(k);
   for(const k of nextL)ledger.add(k);
   writes+=statements.length;
   return outputs;
  }
 };
 return db;
}
test('off by default including unknown mode',()=>{
 assert.equal(memoryMode({}),'off');
 assert.equal(memoryMode({NMH_MEMORY_V2_MODE:'on'}),'off');
 assert.equal(memoryMode({NMH_MEMORY_V2_MODE:'shadow'}),'shadow');
});
test('allow durable fact with verbatim quote and reject invention, transient and secret',()=>{
 const x=validateProposal({ops:[add('Người dùng có con chó tên Mít','Con chó của tao tên Mít')]},[], 'Con chó của tao tên Mít');
 assert.equal(x.accepted.length,1);
 assert.equal(validateProposal({ops:[add('Người dùng là tỷ phú','tỷ phú')]},[],'Hôm nay nắng').accepted.length,0);
 assert.equal(validateProposal({ops:[add('API key là sk-secret','API key của tôi là sk-secret')]},[],'API key của tôi là sk-secret').accepted.length,0);
 assert.equal(validateProposal({ops:[add('Người dùng thích chạy bộ','thích chạy bộ')]},old,'Tôi thích chạy bộ').accepted.length,0);
});
test('delete cannot be inferred by model, needs explicit user forget cue and known id',()=>{
 assert.equal(validateProposal({ops:[del(id1,'chó tên Mít')]},old,'Tao có chó tên Mít').accepted.length,0);
 assert.equal(validateProposal({ops:[del(id1,'Quên con chó tên Mít')]},old,'Quên con chó tên Mít đi').accepted.length,1);
 assert.equal(validateProposal({ops:[del(id2,'Quên con chó tên Mít')]},old,'Quên con chó tên Mít đi').accepted.length,0,'wrong memory ID must not be deleted');
 assert.equal(validateProposal({ops:[del('33333333-3333-4333-8333-333333333333','Quên con chó tên Mít')]},old,'Quên con chó tên Mít đi').accepted.length,0);
});
test('update requires explicit correction, preserves immutable original until commit',()=>{
 assert.equal(validateProposal({ops:[mod(id1,'Người dùng nuôi chó tên Bông','chó tên Bông')]},old,'Con chó tên Bông').accepted.length,0);
 const r=validateProposal({ops:[mod(id1,'Người dùng nuôi chó tên Bông','Từ nay chó Mít đổi thành Bông')]},old,'Từ nay chó Mít đổi thành Bông');
 assert.equal(r.accepted[0].oldBody,'Người dùng nuôi chó tên Mít');
 assert.equal(validateProposal({ops:[mod(id1,'Người dùng nuôi chó tên Bông','Từ nay chó tên Bông')]},old,'Từ nay chó tên Bông').accepted.length,0,'ambiguous correction cannot auto-overwrite');
});
test('analysis uses a dedicated JSON-only non-stored model call, not web_search or voice tools',async()=>{
 let options;
 const out=await analyzeMemory({apiKey:'sk-'+'a'.repeat(42),existing:[],userText:'Con chó tao tên Mít',fetchImpl:async(_,o)=>{options=JSON.parse(o.body);return result([add('Người dùng có chó tên Mít','Con chó tao tên Mít')])}});
 assert.equal(out.ops.length,1);assert.equal(options.store,false);
 assert.equal(options.text.format.type,'json_schema');
 assert.equal(options.text.format.strict,true);
 assert.deepEqual(options.text.format.schema.required,['ops']);
 assert.ok(!options.tools);
});
test('shadow analyzes but performs zero D1 writes, and off makes zero GPT calls',async()=>{
 const db=memoryDB();let calls=0;
 const args={db,sub:'user123',apiKey:'sk-'+'a'.repeat(42),userText:'Con chó tao tên Mít',assistantText:'OK',fetchImpl:async()=>{calls++;return result([add('Người dùng có chó tên Mít','Con chó tao tên Mít')])}};
 assert.equal((await runMemoryV2({...args,mode:'shadow'})).status,'shadow');
 assert.equal(db.writes,0);
 assert.equal((await runMemoryV2({...args,mode:'off'})).status,'off');
 assert.equal(calls,1);
});
test('real write model: add, verify, duplicate idempotency, owner isolation',async()=>{
 const db=memoryDB([{id:id1,user_id:'other01',body:'Ghi nhớ riêng người khác'}]);
 const args={db,sub:'user123',apiKey:'sk-'+'a'.repeat(42),userText:'Con chó tao tên Mít',assistantText:'Tôi đã nghe',makeId:()=>id2,fetchImpl:async()=>result([add('Người dùng có chó tên Mít','Con chó tao tên Mít')])};
 const one=await runMemoryV2({...args,mode:'active'});assert.equal(one.status,'saved');
 assert.equal(db.memories.get(id2).user_id,'user123');
 assert.equal(db.memories.get(id1).body,'Ghi nhớ riêng người khác');
 assert.equal((await runMemoryV2({...args,mode:'active'})).status,'duplicate');
 assert.equal(db.memories.size,2);
});
test('update and explicit delete only modify same-owner known record, verify by readback',async()=>{
 const db=memoryDB([{id:id1,user_id:'user123',body:'Người dùng nuôi chó tên Mít'},{id:id2,user_id:'other01',body:'Thông tin người khác'}]);
 let r=await saveMemoryOps({db,sub:'user123',userText:'Từ nay chó tên Bông',assistantText:'Đã hiểu',ops:[{type:'update',id:id1,oldBody:'Người dùng nuôi chó tên Mít',body:'Người dùng nuôi chó tên Bông'}]});
 assert.equal(r.status,'saved');assert.equal(db.memories.get(id1).body,'Người dùng nuôi chó tên Bông');
 r=await saveMemoryOps({db,sub:'user123',userText:'Quên tên chó đi',assistantText:'OK',ops:[{type:'delete',id:id1,oldBody:'Người dùng nuôi chó tên Bông'}]});
 assert.equal(r.status,'saved');assert.equal(db.memories.has(id1),false);
 assert.equal(db.memories.get(id2).body,'Thông tin người khác');
});
test('conditional update refuses stale changed data instead of overwriting',async()=>{
 const db=memoryDB([{id:id1,user_id:'user123',body:'Dữ liệu vừa cập nhật'}]);
 const r=await saveMemoryOps({db,sub:'user123',userText:'Từ nay đổi',assistantText:'OK',ops:[{type:'update',id:id1,oldBody:'Dữ liệu cũ',body:'Dữ liệu mới'}]});
 assert.equal(r.status,'conflict');assert.equal(db.memories.get(id1).body,'Dữ liệu vừa cập nhật');
});
test('fifty unrelated turns do not write when analyst returns no operations',async()=>{
 const db=memoryDB();
 for(let i=0;i<50;i++){
  const r=await runMemoryV2({mode:'active',sub:'user123',db,apiKey:'sk-'+'a'.repeat(42),userText:'Hôm nay là ngày bao nhiêu? '+i,assistantText:'Trả lời.',fetchImpl:async()=>result([])});
  assert.equal(r.status,'no-change');
 }
 assert.equal(db.writes,0);
});
test('model error and malformed JSON fail before any write',async()=>{
 const db=memoryDB();
 await assert.rejects(()=>runMemoryV2({mode:'active',sub:'user123',db,apiKey:'sk-'+'a'.repeat(42),userText:'Tên chó là Mít',assistantText:'OK',fetchImpl:async()=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'wrong'}]}]})})}));
 assert.equal(db.writes,0);
});
