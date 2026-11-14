// NGỐ P0 ActionRegistry: LLM may propose an action, but only this backend may acknowledge it.
import { memoryV2Subject } from './v3-backend.js';
import {remindersEnabled,reminderToolSchemas,reminderActionNames,executeReminderAction,handleReminderApi} from './reminders.js';
export const memoryToolSchema={type:'function',name:'save_memory',description:'Lưu một thông tin người dùng chủ động yêu cầu ghi nhớ lâu dài, ví dụ tên người thân, sở thích, quan hệ, nguyên tắc cá nhân. Đây KHÔNG phải lời nhắc thời gian; không cần ngày giờ. Chỉ thực hiện khi người dùng hiện tại thật sự yêu cầu ghi nhớ.',parameters:{type:'object',properties:{body:{type:'string',description:'Thông tin người dùng muốn lưu, ngắn gọn, trung thực'},utterance_quote:{type:'string',description:'Trích nguyên văn ít nhất 5 ký tự thuộc yêu cầu hiện tại'}},required:['body','utterance_quote'],additionalProperties:false},strict:true};
const denied=(code,answer)=>({ok:false,status:'failed',errorCode:code,answer});
export function matchesCurrentUtterance(args,utterance){
 const quote=String(args?.utterance_quote||'').normalize('NFC').trim();
 const current=String(utterance||'').normalize('NFC').trim();
 return quote.length>=5&&quote.length<=180&&current.toLocaleLowerCase('vi').includes(quote.toLocaleLowerCase('vi'));
}
export function buildActionRuntime({request,env,utterance,requestId,signal}){
 if(!remindersEnabled(env))return null; // kill switch: old chat remains byte-equivalent
 return Object.freeze({
  tools:[...reminderToolSchemas,memoryToolSchema],
  async execute(name,args){
   if(signal?.aborted)return denied('ABORTED','Chưa thực hiện: yêu cầu đã bị hủy.');
   if(!reminderActionNames.has(name)&&name!=='save_memory')return denied('NOT_ALLOWED','Chưa thực hiện: hành động không được cho phép.');
   if(!matchesCurrentUtterance(args,utterance))return denied('TURN_MISMATCH','Chưa thực hiện: yêu cầu nhắc việc không khớp câu nói hiện tại.');
   let sub;try{sub=await memoryV2Subject(request,env)}catch{return denied('AUTH_DB_ERROR','Chưa thực hiện: không kiểm tra được phiên đăng nhập.');}
   if(signal?.aborted)return denied('ABORTED','Chưa thực hiện: yêu cầu đã bị hủy.');
   if(name==='save_memory'){
    const body=String(args?.body||'').trim();
    if(body.length<2||body.length>500||/[\\u0000-\\u001f\\u007f]/u.test(body))return denied('INVALID_MEMORY','Chưa lưu được ghi nhớ: nội dung không hợp lệ.');
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
export const isActionName=(name)=>reminderActionNames.has(name)||name==='save_memory';
export const routeReminderApi=(request,env)=>handleReminderApi(request,env,memoryV2Subject);
