// NGỐ P0 ActionRegistry: LLM may propose an action, but only this backend may acknowledge it.
import { memoryV2Subject,storeVoiceNote } from './v3-backend.js';
import {remindersEnabled,reminderToolSchemas,reminderActionNames,executeReminderAction,handleReminderApi} from './reminders.js';
export const memoryToolSchema={type:'function',name:'save_memory',description:'Lưu một thông tin người dùng chủ động yêu cầu ghi nhớ lâu dài, ví dụ tên người thân, sở thích, quan hệ, nguyên tắc cá nhân. Đây KHÔNG phải lời nhắc thời gian; không cần ngày giờ. Chỉ thực hiện khi người dùng hiện tại thật sự yêu cầu ghi nhớ.',parameters:{type:'object',properties:{body:{type:'string',description:'Thông tin người dùng muốn lưu, ngắn gọn, trung thực'},utterance_quote:{type:'string',description:'Trích nguyên văn ít nhất 5 ký tự thuộc yêu cầu hiện tại'}},required:['body','utterance_quote'],additionalProperties:false},strict:true};
export const noteToolSchema={type:'function',name:'save_note',description:'Lưu nội dung người dùng chủ động yêu cầu ghi vào sổ ghi chú. Không đòi ngày giờ.',parameters:{type:'object',properties:{body:{type:'string',description:'Nội dung cần chép vào ghi chú'},utterance_quote:{type:'string',description:'Trích nguyên văn lời người dùng đang yêu cầu'}},required:['body','utterance_quote'],additionalProperties:false},strict:true};
export const updateMemoryToolSchema={type:'function',name:'update_memory',description:'Sửa đúng một ghi nhớ đã lưu khi người dùng yêu cầu thay đổi.',parameters:{type:'object',properties:{match:{type:'string',description:'Nội dung ghi nhớ cũ cần xác định duy nhất'},body:{type:'string',description:'Nội dung ghi nhớ mới'},utterance_quote:{type:'string',description:'Trích nguyên văn lời người dùng đang yêu cầu'}},required:['match','body','utterance_quote'],additionalProperties:false},strict:true};
export const deleteMemoryToolSchema={type:'function',name:'delete_memory',description:'Xóa đúng một ghi nhớ đã lưu khi người dùng yêu cầu xóa hoặc quên.',parameters:{type:'object',properties:{match:{type:'string',description:'Nội dung ghi nhớ cũ cần xác định duy nhất'},utterance_quote:{type:'string',description:'Trích nguyên văn lời người dùng đang yêu cầu'}},required:['match','utterance_quote'],additionalProperties:false},strict:true};
export const readMemoryToolSchema={type:'function',name:'read_memories',description:'Đọc các ghi nhớ đã lưu thuộc tài khoản hiện tại để trả lời, liên kết thông tin hoặc truy xuất khi không đủ ngữ cảnh. Dùng với câu hỏi cần nhớ lại dữ kiện; đây là thao tác chỉ đọc.',parameters:{type:'object',properties:{offset:{type:'integer',description:'Vị trí trang, bắt đầu 0'},utterance_quote:{type:'string',description:'Trích nguyên văn câu người dùng đang hỏi'}},required:['offset','utterance_quote'],additionalProperties:false},strict:true};
export const memoryActionNames=new Set(['save_memory','save_note','update_memory','delete_memory','read_memories']);
const denied=(code,answer)=>({ok:false,status:'failed',errorCode:code,answer});
export function matchesCurrentUtterance(args,utterance){
 const quote=String(args?.utterance_quote||'').normalize('NFC').trim();
 const current=String(utterance||'').normalize('NFC').trim();
 return quote.length>=5&&quote.length<=180&&current.toLocaleLowerCase('vi').includes(quote.toLocaleLowerCase('vi'));
}
export function buildActionRuntime({request,env,utterance,requestId,signal}){
 if(!env?.NMH_DB)return null;
 return Object.freeze({
  tools:[...(remindersEnabled(env)?reminderToolSchemas:[]),memoryToolSchema,noteToolSchema,updateMemoryToolSchema,deleteMemoryToolSchema,readMemoryToolSchema],
  async execute(name,args){
   if(signal?.aborted)return denied('ABORTED','Chưa thực hiện: yêu cầu đã bị hủy.');
   if(!memoryActionNames.has(name)&&!(remindersEnabled(env)&&reminderActionNames.has(name)))return denied('NOT_ALLOWED','Chưa thực hiện: hành động không được cho phép.');
   if(!matchesCurrentUtterance(args,utterance))return denied('TURN_MISMATCH','Chưa thực hiện: công cụ không khớp yêu cầu hiện tại.');
   let sub;try{sub=await memoryV2Subject(request,env)}catch{return denied('AUTH_DB_ERROR','Chưa thực hiện: không kiểm tra được phiên đăng nhập.');}
   if(signal?.aborted)return denied('ABORTED','Chưa thực hiện: yêu cầu đã bị hủy.');
   if(!sub)return denied('AUTH','Chưa lưu được. Hãy đăng nhập Google trong SETUP.');
   const validText=(value,max)=>typeof value==='string'&&value.trim().length>=2&&value.trim().length<=max&&!/[\u0000-\u001f\u007f]/u.test(value);
   if(name==='read_memories'){
    if(!Number.isInteger(args?.offset)||args.offset<0||args.offset>500)return denied('INVALID_PAGE','Trang ghi nhớ không hợp lệ.');
    try{
     const rows=await env.NMH_DB.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 50 OFFSET ?').bind(sub,args.offset).all();
     const items=(rows?.results||[]).filter(x=>typeof x.body==='string').map(x=>({id:x.id,body:x.body.slice(0,500)}));
     return {ok:true,status:'read',continueModel:true,data:{items,nextOffset:items.length===50?args.offset+50:null}};
    }catch{return denied('MEMORY_READ_FAILED','Chưa truy cập được ghi nhớ.');}
   }
   if(name==='save_note'){
    if(!validText(args?.body,2200))return denied('INVALID_NOTE','Nội dung ghi chú không hợp lệ.');
    const stored=await storeVoiceNote(request,env,String(args.body).trim());
    return stored.saved?{ok:true,status:'verified',answer:stored.answer}:{ok:false,status:'failed',errorCode:'NOTE_WRITE_FAILED',answer:stored.answer};
   }
   if(name==='update_memory'||name==='delete_memory'){
    if(!validText(args?.match,500)||(name==='update_memory'&&!validText(args?.body,500)))
      return denied('INVALID_MEMORY','Nội dung thao tác ghi nhớ không hợp lệ.');
    try{
     const rows=await env.NMH_DB.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all();
     const needle=String(args.match).normalize('NFC').trim().toLocaleLowerCase('vi');
     const matches=(rows.results||[]).filter(x=>x.body?.normalize('NFC').toLocaleLowerCase('vi').includes(needle));
     if(matches.length!==1)return denied('AMBIGUOUS_MEMORY',matches.length?'Có nhiều ghi nhớ khớp, cần xác định nội dung cụ thể hơn.':'Không tìm thấy ghi nhớ tương ứng để sửa hoặc xóa.');
     const old=matches[0];
     if(name==='update_memory'){
      const body=String(args.body).trim();
      const wr=await env.NMH_DB.prepare('UPDATE v3_memories SET body=? WHERE user_id=? AND id=? AND body=?').bind(body,sub,old.id,old.body).run();
      if(Number(wr.meta?.changes||0)!==1)return denied('MEMORY_CONFLICT','Ghi nhớ đã thay đổi, chưa sửa.');
      const check=await env.NMH_DB.prepare('SELECT body FROM v3_memories WHERE user_id=? AND id=?').bind(sub,old.id).first();
      return check?.body===body?{ok:true,status:'verified',answer:'Đã sửa ghi nhớ: '+body}:denied('MEMORY_READBACK','Chưa xác nhận được thay đổi ghi nhớ.');
     }
     const wr=await env.NMH_DB.prepare('DELETE FROM v3_memories WHERE user_id=? AND id=? AND body=?').bind(sub,old.id,old.body).run();
     if(Number(wr.meta?.changes||0)!==1)return denied('MEMORY_CONFLICT','Ghi nhớ đã thay đổi, chưa xóa.');
     const check=await env.NMH_DB.prepare('SELECT body FROM v3_memories WHERE user_id=? AND id=?').bind(sub,old.id).first();
     return !check?{ok:true,status:'verified',answer:'Đã xóa ghi nhớ: '+old.body}:denied('MEMORY_READBACK','Chưa xác nhận được việc xóa ghi nhớ.');
    }catch{return denied('MEMORY_DB_ERROR','Không thực hiện được thay đổi ghi nhớ trong kho dữ liệu.');}
   }
   if(name==='save_memory'){
    if(!sub)return denied('AUTH','Chưa lưu ghi nhớ. Hãy đăng nhập Google trong SETUP.');
    const body=String(args?.body||'').trim();
    if(body.length<2||body.length>500||/[\u0000-\u001f\u007f]/u.test(body))return denied('INVALID_MEMORY','Chưa lưu được ghi nhớ: nội dung không hợp lệ.');
    if(!env?.NMH_DB)return denied('DB_UNAVAILABLE','Chưa lưu được ghi nhớ vì kho dữ liệu không sẵn sàng.');
    try{
     const id=crypto.randomUUID();
     const saved=await env.NMH_DB.prepare('INSERT INTO v3_memories (id,user_id,body,created_at) VALUES (?,?,?,?)').bind(id,sub,body,Date.now()).run();
     if(Number(saved?.meta?.changes||0)!==1)return denied('MEMORY_WRITE','Chưa xác nhận được thao tác lưu ghi nhớ.');
     const check=await env.NMH_DB.prepare('SELECT body FROM v3_memories WHERE user_id=? AND id=?').bind(sub,id).first();
     if(check?.body!==body)return denied('MEMORY_READBACK','Đã gửi yêu cầu nhưng chưa kiểm tra được ghi nhớ đã lưu.');
     return {ok:true,status:'verified',id,answer:'Đã ghi nhớ: '+body};
    }catch{return denied('MEMORY_DB_ERROR','Chưa lưu được ghi nhớ. Hãy kiểm tra kết nối dữ liệu.');}
   }
   return executeReminderAction(name,args,{db:env?.NMH_DB,sub,utterance,requestId});
  }
 });
}
export const isActionName=(name)=>reminderActionNames.has(name)||memoryActionNames.has(name);
export const routeReminderApi=(request,env)=>handleReminderApi(request,env,memoryV2Subject);
