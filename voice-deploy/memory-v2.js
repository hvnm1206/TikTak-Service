// Memory V2: isolated opt-in pipeline. OFF by default; SHADOW never mutates D1.
export const MEMORY_MODEL='gpt-6-luna';
export const memoryMode=env=>['shadow','active'].includes(env?.NMH_MEMORY_V2_MODE)?env.NMH_MEMORY_V2_MODE:'off';
const tidy=s=>String(s??'').normalize('NFC').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
const fold=s=>tidy(s).toLocaleLowerCase('vi').replace(/[.,!?;:…"'“”‘’()-]+/g,'').trim();
const validId=s=>typeof s==='string'&&/^[0-9a-f-]{36}$/i.test(s);
const secret=/mật khẩu|api[\s_-]*key|token|otp|mã pin|cccd|số tài khoản|thẻ ngân hàng/iu;
const forget=/quên|xóa|xoá|bỏ ghi nhớ/iu;
const change=/từ nay|đổi thành|sửa thành|đính chính|không phải|thực ra|thật ra/iu;
const stopwords=new Set(['người','dùng','chủ','nhân','tao','tôi','mình','con','cái','quên','xóa','xoá','điều','này','thông','tin','từ','nay','tên','thành','sửa','ghi','nhớ','lại','của','là','có','với']);
const meaningful=s=>new Set((fold(s).match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(w=>!stopwords.has(w)));

export function validateProposal(raw,existing,userText){
 const text=tidy(userText).slice(0,1500);
 const entries=Array.isArray(existing)?existing.filter(x=>validId(x?.id)&&typeof x.body==='string').slice(0,100):[];
 const rows=new Map(entries.map(x=>[x.id,x.body]));
 const accepted=[],rejected=[],seen=new Set();
 const proposals=Array.isArray(raw?.ops)?raw.ops:[];
 for(const op of proposals.slice(0,5)){
  const type=op?.type,proof=tidy(op?.evidence),body=tidy(op?.body);
  if(!['add','update','delete'].includes(type)){rejected.push('type');continue}
  if(proof.length<4||proof.length>250||!fold(text).includes(fold(proof))){rejected.push('evidence');continue}
  if(!Number.isFinite(op.confidence)||op.confidence<0.8||op.confidence>1){rejected.push('confidence');continue}
  if(type!=='delete'&&(body.length<5||body.length>160||secret.test(body)||secret.test(proof))){rejected.push('body');continue}
  if(type==='add'){
   if(entries.length+accepted.filter(x=>x.type==='add').length>=100||entries.some(x=>fold(x.body)===fold(body))||accepted.some(x=>fold(x.body)===fold(body))){rejected.push('duplicate');continue}
   accepted.push({type,body});continue;
  }
  if(!validId(op.id)||!rows.has(op.id)||seen.has(op.id)){rejected.push('id');continue}
  const sourceTerms=meaningful(proof),priorTerms=meaningful(rows.get(op.id));
  const shared=[...sourceTerms].filter(t=>priorTerms.has(t));
  // A generic subject such as "dog" or "work" is not enough to pick among multiple stored facts.
  // Require the correction/deletion to identify its target by two meaningful shared tokens.
  if(shared.length<2){rejected.push('ambiguous-target');continue}

  if(type==='delete'&&!forget.test(text)){rejected.push('delete-not-requested');continue}
  if(type==='update'&&!change.test(text)){rejected.push('update-not-requested');continue}
  if(type==='update'&&fold(rows.get(op.id))===fold(body)){rejected.push('unchanged');continue}
  seen.add(op.id);
  accepted.push({type,id:op.id,oldBody:rows.get(op.id),...(type==='update'?{body}:{})});
 }
 return {accepted:accepted.slice(0,2),rejected};
}
const INSTRUCTIONS=[
 'Bạn là bộ phân tích trí nhớ, không phải chatbot. KHÔNG tự ghi hoặc tự nhận đã ghi.',
 'Trả JSON object duy nhất: {"ops":[{"type":"add|update|delete","id":"id bản ghi cũ khi sửa/xóa","body":"ghi nhớ bền vững ngắn gọn","evidence":"trích nguyên văn người dùng","confidence":0.95}]}',
 'Thêm sự thật BỀN do người dùng xác nhận về tên, người thân, sở thích, việc làm, thú cưng, ưu tiên và lời nhắc nhớ lâu dài.',
 'Không lưu câu hỏi, lời AI tự nói, radio, lời nói nghe được từ người khác, sự kiện nhất thời, thời tiết, giờ và địa điểm hiện tại.',
 'Chỉ sửa khi người dùng đính chính rõ và chỉ xóa khi người dùng yêu cầu quên/xóa rõ ràng. Chọn id từ sổ; không tự chế id.',
 'Không lưu bí mật (OTP, API key, mật khẩu, giấy tờ, tài khoản). Không suy diễn, không gộp hoặc viết lại cả sổ.',
 'Mỗi thao tác phải có evidence chính xác là đoạn nguyên văn lời người dùng. Không chắc chắn thì {"ops":[]}. Tối đa 2 thao tác.'
].join('\n');
export async function analyzeMemory({apiKey,userText,existing,fetchImpl=fetch,signal}){
 if(typeof apiKey!=='string'||apiKey.length<20)throw Error('memory-key-unavailable');
 const input=JSON.stringify({memories:existing.slice(0,100).map(x=>({id:x.id,body:tidy(x.body).slice(0,500)})),user:tidy(userText).slice(0,1500)});
 const r=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',signal,headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},body:JSON.stringify({model:MEMORY_MODEL,instructions:INSTRUCTIONS,input,text:{format:{type:'json_schema',name:'nmh_memory_v2_proposal',strict:true,schema:{
  type:'object',additionalProperties:false,properties:{ops:{type:'array',items:{
   type:'object',additionalProperties:false,
   properties:{type:{type:'string',enum:['add','update','delete']},id:{type:['string','null']},body:{type:['string','null']},evidence:{type:'string'},confidence:{type:'number'}},
   required:['type','id','body','evidence','confidence']
  }}},required:['ops']
 }}},store:false,reasoning:{effort:'none'},max_output_tokens:550})});
 if(!r.ok)throw Error('memory-analysis-http-'+r.status);
 const payload=await r.json();
 const output=(payload.output||[]).filter(x=>x?.type==='message').flatMap(x=>x.content||[]).filter(x=>x?.type==='output_text').map(x=>x.text||'').join('').trim();
 if(!output||output.length>6000)throw Error('memory-analysis-output-invalid');
 const parsed=JSON.parse(output);
 if(!Array.isArray(parsed?.ops))throw Error('memory-analysis-json-invalid');
 return parsed;
}
const newId=()=>crypto.randomUUID();
const hash=async text=>{
 const b=new TextEncoder().encode(text);
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
 return [...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
};
export async function saveMemoryOps({db,sub,userText,assistantText,ops,makeId=newId,now=Date.now()}){
 if(!ops.length)return {status:'no-change'};
 const key=await hash(sub+'\n'+tidy(userText)+'\n'+tidy(assistantText));
 if(await db.prepare('SELECT turn_id FROM v3_memory_v2_turns WHERE user_id=? AND turn_id=?').bind(sub,key).first())return {status:'duplicate'};
 const queries=[db.prepare('INSERT INTO v3_memory_v2_turns (user_id,turn_id,created_at) VALUES (?,?,?)').bind(sub,key,now)];
 const expected=[];
 for(const op of ops){
  if(op.type==='add'){
   const id=makeId();
   queries.push(db.prepare('INSERT INTO v3_memories (id,user_id,body,created_at) VALUES (?,?,?,?)').bind(id,sub,op.body,now));
   expected.push({id,body:op.body});
  }else if(op.type==='update'){
   queries.push(db.prepare('UPDATE v3_memories SET body=? WHERE id=? AND user_id=? AND body=?').bind(op.body,op.id,sub,op.oldBody));
   expected.push({id:op.id,body:op.body});
  }else if(op.type==='delete'){
   queries.push(db.prepare('DELETE FROM v3_memories WHERE id=? AND user_id=? AND body=?').bind(op.id,sub,op.oldBody));
   expected.push({id:op.id,deleted:true});
  }
 }
 try{
  const results=await db.batch(queries);
  if(!Array.isArray(results)||results.length!==queries.length||results.some(x=>Number(x?.meta?.changes||0)!==1))return {status:'conflict'};
  for(const item of expected){
   const row=await db.prepare('SELECT body FROM v3_memories WHERE user_id=? AND id=?').bind(sub,item.id).first();
   if(item.deleted?!!row:row?.body!==item.body)return {status:'unverified'};
  }
  return {status:'saved',count:expected.length};
 }catch{return {status:'conflict'}}
}
export async function runMemoryV2({mode,apiKey,userText,assistantText,sub,db,fetchImpl=fetch,makeId,signal}){
 if(mode!=='shadow'&&mode!=='active')return {status:'off'};
 if(!sub||!db||!apiKey)return {status:'no-session'};
 if(tidy(userText).length<4)return {status:'ignored'};
 if(mode==='active'){
  const turnId=await hash(sub+'\n'+tidy(userText)+'\n'+tidy(assistantText));
  if(await db.prepare('SELECT turn_id FROM v3_memory_v2_turns WHERE user_id=? AND turn_id=?').bind(sub,turnId).first())return {status:'duplicate'};
 }
 const r=await db.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all();
 const existing=r?.results||[];
 const proposal=await analyzeMemory({apiKey,userText,existing,fetchImpl,signal});
 const review=validateProposal(proposal,existing,userText);
 if(mode==='shadow')return {status:'shadow',proposed:review.accepted.length,rejected:review.rejected.length};
 return saveMemoryOps({db,sub,userText,assistantText,ops:review.accepted,makeId});
}
