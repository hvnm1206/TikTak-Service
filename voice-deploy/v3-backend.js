// NMH Voice V3: authenticated, explicitly controlled per-user sync.
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
const fail=(message,status=400)=>json({error:message},status);
const maxText=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const id=()=>crypto.randomUUID();
const googleCerts='https://www.googleapis.com/oauth2/v3/certs';
const enc=new TextEncoder();
const dec=new TextDecoder('utf-8',{fatal:true});
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const un64=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((String(s).length+3)%4)),c=>c.charCodeAt(0));
let jwksCache=null;
let jwksTime=0;
function productionReady(env){return !!(env?.NMH_DB&&validClientId(env))}
function validClientId(env){const s=String(env?.NMH_V3_GOOGLE_CLIENT_ID||'');return /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(s)?s:''}
async function sessionHash(raw){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(raw)));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function createSession(subject,env){
 const raw=b64url(crypto.getRandomValues(new Uint8Array(32)));
 const hash=await sessionHash(raw);
 const expiry=Date.now()+7*86400000;
 await env.NMH_DB.prepare('INSERT INTO v3_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(hash,subject,expiry,Date.now()).run();
 return raw;
}
async function readSessionCookie(req){
 const m=(req.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-nmhv3=([^;\s]+)/);
 const value=m?.[1]||'';
 return /^[A-Za-z0-9_-]{42,44}$/.test(value)?value:null;
}
async function sessionSubject(req,env){
 if(!env?.NMH_DB)return null;
 const raw=await readSessionCookie(req);if(!raw)return null;
 const hash=await sessionHash(raw);
 try{
  const session=await env.NMH_DB.prepare('SELECT user_id,expires_at FROM v3_sessions WHERE token_hash=?').bind(hash).first();
  return session&&session.expires_at>Date.now()?session.user_id:null;
 }catch{return null}
}
// Read-only session identity for opt-in Memory V2. No bypass of existing Google-cookie auth.
export async function memoryV2Subject(req,env){
 if(!productionReady(env))return null;
 return sessionSubject(req,env);
}
async function verifiedGoogleIdentity(jwt,client,fetchImpl=fetch){
 if(typeof jwt!=='string'||jwt.length>12000)throw Error('Google token không hợp lệ');
 const parts=jwt.split('.');if(parts.length!==3)throw Error('Google token không hợp lệ');
 let head,payload;
 try{head=JSON.parse(dec.decode(un64(parts[0])));payload=JSON.parse(dec.decode(un64(parts[1])))}catch{throw Error('Google token không hợp lệ')}
 if(head.alg!=='RS256'||!head.kid||payload.aud!==client||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss)||!Number.isFinite(payload.exp)||payload.exp<=Date.now()/1000||payload.exp>Date.now()/1000+7200||typeof payload.sub!=='string'||!/^[A-Za-z0-9_-]{6,200}$/.test(payload.sub))throw Error('Google ID token bị từ chối');
 if(!jwksCache||Date.now()>jwksTime){
  const r=await fetchImpl(googleCerts,{headers:{accept:'application/json'}});
  if(!r.ok)throw Error('Không kiểm tra được chữ ký Google');
  const data=await r.json();
  if(!Array.isArray(data.keys))throw Error('Chứng thư Google không hợp lệ');
  jwksCache=data.keys;jwksTime=Date.now()+Math.min(3600000,300000);
 }
 const jwk=jwksCache.find(k=>k.kid===head.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig');
 if(!jwk)throw Error('Không tìm thấy khóa ký Google');
 const pub=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const ok=await crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5'},pub,un64(parts[2]),enc.encode(parts[0]+'.'+parts[1]));
 if(!ok)throw Error('Chữ ký Google không hợp lệ');
 return {sub:payload.sub,name:maxText(payload.name,100),email:maxText(payload.email,200)};
}
async function readJson(req,max=16000){
 const text=await req.text();
 if(text.length>max)throw Error('Dữ liệu quá lớn');
 try{return JSON.parse(text)}catch{throw Error('JSON không hợp lệ')}
}
function originAllowed(req,url){
 return req.headers.get('origin')===url.origin&&!!req.headers.get('content-type')?.includes('application/json');
}
const cookie=(value,ttl)=>'__Host-nmhv3='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+ttl;
async function ensureAuth(req,env){
 const sub=await sessionSubject(req,env);
 if(!sub)return {error:fail('Cần đăng nhập Google để đồng bộ',401)};
 return {sub};
}
function extractTerms(text){
 const ignore=new Set(['và','của','là','có','được','cho','này','một','những','với','không','trong','theo','hay','mình','tôi','anh','tao','mày','đâu','nào','thế']);
 return [...new Set(String(text).toLocaleLowerCase('vi').normalize('NFKC').match(/[\p{L}\p{N}]{2,}/gu)||[])].filter(t=>!ignore.has(t)).slice(0,20);
}
function scoreSegment(query,text){
 const q=extractTerms(query),tokens=new Set(extractTerms(text));let score=0;
 for(const t of q){if(tokens.has(t))score+=3;else if(text.toLocaleLowerCase('vi').includes(t))score+=1}
 return score;
}
export async function loadV3Context(req,env,question){
 if(!productionReady(env))return {personalPrompt:'',memories:[],documents:[]};
 const sub=await sessionSubject(req,env);
 if(!sub)return {personalPrompt:'',memories:[],documents:[]};
 try{
  const profile=await env.NMH_DB.prepare('SELECT prompt FROM v3_profiles WHERE user_id=?').bind(sub).first();
  const recent=await env.NMH_DB.prepare('SELECT body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 40').bind(sub).all();
  // Ghi nhớ do người dùng chủ động lưu: ưu tiên khớp ngữ nghĩa/từ khóa,
   // nhưng luôn có lớp nền gần đây để câu hỏi diễn đạt gián tiếp vẫn nhận được ngữ cảnh.
   // Chỉ dùng bản ghi thuộc đúng Google subject và giới hạn tối đa 6 ghi nhớ.
   const memories=(recent.results||[]).filter(x=>typeof x.body==='string'&&x.body.trim());
   const relevant=memories.map((x,index)=>({body:x.body,score:scoreSegment(question,x.body),index}))
     .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
   const selected=relevant.slice(0,6);
   for(let i=0;i<memories.length&&selected.length<6;i++){
     if(!selected.some(x=>x.index===i))selected.push({body:memories[i].body,index:i});
   }
   const ranked=selected;
  const terms=extractTerms(question).slice(0,5);
  const rows=terms.length?await env.NMH_DB.prepare('SELECT c.body, c.segment, d.name FROM v3_chunks c JOIN v3_documents d ON d.id=c.doc_id AND d.user_id=c.user_id WHERE c.user_id=? AND ('+terms.map(()=>'c.body LIKE ?').join(' OR ')+') LIMIT 80').bind(sub,...terms.map(x=>'%'+x+'%')).all():{results:[]};
  const docs=(rows.results||[]).map(x=>({...x,score:scoreSegment(question,x.body)})).filter(x=>x.score>=3).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>({name:x.name,segment:x.segment,text:x.body.slice(0,900)}));
  return {personalPrompt:maxText(profile?.prompt,2500),memories:ranked.map(x=>x.body),documents:docs};
 }catch{return {personalPrompt:'',memories:[],documents:[],contextError:'Không truy cập được kho cá nhân, không thể xác minh tài liệu.'}}
}
export function voiceNoteIntent(question){
 const text=String(question||'').trim();
 const match=text.match(/^(?:hãy\s+)?(?:ghi|lưu|chép)(?:\s+(?:lại|giúp\s+(?:tôi|tao|anh)|cho\s+(?:tôi|tao|anh)))?\s+(?:(?:vào|trong)\s+)?(?:file|tệp|sổ)\s+(?:ghi\s+chú|note)(?:\s+(?:rằng|nội\s+dung|là))?\s*[:：,]?\s+(.+)$/isu);
 if(!match)return null;
 const body=match[1].trim();
 return body.length>=2&&body.length<=2200?body:null;
}
export async function handleVoiceNote(req,env,question){
 const note=voiceNoteIntent(question);
 if(!note)return null;
 const result=(answer,saved=false)=>({answer,saved,sources:[],tools:[],model:'local-d1-note',usage:{input_tokens:0,output_tokens:0}});
 if(!productionReady(env))return result('Chưa lưu được ghi chú: kho D1 chưa sẵn sàng.');
 const sub=await sessionSubject(req,env);
 if(!sub)return result('Chưa lưu ghi chú. Hãy đăng nhập Google trong SETUP.');
 try{
  const db=env.NMH_DB,filename='GHI_CHU.md';
  const prior=await db.prepare('SELECT id,raw_text,segment_count FROM v3_documents WHERE user_id=? AND name=? ORDER BY created_at DESC LIMIT 1').bind(sub,filename).first();
  const timestamp=new Date().toISOString().slice(0,16).replace('T',' ');
  const entry='\n\n- '+timestamp+' — '+note;
  let fileId,segment;
  if(prior){
   fileId=prior.id;
   const length=String(prior.raw_text||'').length;
   const previousSegments=Number(prior.segment_count||0);
   if(length+entry.length>60000||previousSegments>=100)return result('Sổ ghi chú đã đầy, chưa ghi thêm. Hãy mở SETUP và tạo tài liệu mới.');
   const operations=[
    db.prepare('UPDATE v3_documents SET raw_text=raw_text || ?,segment_count=segment_count+1 WHERE id=? AND user_id=? AND LENGTH(raw_text)<=? AND segment_count<?').bind(entry,fileId,sub,60000-entry.length,100),
    db.prepare('INSERT INTO v3_chunks (doc_id,user_id,segment,body) SELECT id,user_id,segment_count,? FROM v3_documents WHERE id=? AND user_id=?').bind(note,fileId,sub)
   ];
   const changes=await db.batch(operations);
   if(changes.length!==2||changes.some(x=>Number(x?.meta?.changes||0)!==1))return result('Chưa xác minh được thao tác ghi, không xác nhận thành công.');
   segment=previousSegments+1;
  }else{
   fileId=id();segment=1;
   const text='# GHI CHÚ\n'+entry;
   const changes=await db.batch([
    db.prepare('INSERT INTO v3_documents (id,user_id,name,mime,segment_count,created_at,raw_text) VALUES (?,?,?,?,?,?,?)').bind(fileId,sub,filename,'text/markdown',1,Date.now(),text),
    db.prepare('INSERT INTO v3_chunks (doc_id,user_id,segment,body) VALUES (?,?,?,?)').bind(fileId,sub,1,note)
   ]);
   if(changes.length!==2||changes.some(x=>Number(x?.meta?.changes||0)!==1))return result('Chưa xác minh được thao tác ghi, không xác nhận thành công.');
  }
  const verify=await db.prepare('SELECT raw_text,segment_count FROM v3_documents WHERE user_id=? AND id=?').bind(sub,fileId).first();
  const chunk=await db.prepare('SELECT body FROM v3_chunks WHERE user_id=? AND doc_id=? AND segment=?').bind(sub,fileId,segment).first();
  if(!verify?.raw_text?.includes(note)||chunk?.body!==note)return result('Đã gửi thao tác nhưng chưa đọc lại được ghi chú, không xác nhận thành công.');
  return result('Đã ghi và kiểm tra trong file GHI_CHU.md: '+note,true);
 }catch{return result('Ghi chú chưa được xác nhận trong D1. Hãy kiểm tra SETUP trước khi thử lại.')}
}
export function memoryIntent(question){
 const text=String(question||'').trim();
 const save=text.match(/^(?:hãy\s+)?(?:nhớ\s+rằng|ghi\s+nhớ(?:\s+rằng)?|lưu\s+vào\s+bộ\s+nhớ|ghi(?:\s+(?:lại|giúp\s+(?:tôi|tao|anh)|cho\s+(?:tôi|tao|anh)))?|lưu(?:\s+(?:lại|giúp\s+(?:tôi|tao|anh)))?)\s*[:：,]?\s+(.+)$/isu);
 if(save&&save[1].trim().length>=2){
  const body=save[1].trim().slice(0,500);
  // File notes are handled by the dedicated document route; never misfile them as personal facts.
  if(/^(?:vào\s+)?(?:file|tệp|sổ)\s+(?:ghi\s+chú|note)\b/iu.test(body))return null;
  return {action:'save',body};
 }
 const edit=text.match(/^(?:hãy\s+)?sửa\s+ghi\s+nhớ\s+(.+?)\s+thành\s+(.+)$/isu);
 if(edit&&edit[1].trim().length>=2&&edit[2].trim().length>=2)return {action:'edit',query:edit[1].trim(),body:edit[2].trim().slice(0,500)};
 const erase=text.match(/^(?:hãy\s+)?(?:quên\s+điều|xóa\s+ghi\s+nhớ(?:\s+về)?)\s*[:：,]?\s+(.+)$/isu);
 if(erase&&erase[1].trim().length>=2)return {action:'erase',query:erase[1].trim()};
 return null;
}

