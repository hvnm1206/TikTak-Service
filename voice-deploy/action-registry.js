// NGỐ P0 ActionRegistry: LLM may propose an action, but only this backend may acknowledge it.
import { memoryV2Subject } from './v3-backend.js';
import {remindersEnabled,reminderToolSchemas,reminderActionNames,executeReminderAction,handleReminderApi} from './reminders.js';
const denied=(code,answer)=>({ok:false,status:'failed',errorCode:code,answer});
export function matchesCurrentUtterance(args,utterance){
 const quote=String(args?.utterance_quote||'').normalize('NFC').trim();
 const current=String(utterance||'').normalize('NFC').trim();
 return quote.length>=5&&quote.length<=180&&current.toLocaleLowerCase('vi').includes(quote.toLocaleLowerCase('vi'));
}
export function buildActionRuntime({request,env,utterance,requestId,signal}){
 if(!remindersEnabled(env))return null; // kill switch: old chat remains byte-equivalent
 return Object.freeze({
  tools:reminderToolSchemas,
  async execute(name,args){
   if(signal?.aborted)return denied('ABORTED','Chưa thực hiện: yêu cầu đã bị hủy.');
   if(!reminderActionNames.has(name))return denied('NOT_ALLOWED','Chưa thực hiện: hành động không được cho phép.');
   if(!matchesCurrentUtterance(args,utterance))return denied('TURN_MISMATCH','Chưa thực hiện: yêu cầu nhắc việc không khớp câu nói hiện tại.');
   let sub;try{sub=await memoryV2Subject(request,env)}catch{return denied('AUTH_DB_ERROR','Chưa thực hiện: không kiểm tra được phiên đăng nhập.');}
   if(signal?.aborted)return denied('ABORTED','Chưa thực hiện: yêu cầu đã bị hủy.');
   return executeReminderAction(name,args,{db:env?.NMH_DB,sub,utterance,requestId});
  }
 });
}
export const isActionName=(name)=>reminderActionNames.has(name);
export const routeReminderApi=(request,env)=>handleReminderApi(request,env,memoryV2Subject);
