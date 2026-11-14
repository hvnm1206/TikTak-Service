// Separate synchronous voice write-intent fallback.
// Never give an unrecognized WRITE COMMAND to the chat agent, which has no direct D1 tool.
// Source of truth for success/failure is the existing D1 backend read-after-write handler.
import {handleVoiceMemory,handleVoiceNote} from './v3-backend.js';
const clean=s=>String(s||'').normalize('NFC').replace(/\s+/gu,' ').trim();
const negative=(reason)=>({answer:'Chưa lưu: '+reason,saved:false,saveStatus:'failed',model:'voice-write',sources:[],tools:[],usage:{input_tokens:0,output_tokens:0}});
const ask='Hãy nói rõ nội dung muốn ghi vào bộ nhớ hoặc file ghi chú.';
// Unambiguous command/opening only, never match ordinary queries *about* writing.
export function isWriteCommand(text){
 const t=clean(text).replace(/^(?:ê|này|ngáo|alo|ơi)[,!.:\s]+/iu,'');
 if(t.length<4)return false;
 if(/^(?:tại sao|vì sao|làm sao|làm thế nào|cách nào|cách |giải thích|cho biết|hỏi |có phải|có thể|tại vì|khi nào|bao giờ)\s/iu.test(t))return false;
 if(/^(?:(?:mày|em|bạn|anh|cậu)\s+)?(?:(?:hãy|làm ơn|nhờ|giúp|phiền|vui lòng)\s+){0,2}(?:ghi|chép|lưu|nhớ|viết|note|để dành)(?:\s|[,.!:：]|$)/iu.test(t))return true;
 if(/(?:ghi|chép|lưu|nhớ)\s+(?:hộ|giúp|cho)\s+(?:tao|tôi|anh|mình|em)\s/iu.test(t))return true;
 if(/(?:vào|trong)\s+(?:file|tệp|sổ)\s+(?:ghi\s+chú|note)(?:\s|$)/iu.test(t))return true;
 if(/(?:để\s+dành|nhớ\s+giùm|đừng\s+quên)\s+(?:cho|rằng|giúp|việc|chuyện|cái)?\s/iu.test(t))return true;
 return false;
}
const instructions=[
 'Bạn là bộ nhận dạng LỆNH LƯU của người dùng trong hội thoại GIỌNG NÓI tiếng Việt, không phải chatbot.',
 'Trả duy nhất JSON object khớp schema. intent "memory" là dữ kiện cần nhớ lâu dài, "note" là nội dung người dùng yêu cầu chép/ghi/lưu lại vào sổ hoặc file ghi chú. Nếu người dùng nói "ghi lại", "ghi hộ", "lưu lại" mà không chỉ rõ bộ nhớ lâu dài, ưu tiên "note".',
 'Nếu nói rõ "ghi nhớ", "nhớ rằng", "lưu vào bộ nhớ" thì intent "memory". Nếu nhắc file/sổ/tệp/note/ghi chú thì intent "note".',
 'Chỉ thực hiện lệnh thật của người dùng. Nếu câu là câu hỏi, giải thích, trích dẫn, lời AI trước đó, hoặc không muốn lưu: intent "none".',
 'content phải là ĐOẠN VĂN NGUYÊN VĂN (chuỗi con) trong câu người dùng, bỏ tiền tố ra lệnh và tên nơi lưu. Không diễn giải, không bịa, không thêm chi tiết.',
 'Nếu người dùng muốn ghi mà không nói nội dung: intent "missing". Nếu ý định hoặc nơi lưu không chắc chắn: "missing". Không tự đề xuất ghi dữ kiện nhạy cảm.',
 'Đánh giá câu hiện tại riêng, không được học theo lời từ chối "không có công cụ" trong các lượt thoại trước.'
].join('\n');
export async function classifyWriteCommand(text,apiKey,{fetchImpl=fetch,signal}={}){
 const utterance=clean(text).slice(0,1800);
 if(!isWriteCommand(utterance))return {intent:'none',content:''};
 if(typeof apiKey!=='string'||apiKey.length<24)throw Error('API_KEY_UNAVAILABLE');
 const schema={type:'object',additionalProperties:false,properties:{intent:{type:'string',enum:['note','memory','none','missing']},content:{type:'string'}},required:['intent','content']};
 const req={model:'gpt-6-luna',instructions,input:utterance,store:false,reasoning:{effort:'none'},text:{format:{type:'json_schema',name:'nmh_voice_write_intent',strict:true,schema}},max_output_tokens:220};
 const res=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},body:JSON.stringify(req),signal});
 if(!res.ok)throw Error(res.status===401?'API_KEY_INVALID':res.status===429?'RATE_LIMIT':'CLASSIFIER_HTTP_'+res.status);
 const d=await res.json();
 const output=(d.output||[]).filter(x=>x?.type==='message').flatMap(x=>x.content||[]).filter(x=>x?.type==='output_text').map(x=>x.text||'').join('');
 if(!output||output.length>1800)throw Error('CLASSIFIER_EMPTY');
 const parsed=JSON.parse(output);
 if(!['note','memory','none','missing'].includes(parsed?.intent)||typeof parsed.content!=='string')throw Error('CLASSIFIER_SCHEMA');
 const val=clean(parsed.content);
 if(parsed.intent==='note'||parsed.intent==='memory'){
  if(val.length<2||val.length>(parsed.intent==='note'?2200:500))return {intent:'missing',content:''};
  if(!utterance.toLocaleLowerCase('vi').includes(val.toLocaleLowerCase('vi')))return {intent:'missing',content:''};
 }
 return {intent:parsed.intent,content:val};
}
export async function routeVoiceWrite(request,env,text,apiKey,{fetchImpl=fetch,signal}={}){
 if(!isWriteCommand(text))return null;
 let p;
 try{p=await classifyWriteCommand(text,apiKey,{fetchImpl,signal})}
 catch(e){
  const reason=String(e?.message||'');
  return negative(reason==='RATE_LIMIT'?'API AI đang hết hạn mức, không ghi dữ liệu.':reason==='API_KEY_INVALID'?'API key không hợp lệ, không ghi dữ liệu.':'không nhận dạng được lệnh ghi bằng AI. Không có dữ liệu nào được xác nhận.');
 }
 if(p.intent==='none')return null; // Not actually a write instruction, handle as normal chat.
 if(p.intent==='missing')return negative(ask);
 const command=p.intent==='note'?'Ghi vào file ghi chú '+p.content:'Ghi nhớ rằng '+p.content;
 try{
  const saved=p.intent==='note'?await handleVoiceNote(request,env,command):await handleVoiceMemory(request,env,command);
  if(!saved)return negative('không thể định tuyến thao tác ghi. '+ask);
  return {...saved,saved:saved.saved===true,saveStatus:saved.saved===true?'saved':'failed'};
 }catch{return negative('máy chủ ghi nhớ đang lỗi. Không xác nhận đã lưu.')}
}