export async function handleVoiceMemory(req,env,question){
 const intent=memoryIntent(question);if(!intent)return null;
 if(!productionReady(env))return {answer:'Bộ nhớ đồng bộ chưa được cấu hình. Chưa lưu thông tin nào.',sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}};
 const {sub,error}=await ensureAuth(req,env);
 if(error)return {answer:'Cần đăng nhập Google trong SETUP để ghi nhớ đồng bộ. Chưa lưu.',sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}};
 try{
  if(intent.action==='save'){
   const k=id();
   const write=await env.NMH_DB.prepare('INSERT INTO v3_memories (id,user_id,body,created_at) VALUES (?,?,?,?)').bind(k,sub,intent.body,Date.now()).run();
   if(Number(write?.meta?.changes||0)!==1)throw Error('Memory insert unconfirmed');
   const checked=await env.NMH_DB.prepare('SELECT body FROM v3_memories WHERE user_id=? AND id=?').bind(sub,k).first();
   if(checked?.body!==intent.body)throw Error('Memory readback unconfirmed');
   return {answer:'Đã lưu và kiểm tra ghi nhớ: '+intent.body,saved:true,sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}};
  }
  const results=await env.NMH_DB.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all();
  const q=intent.query.toLocaleLowerCase('vi');
  const hits=(results.results||[]).filter(x=>x.body.toLocaleLowerCase('vi').includes(q));
  if(hits.length!==1)return {answer:hits.length?'Tìm thấy nhiều ghi nhớ liên quan, hãy xóa trong SETUP để tránh xóa nhầm.':'Không tìm thấy ghi nhớ tương ứng. Chưa xóa.',sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}};
  if(intent.action==='edit'){
   const update=await env.NMH_DB.prepare('UPDATE v3_memories SET body=? WHERE user_id=? AND id=?').bind(intent.body,sub,hits[0].id).run();
   if(Number(update.meta?.changes||0)!==1)throw Error('Failed memory update');
   return {answer:'Đã sửa ghi nhớ thành: '+intent.body,sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}};
  }
  await env.NMH_DB.prepare('DELETE FROM v3_memories WHERE user_id=? AND id=?').bind(sub,hits[0].id).run();
  return {answer:'Đã xóa ghi nhớ: '+hits[0].body,sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}};
 }catch{return {answer:'Không lưu được vào bộ nhớ. Vui lòng thử lại; chưa xác nhận thành công.',sources:[],tools:[],model:'local-memory',usage:{input_tokens:0,output_tokens:0}}}
}
function splitText(text){
 const clean=String(text).replace(/\r\n/g,'\n').replace(/\u0000/g,'').trim();
 const out=[];let p=0;
 while(p<clean.length&&out.length<100){let end=Math.min(p+760,clean.length);if(end<clean.length){const j=clean.lastIndexOf('\n',end);if(j>p+360)end=j+1}out.push(clean.slice(p,end));if(end>=clean.length)break;p=Math.max(p+1,end-70)}
 return out;
}
export async function handleV3(req,env){
 const u=new URL(req.url),path=u.pathname,method=req.method.toUpperCase();
 if(path==='/api/v3/config'&&method==='GET'){
  let ready=productionReady(env);
  if(ready){try{await env.NMH_DB.prepare('SELECT COUNT(*) AS n FROM v3_users').first();await env.NMH_DB.prepare('SELECT COUNT(*) AS n FROM v3_sessions').first()}catch{ready=false}}
  return json({ready,googleClientId:validClientId(env),storage:'Cloudflare D1',sync:ready,documentMode:'text-only',r2Required:false});
 }
 if(!productionReady(env))return fail('NMH Voice V3 chưa kích hoạt: cần D1 và Google Web Client',503);
 if(['POST','PUT','DELETE','PATCH'].includes(method)&&!originAllowed(req,u))return fail('Origin/JSON không hợp lệ',403);
 if(path==='/api/v3/auth/google'&&method==='POST'){
  try{
   const data=await readJson(req,14000);
   const person=await verifiedGoogleIdentity(data.credential,validClientId(env));
   await env.NMH_DB.prepare('INSERT INTO v3_users (id,name,created_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').bind(person.sub,person.name,Date.now()).run();
   const token=await createSession(person.sub,env);
   return json({ok:true,name:person.name},200,{'set-cookie':cookie(token,604800)});
  }catch(e){return fail('Đăng nhập không thành công: '+maxText(e?.message,100),401)}
 }
 if(path==='/api/v3/logout'&&method==='POST'){
  const raw=await readSessionCookie(req);
  if(raw){try{await env.NMH_DB.prepare('DELETE FROM v3_sessions WHERE token_hash=?').bind(await sessionHash(raw)).run()}catch{return fail('Chưa thể đăng xuất trên máy chủ',503)}}
  return json({ok:true},200,{'set-cookie':cookie('',0)});
 }
 const {sub,error}=await ensureAuth(req,env);if(error)return error;
 if(path==='/api/v3/me'&&method==='GET'){
  const person=await env.NMH_DB.prepare('SELECT name FROM v3_users WHERE id=?').bind(sub).first();
  return json({signedIn:true,name:person?.name||'',userId:sub});
 }
 if(path==='/api/v3/memory-v2-preference'){
  const mode=['shadow','active'].includes(env?.NMH_MEMORY_V2_MODE)?env.NMH_MEMORY_V2_MODE:'off';
  if(method==='GET'){
   if(mode==='off')return json({available:false,mode:'off',enabled:false,revision:0});
   try{
    const p=await env.NMH_DB.prepare('SELECT enabled,revision FROM v3_memory_v2_preferences WHERE user_id=?').bind(sub).first();
    return json({available:true,mode,enabled:p?.enabled===1,revision:p?.revision||0});
   }catch{return fail('Memory V2 chưa sẵn sàng. Chưa thay đổi ghi nhớ.',503)}
  }
  if(method==='PUT'){
   if(mode==='off')return fail('Memory V2 chưa được kích hoạt trên máy chủ',409);
   let data;try{data=await readJson(req,300)}catch(e){return fail(e.message)}
   if(typeof data?.enabled!=='boolean'||!Number.isInteger(data.revision)||data.revision<0)return fail('Cấu hình ghi nhớ không hợp lệ',400);
   try{
    const row=await env.NMH_DB.prepare('SELECT enabled,revision FROM v3_memory_v2_preferences WHERE user_id=?').bind(sub).first();
    if((row?.revision||0)!==data.revision)return fail('Thiết bị khác đã thay đổi. Hãy tải lại.',409);
    if(row){
     const result=await env.NMH_DB.prepare('UPDATE v3_memory_v2_preferences SET enabled=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(data.enabled?1:0,Date.now(),sub,data.revision).run();
     if(Number(result?.meta?.changes||0)!==1)return fail('Cấu hình vừa thay đổi',409);
    }else{
     await env.NMH_DB.prepare('INSERT INTO v3_memory_v2_preferences (user_id,enabled,revision,updated_at) VALUES (?,?,1,?)').bind(sub,data.enabled?1:0,Date.now()).run();
    }
    const saved=await env.NMH_DB.prepare('SELECT enabled,revision FROM v3_memory_v2_preferences WHERE user_id=?').bind(sub).first();
    if(saved?.enabled!==(data.enabled?1:0))return fail('Chưa xác nhận được thay đổi cấu hình',503);
    return json({ok:true,enabled:!!saved.enabled,revision:saved.revision,mode});
   }catch{return fail('Không cập nhật được lựa chọn ghi nhớ. Dữ liệu cũ không đổi.',503)}
  }
 }
 if(path==='/api/v3/profile'){
  if(method==='GET'){
   const data=await env.NMH_DB.prepare('SELECT prompt, revision FROM v3_profiles WHERE user_id=?').bind(sub).first();
   return json({prompt:data?.prompt||'',revision:data?.revision||0});
  }
  if(method==='PUT'){
   let body;try{body=await readJson(req,4500)}catch(e){return fail(e.message)}
   if(typeof body.prompt!=='string'||body.prompt.length>2500||!Number.isInteger(body.revision)||body.revision<0)return fail('Prompt hoặc phiên bản không hợp lệ');
   const row=await env.NMH_DB.prepare('SELECT revision FROM v3_profiles WHERE user_id=?').bind(sub).first();
   if((row?.revision||0)!==body.revision)return fail('Dữ liệu đã thay đổi ở thiết bị khác. Tải lại trước khi lưu.',409);
   if(row){const update=await env.NMH_DB.prepare('UPDATE v3_profiles SET prompt=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(body.prompt,Date.now(),sub,body.revision).run();if(Number(update.meta?.changes||0)!==1)return fail('Dữ liệu đã thay đổi ở thiết bị khác',409)}
   else {try{await env.NMH_DB.prepare('INSERT INTO v3_profiles (user_id,prompt,revision,updated_at) VALUES (?,?,1,?)').bind(sub,body.prompt,Date.now()).run()}catch{return fail('Dữ liệu đã thay đổi ở thiết bị khác',409)}}
   return json({ok:true,revision:body.revision+1});
  }
 }
 if(path==='/api/v3/memories'){
  if(method==='GET'){
   const r=await env.NMH_DB.prepare('SELECT id,body,created_at FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all();
   return json({memories:r.results||[]});
  }
  if(method==='POST'){
   let d;try{d=await readJson(req,1200)}catch(e){return fail(e.message)}
   const body=maxText(d?.body,500);if(body.length<2)return fail('Ghi nhớ phải có nội dung');
   const key=id();await env.NMH_DB.prepare('INSERT INTO v3_memories (id,user_id,body,created_at) VALUES (?,?,?,?)').bind(key,sub,body,Date.now()).run();
   return json({id:key,body,ok:true},201);
  }
 }
 const mm=path.match(/^\/api\/v3\/memories\/([a-f0-9-]{36})$/);
 if(mm&&method==='PUT'){
  let d;try{d=await readJson(req,1200)}catch(e){return fail(e.message)}
  const body=maxText(d?.body,500);if(body.length<2)return fail('Ghi nhớ phải có nội dung');
  const r=await env.NMH_DB.prepare('UPDATE v3_memories SET body=? WHERE user_id=? AND id=?').bind(body,sub,mm[1]).run();
  return Number(r.meta?.changes||0)===1?json({ok:true,body}):fail('Không tìm thấy ghi nhớ',404);
 }
 if(mm&&method==='DELETE'){
  const r=await env.NMH_DB.prepare('DELETE FROM v3_memories WHERE user_id=? AND id=?').bind(sub,mm[1]).run();
  return json({ok:true,deleted:Number(r.meta?.changes||0)});
 }
 if(path==='/api/v3/documents'){
  if(method==='GET'){
   const r=await env.NMH_DB.prepare('SELECT id,name,mime,created_at,segment_count FROM v3_documents WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all();
   return json({documents:r.results||[]});
  }
  if(method==='POST'){
   let d;try{d=await readJson(req,90000)}catch(e){return fail(e.message)}
   const name=maxText(d?.name,150),mime=maxText(d?.mime,70),body=typeof d?.text==='string'?d.text:'';
   if(!name||!['text/plain','text/markdown'].includes(mime)||!body||body.length>60000)return fail('Hiện chỉ lập chỉ mục TXT/Markdown có chữ, tối đa 60.000 ký tự',415);
   const chunks=splitText(body);
   if(!chunks.length||chunks.length>100)return fail('Tài liệu không hợp lệ',400);
   const key=id(),now=Date.now();
   const statements=[env.NMH_DB.prepare('INSERT INTO v3_documents (id,user_id,name,mime,segment_count,created_at,raw_text) VALUES (?,?,?,?,?,?,?)').bind(key,sub,name,mime,chunks.length,now,body)];
   for(let i=0;i<chunks.length;i++)statements.push(env.NMH_DB.prepare('INSERT INTO v3_chunks (doc_id,user_id,segment,body) VALUES (?,?,?,?)').bind(key,sub,i+1,chunks[i]));
   await env.NMH_DB.batch(statements);
   return json({ok:true,id:key,segments:chunks.length,storage:'d1'},201);
  }
 }
 const doc=path.match(/^\/api\/v3\/documents\/([a-f0-9-]{36})$/);
 if(doc&&method==='GET'){
  const row=await env.NMH_DB.prepare('SELECT name,mime,raw_text FROM v3_documents WHERE user_id=? AND id=?').bind(sub,doc[1]).first();
  return row?json({name:row.name,mime:row.mime,text:row.raw_text||''}):fail('Không tìm thấy tài liệu',404);
 }
 if(doc&&method==='DELETE'){
  const result=await env.NMH_DB.prepare('DELETE FROM v3_documents WHERE user_id=? AND id=?').bind(sub,doc[1]).run();
  return Number(result.meta?.changes||0)===1?json({ok:true,deleted:1}):fail('Không tìm thấy tài liệu',404);
 }
 return fail('Không tìm thấy chức năng V3',404);
}
