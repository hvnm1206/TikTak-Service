// NGỐ P0: isolated foreground reminders. Never imported by Ngáo.
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const max=(v,n)=>String(v??'').normalize('NFC').trim().slice(0,n);
const stamp=(ms)=>new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
const fail=(code,answer)=>({ok:false,status:'failed',errorCode:code,answer});
export const remindersEnabled=(env)=>env?.NMH_REMINDERS_MODE==='active';
export const reminderToolSchemas=[
 {type:'function',name:'set_reminder',description:'ĐẶT lời nhắc khi ứng dụng Ngố đang mở. Chỉ gọi khi lượt người dùng này rõ ràng yêu cầu nhắc. Thời gian tương đối dùng delay_seconds; giờ cụ thể dùng local_at theo giờ Việt Nam. Nếu thời gian mơ hồ, hỏi lại thay vì đoán.',parameters:{type:'object',properties:{text:{type:'string',description:'Nội dung cần nhắc, không chứa cụm ra lệnh hay tên giờ'},utterance_quote:{type:'string',description:'Trích nguyên văn ít nhất 5 ký tự từ YÊU CẦU HIỆN TẠI chứng minh đây là lệnh nhắc việc, không từ lịch sử'},mode:{type:'string',enum:['relative','absolute']},delay_seconds:{type:'integer',description:'Số giây từ bây giờ nếu relative, nếu absolute là 0'},local_at:{type:'string',description:'YYYY-MM-DDTHH:mm:ss giờ Việt Nam nếu absolute; nếu relative là chuỗi rỗng'},timezone:{type:'string',enum:['Asia/Ho_Chi_Minh']}},required:['text','utterance_quote','mode','delay_seconds','local_at','timezone'],additionalProperties:false},strict:true},
 {type:'function',name:'list_reminders',description:'Xem các lời nhắc chưa hủy đang chờ, chỉ khi người dùng hiện tại hỏi về lời nhắc.',parameters:{type:'object',properties:{status:{type:'string',enum:['pending']},utterance_quote:{type:'string',description:'Trích nguyên văn từ câu hiện tại hỏi về lời nhắc'}},required:['status','utterance_quote'],additionalProperties:false},strict:true},
 {type:'function',name:'cancel_reminder',description:'Hủy lời nhắc đang chờ theo mã ID hoặc một phần nội dung do người dùng nêu. Nếu trùng nhiều lời nhắc, yêu cầu làm rõ.',parameters:{type:'object',properties:{query:{type:'string'},utterance_quote:{type:'string',description:'Trích nguyên văn từ câu hiện tại yêu cầu hủy lời nhắc'}},required:['query','utterance_quote'],additionalProperties:false},strict:true}
];
export const reminderActionNames=new Set(reminderToolSchemas.map(x=>x.name));
async function digest(s){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const validate=(args,now)=>{
 if(!args||typeof args!=='object'||Array.isArray(args))return fail('SCHEMA','Chưa đặt: yêu cầu không hợp lệ.');
 const text=max(args.text,400);
 if(!text||text.length<2||text.length>250||/[\u0000-\u001f\u007f]/u.test(text))return fail('TEXT','Chưa đặt: nội dung lời nhắc không hợp lệ.');
 if(args.timezone!=='Asia/Ho_Chi_Minh')return fail('TIMEZONE','Chưa đặt: chỉ hỗ trợ giờ Việt Nam.');
 let due;
 if(args.mode==='relative'){
  if(!Number.isSafeInteger(args.delay_seconds)||args.delay_seconds<2||args.delay_seconds>2592000||args.local_at!=='')return fail('TIME','Chưa đặt: khoảng thời gian không hợp lệ.');
  due=now+args.delay_seconds*1000;
 }else if(args.mode==='absolute'){
  if(args.delay_seconds!==0||typeof args.local_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(args.local_at))return fail('TIME','Chưa đặt: cần ngày và giờ cụ thể.');
  due=Date.parse(args.local_at+'+07:00');
  if(!Number.isFinite(due)||new Date(due+25200000).toISOString().slice(0,19)!==args.local_at)return fail('TIME','Chưa đặt: ngày giờ không tồn tại.');
 }else return fail('TIME','Chưa đặt: chưa rõ thời gian muốn nhắc.');
 if(due<=now+1000||due>now+2592000000)return fail('TIME_RANGE','Chưa đặt: giờ đã qua hoặc vượt quá 30 ngày.');
 return {ok:true,text,due};
};
async function audit(db,sub,traceId,name,id,phase,errorCode,elapsed,ack,now){
 try{
  await db.prepare('INSERT INTO nmh_reminder_audit (id,trace_id,owner_ref,action_name,reminder_id,phase,error_code,elapsed_ms,ack_status,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?)')
   .bind(crypto.randomUUID(),traceId,(await digest(sub)).slice(0,20),name,id||null,phase,errorCode||null,elapsed,ack,now).run();
  return true;
 }catch{return false;}
}
async function setReminder(db,sub,args,opts){
 const checked=validate(args,opts.now);
 if(!checked.ok)return checked;
 const {text,due}=checked;
 await opts.mark('VALIDATED');
 const fingerprint=await digest(sub+'\u0000'+opts.utterance.normalize('NFC').trim().toLocaleLowerCase('vi'));
 // Repeated speech/network retry within three minutes must not create duplicate reminders.
 const prev=await db.prepare("SELECT id,text,due_at_ms FROM nmh_reminders WHERE user_id=? AND fingerprint=? AND created_at_ms>=? AND status='pending' ORDER BY created_at_ms DESC LIMIT 1")
  .bind(sub,fingerprint,opts.now-180000).first();
 if(prev){await opts.mark('EXECUTED',prev.id);await opts.mark('READBACK_VERIFIED',prev.id);return {ok:true,status:'verified',id:prev.id,duplicate:true,answer:'Lời nhắc này đã có: '+stamp(prev.due_at_ms)+', '+prev.text+'. Chỉ nhắc khi Ngố đang mở.'};}
 // Atomic unique 3-minute bucket avoids two simultaneous tabs creating duplicates with distinct request IDs.
 const idem=fingerprint.slice(0,40)+':'+Math.floor(opts.now/180000);
 const id=crypto.randomUUID();
 await db.prepare("INSERT OR IGNORE INTO nmh_reminders(id,user_id,text,due_at_ms,timezone,status,idem_key,fingerprint,created_at_ms,updated_at_ms) VALUES(?,?,?,?,?,'pending',?,?,?,?)")
  .bind(id,sub,text,due,'Asia/Ho_Chi_Minh',idem,fingerprint,opts.now,opts.now).run();
 await opts.mark('EXECUTED',id);
 const row=await db.prepare('SELECT id,text,due_at_ms,status FROM nmh_reminders WHERE user_id=? AND idem_key=?')
  .bind(sub,idem).first();
 if(!row||row.status!=='pending'||!(row.due_at_ms>opts.now))return fail('READBACK','Chưa xác nhận được lời nhắc trong D1. Hãy kiểm tra danh sách.');
 await opts.mark('READBACK_VERIFIED',row.id);
 return {ok:true,status:'verified',id:row.id,duplicate:row.id!==id,answer:'Đã đặt nhắc '+stamp(row.due_at_ms)+': '+row.text+'. Chỉ nhắc khi Ngố đang mở.'};
}
async function listReminders(db,sub,mark){
 await mark('VALIDATED');
 const rows=(await db.prepare("SELECT id,text,due_at_ms FROM nmh_reminders WHERE user_id=? AND status='pending' ORDER BY due_at_ms ASC LIMIT 21").bind(sub).all()).results||[];
 await mark('EXECUTED');await mark('READBACK_VERIFIED');
 if(!rows.length)return {ok:true,status:'verified',answer:'Hiện không có lời nhắc đang chờ.'};
 return {ok:true,status:'verified',answer:'Các lời nhắc đang chờ: '+rows.slice(0,10).map((r,i)=>(i+1)+'. '+stamp(r.due_at_ms)+': '+r.text+' (mã '+r.id.slice(0,8)+')').join('; ')+(rows.length>10?'; còn lời nhắc khác.':'')};
}
async function cancelReminder(db,sub,args,now,mark){
 const q=max(args?.query,200);
 if(q.length<2)return fail('AMBIGUOUS','Chưa hủy: hãy nói nội dung hoặc mã lời nhắc.');
 const rows=(await db.prepare("SELECT id,text FROM nmh_reminders WHERE user_id=? AND status='pending' AND (id=? OR substr(id,1,8)=? OR instr(lower(text),lower(?))>0) ORDER BY due_at_ms ASC LIMIT 3")
  .bind(sub,q,q,q).all()).results||[];
 if(rows.length===0)return fail('NOT_FOUND','Chưa hủy: không tìm thấy lời nhắc phù hợp.');
 if(rows.length>1)return fail('AMBIGUOUS','Chưa hủy: có nhiều lời nhắc phù hợp. Hãy nói rõ lời nhắc cần hủy hoặc mã của nó.');
 const row=rows[0];await mark('VALIDATED',row.id);
 const change=await db.prepare("UPDATE nmh_reminders SET status='canceled',updated_at_ms=? WHERE id=? AND user_id=? AND status='pending'")
  .bind(now,row.id,sub).run();
 if(Number(change.meta?.changes||0)!==1)return fail('RACE','Chưa hủy: lời nhắc vừa thay đổi ở một thiết bị khác.');
 await mark('EXECUTED',row.id);
 const check=await db.prepare('SELECT status FROM nmh_reminders WHERE id=? AND user_id=?').bind(row.id,sub).first();
 if(check?.status!=='canceled')return fail('READBACK','Chưa xác nhận hủy trong D1.');
 await mark('READBACK_VERIFIED',row.id);
 return {ok:true,status:'verified',id:row.id,answer:'Đã hủy lời nhắc: '+row.text+'.'};
}
export async function executeReminderAction(name,args,{db,sub,utterance='',requestId='',now=Date.now()}={}){
 const start=Date.now(),traceId=crypto.randomUUID();
 if(!reminderActionNames.has(name))return fail('NOT_ALLOWED','Chưa thực hiện: công cụ không được cấp quyền.');
 if(!sub)return fail('AUTH','Chưa thực hiện. Hãy đăng nhập Google trong SETUP.');
 if(!db)return fail('DB_UNAVAILABLE','Chưa thực hiện: kho D1 chưa sẵn sàng.');
 const mark=async(phase,rowId=null,code=null,ack='PENDING')=>{
  const logged=await audit(db,sub,traceId,name,rowId,phase,code,Date.now()-start,ack,now);
  if(!logged)throw Error('AUDIT_ERROR');
 };
 try{
  // Opportunistic 30-day retention; never alter personal V3 tables.
  await db.prepare('DELETE FROM nmh_reminder_audit WHERE created_at_ms<?').bind(now-2592000000).run();
  await mark('REQUESTED');
 }catch{return fail('AUDIT_ERROR','Chưa thực hiện: không thể ghi nhật ký yêu cầu.');}
 let result;
 try{
  if(name==='set_reminder')result=await setReminder(db,sub,args,{now,utterance,requestId,mark});
  else if(name==='list_reminders')result=await listReminders(db,sub,mark);
  else result=await cancelReminder(db,sub,args,now,mark);
 }catch{
  result=fail('DB_ERROR','Chưa xác nhận được thao tác vì D1 hoặc nhật ký bị lỗi. Hãy xem lại danh sách lời nhắc.');
 }
 try{await mark(result.ok?'ACK_SAVED':'ACK_FAILED',result.id||null,result.errorCode||null,result.ok?'ACK_SAVED':'ACK_FAILED');}
 catch{return fail('AUDIT_ERROR','Chưa xác nhận hoàn tất: không lưu được nhật ký thao tác. Hãy kiểm tra danh sách.');}
 return {...result,traceId,audited:true};
}
export async function handleReminderApi(req,env,subjectFn){
 if(!remindersEnabled(env))return send({error:'REMINDERS_DISABLED'},404);
 if(!env?.NMH_DB)return send({error:'D1_UNAVAILABLE'},503);
 const u=new URL(req.url),method=req.method.toUpperCase(),path=u.pathname;
 if(method==='POST'&&(req.headers.get('origin')!==u.origin||!/^application\/json\b/i.test(req.headers.get('content-type')||'')))return send({error:'ORIGIN_JSON_REQUIRED'},403);
 let sub;try{sub=await subjectFn(req,env)}catch{return send({error:'AUTH_DB_ERROR'},503)}
 if(!sub)return send({error:'Cần đăng nhập Google trong SETUP'},401);
 const db=env.NMH_DB,now=Date.now();
 try{
  if(method==='GET'&&path==='/api/reminders/due'){
   const rows=(await db.prepare("SELECT id,text,due_at_ms FROM nmh_reminders WHERE user_id=? AND status='pending' AND due_at_ms<=? ORDER BY due_at_ms ASC LIMIT 10").bind(sub,now).all()).results||[];
   return send({ok:true,reminders:rows,serverNow:now});
  }
  if(method==='GET'&&path==='/api/reminders'){
   const rows=(await db.prepare("SELECT id,text,due_at_ms,status FROM nmh_reminders WHERE user_id=? AND status='pending' ORDER BY due_at_ms LIMIT 100").bind(sub).all()).results||[];
   return send({ok:true,reminders:rows});
  }
  if(method==='POST'&&path==='/api/reminders/claim'){
   const raw=await req.text();if(raw.length>200)return send({error:'REQUEST_TOO_LARGE'},413);
   const data=JSON.parse(raw);if(typeof data?.id!=='string'||!/^[\da-f-]{36}$/i.test(data.id))return send({error:'ID_INVALID'},400);
   // D1 atomic claim: only one tab/device may change pending to triggered.
   const change=await db.prepare("UPDATE nmh_reminders SET status='triggered',triggered_at_ms=?,updated_at_ms=? WHERE id=? AND user_id=? AND status='pending' AND due_at_ms<=?")
    .bind(now,now,data.id,sub,now).run();
   if(Number(change.meta?.changes||0)!==1)return send({ok:false,claimed:false,error:'ALREADY_CLAIMED_OR_NOT_DUE'},409);
   const row=await db.prepare('SELECT id,text,due_at_ms,status FROM nmh_reminders WHERE id=? AND user_id=?').bind(data.id,sub).first();
   if(row?.status!=='triggered')return send({error:'CLAIM_READBACK_FAILED'},503);
   const logged=await audit(db,sub,crypto.randomUUID(),'claim_reminder',data.id,'READBACK_VERIFIED',null,0,'ACK_SAVED',now);
   // Claim remains consumed even if audit fails; do not send a second alert in multi-tab.
   return send({ok:true,claimed:true,reminder:row,audited:logged});
  }
  return send({error:'NOT_FOUND'},404);
 }catch{return send({error:'REMINDER_DB_ERROR'},503)}
}
