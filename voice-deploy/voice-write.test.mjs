import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {isWriteCommand,classifyWriteCommand,routeVoiceWrite} from './voice-write.js';
import worker from './worker.js';
const base='https://voice.local.test',key='sk-'+'a'.repeat(43);
const fixture=(intent,content)=>async()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({intent,content})}]}]});
const cookie=randomBytes(32).toString('base64url');
const hash=createHash('sha256').update(cookie).digest('hex');
function dbMock(){
 const memories=new Map(),documents=new Map(),chunks=new Map();
 let writes=0;
 const db={
  get writes(){return writes},
  memories,documents,
  prepare(sql){
   return{bind(...args){return{
    sql,args,
    async first(){
     if(sql.startsWith('SELECT user_id,expires_at FROM v3_sessions'))return args[0]===hash?{user_id:'user_voice_123456',expires_at:Date.now()+200000}:null;
     if(sql.startsWith('SELECT body FROM v3_memories WHERE user_id=? AND id=?')){
      const m=memories.get(args[1]);return m?.user_id===args[0]?{body:m.body}:null;
     }
     if(sql.startsWith('SELECT id,raw_text,segment_count FROM v3_documents')){
      return [...documents.values()].find(x=>x.user_id===args[0]&&x.name===args[1])||null;
     }
     if(sql.startsWith('SELECT raw_text,segment_count FROM v3_documents')){
      const d=documents.get(args[1]);return d?.user_id===args[0]?{raw_text:d.raw_text,segment_count:d.segment_count}:null;
     }
     if(sql.startsWith('SELECT body FROM v3_chunks')){
      return {body:chunks.get(args[1]+'|'+args[2])};
     }
     return null;
    },
    async run(){
     if(sql.startsWith('INSERT INTO v3_memories')){
      writes++;memories.set(args[0],{user_id:args[1],body:args[2]});return {meta:{changes:1}};
     }
     throw Error('Unexpected run '+sql);
    }
   }}}
  },
  async batch(ops){
   writes+=ops.length;
   for(const op of ops){
    const {sql,args:a}=op;
    if(sql.startsWith('INSERT INTO v3_documents')){
     documents.set(a[0],{id:a[0],user_id:a[1],name:a[2],segment_count:a[4],raw_text:a[6]});
    }else if(sql.startsWith('INSERT INTO v3_chunks')){
     chunks.set(a[0]+'|'+a[2],a[3]);
    }else if(sql.startsWith('UPDATE v3_documents SET raw_text')){
     const doc=documents.get(a[1]);doc.raw_text+=a[0];doc.segment_count++;
    }else if(sql.startsWith('INSERT INTO v3_chunks (doc_id,user_id,segment,body) SELECT')){
     const doc=documents.get(a[1]);chunks.set(doc.id+'|'+doc.segment_count,a[0]);
    }else throw Error('Unexpected batch '+sql);
   }
   return ops.map(()=>({meta:{changes:1}}));
  }
 };
 return db;
}
const req=(text,authenticated=true)=>new Request(base+'/api/chat',{method:'POST',headers:{origin:base,'content-type':'application/json',...(authenticated?{cookie:'__Host-nmhv3='+cookie}:{})},body:JSON.stringify({apiKey:key,messages:[{role:'user',content:text}],style:'nghiem_tuc'})});
const env=db=>({NMH_DB:db,NMH_V3_GOOGLE_CLIENT_ID:'1234567890-voice-test.apps.googleusercontent.com',NMH_MEMORY_V2_MODE:'off'});
test('natural commands are recognized after vocatives, informational questions are not',()=>{
 for(const v of ['Ê Ngáo, mày chép giúp tao: mai kiểm tra máy bơm','Em lưu hộ anh việc này','Ghi vào sổ ghi chú mai gọi điện','Hãy ghi lại việc này','Ngáo, nhớ cho tôi chuyện này'])assert.equal(isWriteCommand(v),true,v);
 for(const v of ['Tại sao GPT không có công cụ ghi nhớ?','Cách ghi chú trên iPhone như thế nào?','Hôm nay trời thế nào?'])assert.equal(isWriteCommand(v),false,v);
});
test('structured classifier does not expose any tools or web search',async()=>{
 const text='Ê Ngáo, mày chép giúp tao: mai kiểm tra máy bơm';
 let requestBody;
 const r=await classifyWriteCommand(text,key,{fetchImpl:async(_,o)=>{requestBody=JSON.parse(o.body);return fixture('note','mai kiểm tra máy bơm')()}});
 assert.deepEqual(r,{intent:'note',content:'mai kiểm tra máy bơm'});
 assert.equal(requestBody.store,false);
 assert.equal(requestBody.tools,undefined);
 assert.equal(requestBody.text.format.type,'json_schema');
});
test('model cannot invent content not in user speech',async()=>{
 const r=await classifyWriteCommand('Mày lưu giúp tao ngày mai họp',key,{fetchImpl:fixture('note','ngày mai đi du lịch')});
 assert.equal(r.intent,'missing');
});
test('natural note intent synchronously writes and returns verified D1 success',async()=>{
 const db=dbMock();
 const result=await routeVoiceWrite(req('Ê Ngáo, mày chép giúp tao: mai kiểm tra máy bơm'),env(db),'Ê Ngáo, mày chép giúp tao: mai kiểm tra máy bơm',key,{fetchImpl:fixture('note','mai kiểm tra máy bơm')});
 assert.equal(result.saved,true);
 assert.equal(result.saveStatus,'saved');
 assert.match(result.answer,/Đã ghi và kiểm tra/);
 assert.equal(db.documents.size,1);
 assert.equal([...db.documents.values()][0].segment_count,1);
});
test('natural memory directive returns verified save acknowledgement',async()=>{
 const db=dbMock();
 const result=await routeVoiceWrite(req('Ngáo, nhớ cho tao con chó tên Bông'),env(db),'Ngáo, nhớ cho tao con chó tên Bông',key,{fetchImpl:fixture('memory','con chó tên Bông')});
 assert.equal(result.saved,true);
 assert.equal(result.saveStatus,'saved');
 assert.equal([...db.memories.values()][0].body,'con chó tên Bông');
});
test('unauthenticated note never claims save',async()=>{
 const db=dbMock(),text='Mày chép giúp tao mai kiểm tra máy bơm';
 const result=await routeVoiceWrite(req(text,false),env(db),text,key,{fetchImpl:fixture('note','mai kiểm tra máy bơm')});
 assert.equal(result.saved,false);
 assert.equal(result.saveStatus,'failed');
 assert.match(result.answer,/đăng nhập Google/);
 assert.equal(db.writes,0);
});
test('API errors and missing content return spoken not-saved status instead of no tool',async()=>{
 const db=dbMock(),text='Mày ghi hộ tao cái này';
 const err=await routeVoiceWrite(req(text),env(db),text,key,{fetchImpl:async()=>new Response('{}',{status:429})});
 assert.equal(err.saved,false);
 assert.match(err.answer,/Chưa lưu/);
 assert.equal(err.saveStatus,'failed');
 const missing=await routeVoiceWrite(req(text),env(db),text,key,{fetchImpl:fixture('missing','')});
 assert.equal(missing.saved,false);
 assert.equal(db.writes,0);
});
test('worker actually bypasses ordinary GPT agent and speaks verified result for natural write command',async()=>{
 const db=dbMock(),text='Ê Ngáo, mày chép giúp tao: mai kiểm tra máy bơm';
 const original=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async(_url,_options)=>{calls++;return fixture('note','mai kiểm tra máy bơm')()};
 try{
  const response=await worker.fetch(req(text),env(db));
  assert.equal(response.status,200);
  const reply=await response.json();
  assert.equal(reply.saved,true);
  assert.equal(reply.saveStatus,'saved');
  assert.match(reply.answer,/Đã ghi/);
  assert.equal(calls,1,'only dedicated write classifier, no chatbot call');
 }finally{globalThis.fetch=original}
});
