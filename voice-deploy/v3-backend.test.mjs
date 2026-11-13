import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {handleV3,loadV3Context,handleVoiceMemory,memoryIntent} from './v3-backend.js';
const host='https://voice.local.test';
const config='792345678901-test-oauth.apps.googleusercontent.com';
function db(){
 const users=new Map(),profiles=new Map(),memories=new Map(),docs=new Map(),sessions=new Map(),chunks=[];
 return {users,profiles,memories,docs,sessions,chunks,
 async batch(stmts){const out=[];for(const s of stmts)out.push(await s.run());return out},
 prepare(sql){let args=[];return {
  bind(...p){args=p;return this},
  async run(){
   if(sql.startsWith('INSERT INTO v3_sessions')){sessions.set(args[0],{user_id:args[1],expires_at:args[2]});return {meta:{changes:1}}}
   if(sql.startsWith('DELETE FROM v3_sessions')){const deleted=sessions.delete(args[0]);return {meta:{changes:Number(deleted)}}}
   if(sql.startsWith('INSERT INTO v3_users')){users.set(args[0],{id:args[0],name:args[1]});return {success:true}}
   if(sql.startsWith('INSERT INTO v3_profiles')){profiles.set(args[0],{prompt:args[1],revision:1});return {success:true,meta:{changes:1}}}
   if(sql.startsWith('UPDATE v3_profiles')){const p=profiles.get(args[2]);if(!p||p.revision!==args[3])return {meta:{changes:0}};p.prompt=args[0];p.revision++;return {meta:{changes:1}}}
   if(sql.startsWith('INSERT INTO v3_memories')){memories.set(args[0],{id:args[0],user_id:args[1],body:args[2],created_at:args[3]});return {meta:{changes:1}}}
   if(sql.startsWith('UPDATE v3_memories')){const m=memories.get(args[2]);if(m?.user_id!==args[1])return {meta:{changes:0}};m.body=args[0];return {meta:{changes:1}}}
   if(sql.startsWith('DELETE FROM v3_memories')){const m=memories.get(args[1]);if(m?.user_id===args[0]){memories.delete(args[1]);return {meta:{changes:1}}}return {meta:{changes:0}}}
   if(sql.startsWith('INSERT INTO v3_documents')){docs.set(args[0],{id:args[0],user_id:args[1],name:args[2],mime:args[3],segment_count:args[4],created_at:args[5]});return {meta:{changes:1}}}
   if(sql.startsWith('INSERT INTO v3_chunks')){chunks.push({doc_id:args[0],user_id:args[1],segment:args[2],body:args[3]});return {meta:{changes:1}}}
   if(sql.startsWith('DELETE FROM v3_chunks')){let n=0;for(let i=chunks.length-1;i>=0;i--)if(chunks[i].user_id===args[0]&&chunks[i].doc_id===args[1]){chunks.splice(i,1);n++}return {meta:{changes:n}}}
   if(sql.startsWith('DELETE FROM v3_documents')){const v=docs.get(args[1]);if(v?.user_id===args[0])docs.delete(args[1]);return {meta:{changes:1}}}
   throw Error('Unknown run SQL '+sql);
  },
  async first(){
   if(sql.startsWith('SELECT COUNT(*) AS n FROM v3_users'))return {n:users.size};
   if(sql.startsWith('SELECT COUNT(*) AS n FROM v3_sessions'))return {n:sessions.size};
   if(sql.startsWith('SELECT user_id,expires_at FROM v3_sessions'))return sessions.get(args[0])||null;
   if(sql.startsWith('SELECT name FROM v3_users'))return users.get(args[0])||null;
   if(sql.startsWith('SELECT prompt, revision FROM v3_profiles'))return profiles.get(args[0])||null;
   if(sql.startsWith('SELECT prompt FROM v3_profiles'))return profiles.get(args[0])||null;
   if(sql.startsWith('SELECT revision FROM v3_profiles'))return profiles.get(args[0])||null;
   if(sql.startsWith('SELECT id FROM v3_documents')){const d=docs.get(args[1]);return d?.user_id===args[0]?d:null}
   throw Error('Unknown first SQL '+sql);
  },
  async all(){
   if(sql.startsWith('SELECT id,body,created_at FROM v3_memories'))return {results:[...memories.values()].filter(x=>x.user_id===args[0])};
   if(sql.startsWith('SELECT body FROM v3_memories'))return {results:[...memories.values()].filter(x=>x.user_id===args[0])};
   if(sql.startsWith('SELECT id,body FROM v3_memories'))return {results:[...memories.values()].filter(x=>x.user_id===args[0])};
   if(sql.startsWith('SELECT c.body'))return {results:chunks.filter(c=>c.user_id===args[0]).map(c=>({...c,name:docs.get(c.doc_id)?.name||''}))};
   if(sql.startsWith('SELECT id,name,mime'))return {results:[...docs.values()].filter(x=>x.user_id===args[0])};
   throw Error('Unknown all SQL '+sql);
  }
 }}};
}
const r2=()=>{const store=new Map();return {store,async put(k,v){store.set(k,v)},async delete(k){store.delete(k)}}};
const env=()=>({NMH_DB:db(),NMH_DOCS:r2(),NMH_V3_GOOGLE_CLIENT_ID:config});
function req(path,method='GET',body=null,cookie=''){
 const headers={};
 if(method!=='GET'){headers.origin=host;headers['content-type']='application/json'}
 if(cookie)headers.cookie=cookie;
 return new Request(host+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
}
const asBody=async response=>({status:response.status,body:await response.json()});
const b64=s=>Buffer.from(s).toString('base64url');
async function googleToken(sub){
 const kp=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const publicKey=await webcrypto.subtle.exportKey('jwk',kp.publicKey);
 const kid='mockkid';
 publicKey.kid=kid;publicKey.alg='RS256';publicKey.use='sig';
 const header=b64(JSON.stringify({alg:'RS256',kid}));
 const payload=b64(JSON.stringify({sub,name:'Test User',aud:config,iss:'https://accounts.google.com',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)}));
 const body=header+'.'+payload;
 const signature=await webcrypto.subtle.sign({name:'RSASSA-PKCS1-v1_5'},kp.privateKey,new TextEncoder().encode(body));
 return {token:body+'.'+Buffer.from(signature).toString('base64url'),jwks:{keys:[publicKey]},keyPair:kp};
}
test('without D1/R2 or Google web client V3 refuses feature operations without touching voice',async()=>{
 const c=await asBody(await handleV3(req('/api/v3/config'),{}));
 assert.equal(c.body.ready,false);
 const u=await asBody(await handleV3(req('/api/v3/profile'),{}));
 assert.equal(u.status,503);
});
test('memory actions only trigger for intentional voice commands, not every sentence',()=>{
 assert.deepEqual(memoryIntent('Nhớ rằng tôi thích ngắn gọn'),{action:'save',body:'tôi thích ngắn gọn'});
 assert.equal(memoryIntent('Tôi nghe câu nhớ rằng nhưng không yêu cầu'),null);
 assert.deepEqual(memoryIntent('Quên điều tôi thích ngắn gọn'),{action:'erase',query:'tôi thích ngắn gọn'});
 assert.deepEqual(memoryIntent('Sửa ghi nhớ màu xanh thành màu đỏ'),{action:'edit',query:'màu xanh',body:'màu đỏ'});
 assert.equal(memoryIntent('Tối nay ăn gì?'),null);
});
test('fake or missing login is rejected, no client-supplied owner identity is trusted',async()=>{
 const e=env();
 assert.equal((await handleV3(req('/api/v3/profile'),e)).status,401);
 assert.equal((await handleV3(req('/api/v3/profile','PUT',{prompt:'evil',revision:0},'__Host-nmhv3=fake'))).status,503);
 const bad=new Request(host+'/api/v3/memories',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({body:'hello'})});
 assert.equal((await handleV3(bad,e)).status,403);
});
test('real RSA signature, Google audience, owner-scoped D1 profile, document retrieval and explicit memories',async()=>{
 const google=await googleToken('user_123456789');
 const old=globalThis.fetch;
 globalThis.fetch=async url=>{
  assert.match(String(url),/googleapis.com\/oauth2\/v3\/certs/);
  return Response.json(google.jwks);
 };
 try{
  const e=env();
  const login=await handleV3(req('/api/v3/auth/google','POST',{credential:google.token}),e);
  assert.equal(login.status,200);
  const cookie=(login.headers.get('set-cookie')||'').split(';')[0];
  assert.match(cookie,/__Host-nmhv3=/);
  assert.equal(e.NMH_DB.sessions.size,1);
  assert.doesNotMatch(JSON.stringify([...e.NMH_DB.sessions.values()]),/__Host-nmhv3/);
  assert.equal((await asBody(await handleV3(req('/api/v3/me','GET',null,cookie),e))).body.userId,'user_123456789');
  assert.equal((await asBody(await handleV3(req('/api/v3/config'),e))).body.ready,true);
  // Cross-device test: a second browser with the same Google session reads changes and conflicts safely.
  assert.equal((await asBody(await handleV3(req('/api/v3/profile','GET',null,cookie),e))).body.revision,0);
  assert.equal((await asBody(await handleV3(req('/api/v3/profile','PUT',{prompt:'Nói ngắn gọn, có căn cứ',revision:0},cookie),e))).body.revision,1);
  assert.equal((await handleV3(req('/api/v3/profile','PUT',{prompt:'stale edit',revision:0},cookie),e)).status,409);
  const mem=await asBody(await handleV3(req('/api/v3/memories','POST',{body:'Ưu tiên báo cáo ngắn'},cookie),e));
  assert.equal(mem.status,201);
  const edited=await asBody(await handleV3(req('/api/v3/memories/'+mem.body.id,'PUT',{body:'Chỉ báo cáo đúng trọng tâm'},cookie),e));
  assert.equal(edited.status,200);
  const dup=await handleVoiceMemory(req('/api/chat','POST',{},cookie),e,'Nhớ rằng máy chạy 3 ca');
  assert.match(dup.answer,/Đã lưu/);
  const voiceEdit=await handleVoiceMemory(req('/api/chat','POST',{},cookie),e,'Sửa ghi nhớ máy chạy 3 ca thành máy chạy 2 ca');
  assert.match(voiceEdit.answer,/Đã sửa/);
  const doc=await asBody(await handleV3(req('/api/v3/documents','POST',{name:'quytrinh.txt',mime:'text/plain',text:'Lỗi E12: kiểm tra cảm biến áp suất trước khi khởi động lại.'},cookie),e));
  assert.equal(doc.status,201);
  assert.equal(e.NMH_DOCS.store.size,1);
  const context=await loadV3Context(req('/api/chat','POST',{},cookie),e,'Lỗi E12 cần làm gì?');
  assert.equal(context.personalPrompt,'Nói ngắn gọn, có căn cứ');
  assert.ok(context.documents.some(x=>x.name==='quytrinh.txt'));
  // A different Google account cannot see, delete or retrieve user one's records.
  const head=b64(JSON.stringify({alg:'RS256',kid:'mockkid'}));
  const payload=b64(JSON.stringify({sub:'other_123456',name:'Other',aud:config,iss:'https://accounts.google.com',exp:Math.floor(Date.now()/1000)+3600}));
  const material=head+'.'+payload;
  const otherSig=await webcrypto.subtle.sign({name:'RSASSA-PKCS1-v1_5'},google.keyPair.privateKey,new TextEncoder().encode(material));
  const token2=material+'.'+Buffer.from(otherSig).toString('base64url');
  const login2=await handleV3(req('/api/v3/auth/google','POST',{credential:token2}),e);
  assert.equal(login2.status,200);
  const cookie2=(login2.headers.get('set-cookie')||'').split(';')[0];
  assert.deepEqual((await asBody(await handleV3(req('/api/v3/documents','GET',null,cookie2),e))).body.documents,[]);
  assert.deepEqual((await asBody(await handleV3(req('/api/v3/memories','GET',null,cookie2),e))).body.memories,[]);
  assert.equal((await handleV3(req('/api/v3/documents/'+doc.body.id,'DELETE',{},cookie2),e)).status,404);
  assert.deepEqual((await loadV3Context(req('/api/chat','POST',{},cookie2),e,'E12')).documents,[]);
  const del=await handleV3(req('/api/v3/memories/'+mem.body.id,'DELETE',{},cookie),e);
  assert.equal(del.status,200);
  const removed=await handleV3(req('/api/v3/documents/'+doc.body.id,'DELETE',{},cookie),e);
  assert.equal(removed.status,200);assert.equal(e.NMH_DOCS.store.size,0);
  const noSession=await loadV3Context(req('/api/chat'),e,'E12');assert.deepEqual(noSession.documents,[]);
  const logout=await handleV3(req('/api/v3/logout','POST',{},cookie),e);assert.equal(logout.status,200);
  assert.equal(e.NMH_DB.sessions.size,1);
  assert.equal((await handleV3(req('/api/v3/me','GET',null,cookie),e)).status,401);
 }finally{globalThis.fetch=old}
});

test('V3 Setup panel is attached without removing NMH Presence or exposing secrets',async()=>{
 const {default:voice}=await import('./worker.js');
 const r=await voice.fetch(new Request(host+'/'));
 assert.equal(r.status,200);
 const html=await r.text();
 for(const key of ['avatar','start','stop','setupbtn','v3Personal','v3Prompt','v3AddMemory','v3File','v3Upload','v3GoogleBtn','v3SavePrompt'])assert.match(html,new RegExp('id="'+key+'"'),key);
 assert.doesNotMatch(html,/__Host-nmhv3=/);
 assert.doesNotMatch(html,/NMH_V3_SESSION_SECRET/);
 const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.equal(inline.length,2);
 for(const js of inline)new Function(js);
 const configBody=await (await voice.fetch(new Request(host+'/api/v3/config'))).json();
 assert.equal(configBody.ready,false);
 const g=await voice.fetch(new Request(host+'/health'));
 assert.equal((await g.json()).uiVersion,'presence-canvas-v1');
});
