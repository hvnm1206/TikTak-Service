import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleVoiceNote,noteIntent,handleV3} from './v3-backend.js';
const origin='https://voice.local.test',sub='account_test01',raw='a'.repeat(43);
const hash=createHash('sha256').update(raw).digest('hex');
const env=()=>{
 const documents=new Map(),chunks=new Map(),sessions=new Map([[hash,{user_id:sub,expires_at:Date.now()+600000}]]);
 let writes=0;
 const db={documents,chunks,sessions,get writes(){return writes},
  prepare(sql){let args=[];return{
   bind(...values){args=values;return this},
   async first(){
    if(sql.startsWith('SELECT user_id,expires_at FROM v3_sessions'))return sessions.get(args[0])||null;
    if(sql.startsWith('SELECT id,raw_text,segment_count FROM v3_documents'))return [...documents.values()].find(d=>d.user_id===args[0]&&(sql.includes('AND name=?')?d.name===args[1]:d.id===args[1]))||null;
    if(sql.startsWith('SELECT body FROM v3_chunks'))return chunks.get(args[1]+'|'+args[2])||null;
    return null;
   },
   async all(){
    if(sql.startsWith('SELECT id,name,mime,created_at,segment_count FROM v3_documents'))
      return {results:[...documents.values()].filter(x=>x.user_id===args[0])};
    return {results:[]};
   },
   async run(){
    writes++;
    if(sql.startsWith('INSERT INTO v3_documents')){documents.set(args[0],{id:args[0],user_id:args[1],name:args[2],mime:args[3],segment_count:args[4],created_at:args[5],raw_text:args[6]});return {meta:{changes:1}}}
    if(sql.startsWith('INSERT INTO v3_chunks')){const key=args[0]+'|'+args[2];if(chunks.has(key))throw Error('duplicate segment');chunks.set(key,{doc_id:args[0],user_id:args[1],segment:args[2],body:args[3]});return {meta:{changes:1}}}
    if(sql.startsWith('UPDATE v3_documents')){const d=documents.get(args[2]);if(!d||d.user_id!==args[3]||d.segment_count!==args[4])return {meta:{changes:0}};d.raw_text=args[0];d.segment_count=args[1];return {meta:{changes:1}}}
    throw Error('Unexpected write SQL '+sql);
   }
  }},
  async batch(statements){const out=[];for(const s of statements)out.push(await s.run());return out}
 };
 return {NMH_DB:db,NMH_V3_GOOGLE_CLIENT_ID:'792345678901-test-oauth.apps.googleusercontent.com'};
};
const req=(authenticated=true)=>new Request(origin+'/api/chat',{headers:authenticated?{cookie:'__Host-nmhv3='+raw}:{}});
test('recognizes explicit natural voice instructions and ignores ordinary discussion',()=>{
 for(const q of ['Ghi vào file ghi chú mua bóng đèn ngày mai','Ghi chú rằng cần gọi anh Nam','Thêm vào ghi chú kiểm tra máy bơm','Ngố ghi lại cho tao ngày mai kiểm tra thiết bị','Ngố, ghi lại cho tao ngày mai kiểm tra thiết bị','Ghi lại ngày mai phải gọi Nam','Ghi chú: ngày mai gặp Nam','Lưu vào ghi chú ngày mai đi khám','Ghi chú lại là tuần tới đi công tác']){
  assert.equal(noteIntent(q)?.action,'append',q);
 }
 assert.deepEqual(noteIntent('Đọc file ghi chú'),{action:'read'});
 for(const q of ['Hôm nay có gì mới?','Tôi nghe người ta nói về ghi chú','Hãy tìm quán bia'])assert.equal(noteIntent(q),null,q);
});
test('explicit note commands append to a single per-user Markdown file and are readable as documents',async()=>{
 const e=env();
 assert.equal(await handleVoiceNote(req(),e,'Xin chào'),null);
 assert.equal(e.NMH_DB.writes,0);
 let r=await handleVoiceNote(req(),e,'Ghi vào file ghi chú mua bóng đèn ngày mai');
 assert.equal(r.answer,'Đã ghi và kiểm tra trong GHI_CHU.md, mục 1.');
 assert.equal(r.saved,true);
 assert.equal(r.noteSegment,1);
 assert.deepEqual(r.tools,['save_note']);
 r=await handleVoiceNote(req(),e,'Thêm vào ghi chú kiểm tra máy bơm');
 assert.equal(r.answer,'Đã ghi và kiểm tra trong GHI_CHU.md, mục 2.');
 assert.equal(e.NMH_DB.documents.size,1);
 const doc=[...e.NMH_DB.documents.values()][0];
 assert.equal(doc.name,'GHI_CHU.md');
 assert.equal(doc.raw_text,'mua bóng đèn ngày mai\nkiểm tra máy bơm');
 assert.equal(doc.segment_count,2);
 const result=await handleV3(new Request(origin+'/api/v3/documents',{headers:{cookie:'__Host-nmhv3='+raw}}),e);
 assert.equal(result.status,200);
 const list=await result.json();
 assert.equal(list.documents.length,1);
 assert.equal(list.documents[0].name,'GHI_CHU.md');
 const read=await handleVoiceNote(req(),e,'Đọc file ghi chú');
 assert.match(read.answer,/mua bóng đèn ngày mai/);
 assert.match(read.answer,/kiểm tra máy bơm/);
});
test('no cookie cannot read or write private notes, and failure must not report success',async()=>{
 const e=env();
 const denied=await handleVoiceNote(req(false),e,'Ghi vào file ghi chú bí mật');
 assert.match(denied.answer,/Chưa lưu/);
 assert.equal(e.NMH_DB.documents.size,0);
 const deniedRead=await handleVoiceNote(req(false),e,'Đọc file ghi chú');
 assert.match(deniedRead.answer,/đăng nhập Google/);
 const invalid=await handleVoiceNote(req(),e,'Ghi vào file ghi chú '+ 'A'.repeat(501));
 assert.match(invalid.answer,/Chưa lưu/);
});

test('never claims saved when D1 write returns success but subsequent read is missing',async()=>{
 const e=env();
 const first=e.NMH_DB.prepare.bind(e.NMH_DB);
 e.NMH_DB.prepare=(sql)=>{
   const statement=first(sql);
   if(sql.startsWith('SELECT body FROM v3_chunks'))statement.first=async()=>null;
   return statement;
 };
 const r=await handleVoiceNote(req(),e,'Ghi vào file ghi chú kiểm tra chứng từ');
 assert.match(r.answer,/chưa xác minh được/i);
 assert.ok(!r.saved);
 assert.ok(!r.tools.includes('save_note'));
});
