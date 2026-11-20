import {observePersonalMemory,personalMemoryEnabled} from './personal-memory.js';
import {previewRealtimeSpeech} from './realtime-speech.js';
import {enhanceFastVoice} from './fast-voice-ui.js';
import { runAgent, tomtomCheck, vietmapCheck } from './agent-v2.js';
import { enhanceVoicePage } from './presence-ui.js';
import { enhanceV3Page } from './v3-ui.js';
import { handleV3, loadV3Context, memoryV2Subject } from './v3-backend.js';
import { memoryMode, runMemoryV2 } from './memory-v2.js';
import {buildActionRuntime,routeReminderApi} from './action-registry.js';
import {remindersEnabled} from './reminders.js';
import {enhanceReminderPage} from './reminders-client.js';
import {enhanceThemePage} from './theme-ui.js';
import {enhanceVolumePage} from './volume-ui.js';
import {enhanceLatencyPage} from './latency-ui.js';
import {enhanceQrPage} from './qr-ui.js';
import {enhanceVoiceBoost} from './voice-boost-ui.js';
import {enhanceCorgiFace} from './corgi-face-ui.js';
const PAGE=enhanceVolumePage(enhanceVoicePage("<!doctype html>\n<html lang=\"vi\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"referrer\" content=\"no-referrer\"><meta name=\"theme-color\" content=\"#111827\"><title>NMH Voice GPT</title><style>\n*{box-sizing:border-box}body{background:#101827;color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;margin:0}.shell{max-width:560px;padding:24px 16px;margin:auto;min-height:100dvh;display:flex;flex-direction:column}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-weight:800;letter-spacing:.4px}.panel{background:#1f2937;border-radius:15px;padding:14px}#talk{display:flex;flex-direction:column;flex:1}.history{height:55vh;min-height:260px;overflow:auto;flex:1;background:#1f2937;border-radius:15px;padding:14px}.bubble{padding:12px 13px;margin:9px 0;background:#374151;border-radius:12px;white-space:pre-wrap;line-height:1.5}.bubble.user{background:#1d4ed8;margin-left:16%}.bubble.assistant{margin-right:12%}.controls{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin:16px 0}button{padding:13px 17px;border:0;background:#374151;color:#fff;font-size:15px;font-weight:750;border-radius:13px;cursor:pointer}.primary{background:#2563eb}.talk{font-size:24px;min-width:180px;padding:20px 26px}.danger{background:#b91c1c}.hidden{display:none!important}#status{margin-bottom:12px}#error{color:#fecaca;margin-top:12px;line-height:1.5;white-space:pre-wrap}small,.hint{color:#cbd5e1;line-height:1.6}input{width:100%;padding:15px;border:1px solid #64748b;background:#1f2937;color:#fff;border-radius:12px;font-size:16px;margin:12px 0}#setup{flex:1}h2{margin:10px 0}#keymsg{color:#fcd34d}a{color:#93c5fd}#maintenance{flex:1}#maintenanceText{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:13px;line-height:1.65;max-height:60vh;overflow:auto;margin:14px 0}button:focus-visible,input:focus-visible{outline:3px solid #60a5fa}button:disabled{opacity:.45}.sources{display:flex;flex-direction:column;gap:7px;padding:4px 10px 13px;font-size:13px}.sources a{overflow-wrap:anywhere;text-decoration:underline}.selected{background:#2563eb;outline:2px solid #93c5fd}\n</style></head><body><main class=\"shell\">\n<header><span>NMH · VOICE GPT</span><div style=\"display:flex;gap:8px\"><button id=\"maintbtn\" style=\"font-size:13px;padding:11px\">BẢO TRÌ</button><button id=\"setupbtn\">SETUP</button></div></header>\n<section id=\"talk\"><div class=\"controls\" role=\"group\" aria-label=\"Phong cách hội thoại\"><button id=\"styleDanh\" class=\"selected\" type=\"button\">ĐANH ĐÁ</button><button id=\"styleChem\" type=\"button\">CHÉM GIÓ</button><button id=\"styleNghiem\" type=\"button\">NGHIÊM TÚC</button></div><div id=\"status\" class=\"panel\" role=\"status\">Chưa bắt đầu</div><div id=\"voiceStatus\" class=\"hint\" role=\"status\">Nguồn giọng: chưa phát</div><div id=\"usageSummary\" class=\"hint\" role=\"status\">Chi phí: chưa có lượt sử dụng trên thiết bị này</div><div id=\"history\" class=\"history\" aria-live=\"polite\"><p>Nhấn NÓI để trò chuyện bằng tiếng Việt.</p></div><div class=\"controls\"><button class=\"primary talk\" id=\"start\">NÓI</button><button class=\"danger hidden\" id=\"stop\">KẾT THÚC</button><button id=\"interrupt\" class=\"hidden\">NGẮT AI</button><button id=\"resume\" class=\"hidden\">TIẾP TỤC</button></div><small>Nhận giọng trên thiết bị. Giọng AI Marin bắt buộc: nếu phát lỗi app báo lỗi và KHÔNG âm thầm đổi sang Safari. Marin có phí TTS. iPhone có thể yêu cầu nhấn TIẾP TỤC khi Safari ngừng nhận dạng. NGẮT AI là ngắt thủ công. GPT chủ động dùng công cụ công khai khi cần, không phải chọn tra mạng.</small></section>\n<section id=\"setup\" class=\"hidden\"><h2>SETUP</h2><p class=\"hint\">Không đăng nhập. Khi chọn lưu, API key được giữ trong bộ nhớ cục bộ (localStorage) trên iPhone này, không lưu tại Cloudflare. Chỉ dùng trên thiết bị tin cậy. Bấm XÓA KEY để xoá hẳn.</p><input id=\"key\" type=\"password\" placeholder=\"OpenAI API key (sk-...)\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\"><label class=\"hint\" style=\"display:flex;align-items:center;gap:10px\"><input id=\"remember\" type=\"checkbox\" checked style=\"width:22px;height:22px;margin:5px 0\">Lưu key trên iPhone này</label><div class=\"controls\"><button id=\"test\">KIỂM TRA KEY</button><button id=\"testVoice\">THỬ GIỌNG AI MARIN</button><button class=\"primary\" id=\"save\">DÙNG KEY</button><button id=\"clear\">XÓA KEY</button></div><p id=\"keymsg\">Chưa có key</p><p id=\"ttsDiagnostic\" role=\"status\" style=\"overflow-wrap:anywhere\">Giọng AI: chưa kiểm tra</p><div class=\"panel\" style=\"margin:20px 0\"><h3 style=\"margin:0 0 12px\">TÙY CHỈNH GIỌNG NÓI</h3><label for=\"gain\" style=\"display:block;margin:14px 0\">Âm lượng giọng AI Marin (khuếch đại có giới hạn): <strong id=\"gainvalue\">1.55×</strong></label><input id=\"gain\" type=\"range\" min=\"1\" max=\"2.5\" value=\"1.55\" step=\"0.05\" style=\"width:100%;padding:0;accent-color:#60a5fa\"><p class=\"hint\">Nếu âm thanh méo, giảm mức khuếch đại. Chỉ áp dụng cho giọng AI, không thay đổi micro hay âm lượng iPhone.</p><label for=\"pitch\" style=\"display:block;margin:14px 0\">Độ cao giọng nghe thử trên Safari: <strong id=\"pitchvalue\">1.50</strong></label><input id=\"pitch\" type=\"range\" min=\"0.8\" max=\"2\" value=\"1.5\" step=\"0.05\" style=\"width:100%;padding:0;accent-color:#60a5fa\"><label for=\"rate\" style=\"display:block;margin:14px 0\">Tốc độ nói: <strong id=\"ratevalue\">1.00×</strong></label><input id=\"rate\" type=\"range\" min=\"0.7\" max=\"1.4\" value=\"1\" step=\"0.05\" style=\"width:100%;padding:0;accent-color:#60a5fa\"><div class=\"controls\"><button id=\"preview\">NGHE THỬ GIỌNG</button><button id=\"resetvoice\">GIỌNG MẶC ĐỊNH</button></div><p class=\"hint\">Giọng AI được tổng hợp bằng Marin và điều chỉnh tốc độ khi phát. Thanh pitch chỉ dùng cho nút NGHE THỬ GIỌNG trên Safari; hội thoại AI không có giọng dự phòng tự động.</p></div><p class=\"hint\">Chat dùng gpt-6-luna qua Responses API. Giọng Marin từ OpenAI TTS có phí; nếu TTS lỗi, ứng dụng sẽ báo lỗi và tạm dừng, không tự chuyển sang giọng Safari. Tra cứu qua nguồn công khai không phải tìm kiếm toàn Internet.</p><button id=\"back\">QUAY LẠI</button></section><section id=\"maintenance\" class=\"hidden\"><h2>BẢO TRÌ — NMH VOICE GPT</h2><p class=\"hint\">Bàn giao và nhật ký bảo trì có nguồn chuẩn trên GitHub. Không chứa API key.</p><div class=\"controls\"><button id=\"readHandover\" class=\"primary\">ĐỌC BÀN GIAO</button><button id=\"readMaintenance\">ĐỌC BẢO TRÌ</button></div><div class=\"controls\"><button id=\"copyHandover\" class=\"primary\">COPY BÀN GIAO</button><button id=\"refreshDocs\">TẢI LẠI</button></div><p id=\"maintStatus\" class=\"hint\" role=\"status\">Chọn tài liệu cần đọc.</p><div id=\"maintenanceText\" class=\"panel\"></div><p class=\"hint\">Nguồn gốc: <a href=\"https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md\" target=\"_blank\" rel=\"noopener noreferrer\">START_HERE_NEXT_CHAT.md</a> · <a href=\"https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/MAINTENANCE.md\" target=\"_blank\" rel=\"noopener noreferrer\">MAINTENANCE.md</a></p><button id=\"backMaint\">QUAY LẠI</button></section><div id=\"error\" role=\"alert\"></div></main>\n<script>\n(()=>{\n const $=x=>document.getElementById(x);\n const SR=window.SpeechRecognition||window.webkitSpeechRecognition, synth=window.speechSynthesis;\n const K=\"nmh_voice_api_key_v1\",P=\"nmh_voice_pitch_v1\",R=\"nmh_voice_rate_v1\";\n const load=(name,def)=>{try{return localStorage.getItem(name)||def}catch{return def}};\n const persist=(name,value)=>{try{localStorage.setItem(name,value);return true}catch{return false}};\n const forget=name=>{try{localStorage.removeItem(name)}catch{}};\n const clamp=(value,min,max,def)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):def;\n let audioCtx=null,audioSource=null,ttsCtl=null,ttsPrefetchCtl=null,ttsRequestId=0,voiceLastError=\"\";let style=load(\"nmh_voice_style_v2\",\"danh_da\");let key=load(K,\"\"),pitch=clamp(load(P,\"1.50\"),0.8,2,1.5),rate=clamp(load(R,\"1.00\"),0.7,1.4,1),voiceGain=clamp(load(\"nmh_voice_gain_v1\",\"1.55\"),1,2.5,1.55),history=[],active=false,step=\"idle\",rec=null,voice=null,controller=null,gen=0,heard=\"\",lastText=\"\",lastTime=0,noSpeech=0,speechWatch=null;\n const labels={idle:\"Chưa bắt đầu\",listening:\"Đang nghe\",processing:\"Đang xử lý\",speaking:\"Đang trả lời\",paused:\"Tạm dừng\",error:\"Lỗi Voice\"};\n function setState(s,detail=\"\"){step=s;$(\"status\").textContent=labels[s]+(detail?\" — \"+detail:\"\");$(\"start\").classList.toggle(\"hidden\",active);$(\"stop\").classList.toggle(\"hidden\",!active);$(\"interrupt\").classList.toggle(\"hidden\",!(active&&s===\"speaking\"));$(\"resume\").classList.toggle(\"hidden\",!(active&&(s===\"error\"||s===\"paused\")))}\n function showError(m){$(\"error\").textContent=m;setState(\"error\",m)}\n function render(){const e=$(\"history\");e.replaceChildren();if(!history.length){const p=document.createElement(\"p\");p.textContent=\"Hãy nói bằng tiếng Việt. AI sẽ đọc câu trả lời rồi tự nghe lại.\";e.append(p)}for(const m of history){const p=document.createElement(\"div\");p.className=\"bubble \"+m.role;p.textContent=m.content;e.append(p);if(m.role===\"assistant\"&&Array.isArray(m.sources)&&m.sources.length){const links=document.createElement(\"div\");links.className=\"sources\";for(const src of m.sources){const a=document.createElement(\"a\");a.href=src.url;a.rel=\"noopener noreferrer\";a.target=\"_blank\";a.textContent=src.title||src.url;links.append(a)}const details=document.createElement(\"details\");const summary=document.createElement(\"summary\");summary.textContent=\"Nguồn tham khảo (\"+m.sources.length+\")\";details.append(summary,links);e.append(details)}}e.scrollTop=e.scrollHeight}\n function closeRec(){if(rec){const r=rec;rec=null;r.onresult=r.onerror=r.onend=null;try{r.abort()}catch{}}}\n function audioUnlock(){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error(\"AUDIO_CONTEXT_NOT_SUPPORTED\");if(!audioCtx)audioCtx=new C();if(audioCtx.state!==\"running\")void audioCtx.resume().catch(()=>{});const b=audioCtx.createBuffer(1,1,audioCtx.sampleRate),s=audioCtx.createBufferSource();s.buffer=b;s.connect(audioCtx.destination);s.start(0)}\n\n const COST_KEY=\"nmh_voice_cost_v2\";\n let costLedger=[];\n try{const stored=JSON.parse(load(COST_KEY,\"[]\"));if(Array.isArray(stored))costLedger=stored.slice(-31)}catch{}\n const localDay=()=>new Intl.DateTimeFormat(\"sv-SE\",{timeZone:\"Asia/Ho_Chi_Minh\",year:\"numeric\",month:\"2-digit\",day:\"2-digit\"}).format(new Date());\n function syncGain(){const e=$(\"gain\"),v=$(\"gainvalue\");if(e)e.value=voiceGain.toFixed(2);if(v)v.textContent=voiceGain.toFixed(2)+\"×\"}$(\"gain\").oninput=()=>{voiceGain=clamp($(\"gain\").value,1,2.5,1.55);persist(\"nmh_voice_gain_v1\",String(voiceGain));syncGain()};syncGain();\n function renderCost(){\n   const day=localDay(),month=day.slice(0,7),monthRows=costLedger.filter(x=>x&&typeof x.day===\"string\"&&x.day.startsWith(month));\n   const today=monthRows.find(x=>x.day===day)||{},sum=(rows,key)=>rows.reduce((a,x)=>a+(Number(x[key])||0),0);\n   const todayUsd=(Number(today.gptUsd)||0)+(Number(today.webUsd)||0)+(Number(today.ttsSeconds)||0)/60*0.015;\n   const monthUsd=sum(monthRows,\"gptUsd\")+sum(monthRows,\"webUsd\")+sum(monthRows,\"ttsSeconds\")/60*0.015;\n   $(\"usageSummary\").textContent=\"ƯỚC PHÍ (không phải hóa đơn) · hôm nay: \"+Math.round(todayUsd*25675).toLocaleString(\"vi-VN\")+\"đ; tháng: \"+Math.round(monthUsd*25675).toLocaleString(\"vi-VN\")+\"đ; Web Search hôm nay \"+(Number(today.webUsd)||0).toFixed(3)+\" USD (chưa gồm token nội dung tìm kiếm); TTS hôm nay \"+(Number(today.ttsSeconds)||0).toFixed(1)+\" giây âm thanh tạo / \"+(Number(today.ttsChunks)||0)+\" lượt; lỗi TTS \"+(Number(today.ttsErrors)||0)+\". Chỉ thiết bị này; TTS theo 0,015 USD/phút, chưa tính token chữ và phí phát sinh.\";\n }\n function recordCost(delta){if(String(globalThis.ngoTtsSource||\"\").startsWith(\"google\")&&delta&&delta.ttsSeconds)delta={...delta,ttsSeconds:0};\n   const day=localDay();let row=costLedger.find(x=>x.day===day);\n   if(!row){row={day,gptUsd:0,ttsSeconds:0,ttsChunks:0,ttsErrors:0};costLedger.push(row)}\n   for(const k of [\"gptUsd\",\"webUsd\",\"ttsSeconds\",\"ttsChunks\",\"ttsErrors\"]){const n=Number(delta[k]||0);if(Number.isFinite(n)&&n>0)row[k]=(Number(row[k])||0)+n}\n   const cutoff=new Date(Date.now()-32*86400000).toISOString().slice(0,10);\n   costLedger=costLedger.filter(x=>x&&typeof x.day===\"string\"&&x.day>=cutoff).slice(-31);\n   persist(COST_KEY,JSON.stringify(costLedger));renderCost();\n }\n function setVoiceSource(t){$(\"voiceStatus\").textContent=\"Nguồn giọng: \"+t}\n function closeVoice(){ttsRequestId++;if(speechWatch){clearInterval(speechWatch);speechWatch=null}if(audioSource){audioSource.onended=null;try{audioSource.stop()}catch{}try{audioSource.disconnect()}catch{}audioSource=null}ttsCtl?.abort();ttsCtl=null;ttsPrefetchCtl?.abort();ttsPrefetchCtl=null;if(voice){voice.onend=voice.onerror=null;voice=null}try{synth?.cancel()}catch{}}\n function pause(msg){gen++;closeRec();closeVoice();controller?.abort();controller=null;if(active){setState(\"paused\");$(\"error\").textContent=msg||\"\"}}\n function stop(){gen++;active=false;closeRec();closeVoice();controller?.abort();controller=null;history=[];heard=\"\";render();setState(\"idle\");$(\"error\").textContent=\"\"}\n function showSetup(yes){$(\"talk\").classList.toggle(\"hidden\",yes);$(\"setup\").classList.toggle(\"hidden\",!yes);$(\"maintenance\").classList.add(\"hidden\");$(\"setupbtn\").classList.toggle(\"hidden\",yes);$(\"maintbtn\").classList.toggle(\"hidden\",yes);if(yes&&active)pause(\"Tạm dừng để mở SETUP\");if(yes)window.nmhV3Refresh?.()}\n async function loadDoc(name){$(\"maintStatus\").textContent=\"Đang đọc \"+name+\" từ GitHub…\";const response=await fetch(\"/api/docs/\"+name,{cache:\"no-store\"});if(!response.ok)throw Error(\"Không tải được tài liệu: HTTP \"+response.status);const text=await response.text();if(text.length>60000)throw Error(\"Tài liệu quá dài\");$(\"maintStatus\").textContent=name+\" · \"+text.length+\" ký tự\";return text}\n function openMaintenance(){if(active)pause(\"Tạm dừng để mở BẢO TRÌ\");$(\"talk\").classList.add(\"hidden\");$(\"setup\").classList.add(\"hidden\");$(\"maintenance\").classList.remove(\"hidden\");$(\"setupbtn\").classList.add(\"hidden\");$(\"maintbtn\").classList.add(\"hidden\");void viewDoc(\"handover\")}\n async function viewDoc(name){$(\"maintenanceText\").textContent=\"Đang tải tài liệu…\";try{$(\"maintenanceText\").textContent=await loadDoc(name)}catch(e){$(\"maintenanceText\").textContent=e.message+\"; dùng link GitHub bên dưới để đọc.\";$(\"maintStatus\").textContent=\"Lỗi tải tài liệu\"}}\n async function copyDoc(){const btn=$(\"copyHandover\");btn.disabled=true;try{const [a,b]=await Promise.all([loadDoc(\"handover\"),loadDoc(\"maintenance\")]);const txt=a+\"\\n\\n---\\n\\n\"+b;if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(txt)}else{const ta=document.createElement(\"textarea\");ta.value=txt;document.body.appendChild(ta);ta.select();const ok=document.execCommand(\"copy\");ta.remove();if(!ok)throw Error(\"Không thể copy trên trình duyệt này\")}$(\"maintStatus\").textContent=\"Đã copy toàn bộ BÀN GIAO + BẢO TRÌ (\"+txt.length+\" ký tự)\"}catch(e){$(\"maintStatus\").textContent=\"Copy thất bại: \"+e.message}finally{btn.disabled=false}}\n $(\"maintbtn\").onclick=openMaintenance;$(\"backMaint\").onclick=()=>{$(\"maintenance\").classList.add(\"hidden\");$(\"talk\").classList.remove(\"hidden\");$(\"setupbtn\").classList.remove(\"hidden\");$(\"maintbtn\").classList.remove(\"hidden\")};\n $(\"readHandover\").onclick=()=>viewDoc(\"handover\");$(\"readMaintenance\").onclick=()=>viewDoc(\"maintenance\");$(\"refreshDocs\").onclick=()=>viewDoc(\"handover\");$(\"copyHandover\").onclick=()=>void copyDoc();\n $(\"setupbtn\").onclick=()=>showSetup(true);$(\"back\").onclick=()=>showSetup(false);$(\"stop\").onclick=stop;\n function styleUI(){const a={danh_da:\"styleDanh\",chem_gio:\"styleChem\",nghiem_tuc:\"styleNghiem\"};for(const k of Object.keys(a)){$(a[k]).classList.toggle(\"selected\",style===k);$(a[k]).setAttribute(\"aria-pressed\",String(style===k))}}\n for(const [id,value] of [[\"styleDanh\",\"danh_da\"],[\"styleChem\",\"chem_gio\"],[\"styleNghiem\",\"nghiem_tuc\"]])$(id).onclick=()=>{style=value;persist(\"nmh_voice_style_v2\",style);styleUI()};\n if(![\"danh_da\",\"chem_gio\",\"nghiem_tuc\"].includes(style))style=\"danh_da\";styleUI();\n $(\"save\").onclick=()=>{const v=$(\"key\").value.trim()||key;if(!/^sk-[A-Za-z0-9_-]{20,250}$/.test(v)){ $(\"keymsg\").textContent=\"Key không đúng định dạng\";return}key=v;$(\"key\").value=\"\";if($(\"remember\").checked){$(\"keymsg\").textContent=persist(K,key)?\"Đã lưu key trên iPhone này\":\"Không lưu được key: trình duyệt đang chặn bộ nhớ cục bộ\"}else{forget(K);$(\"keymsg\").textContent=\"Đã nhận key cho phiên hiện tại (không lưu)\"}};\n $(\"clear\").onclick=()=>{stop();key=\"\";forget(K);$(\"key\").value=\"\";$(\"keymsg\").textContent=\"Đã xóa key khỏi iPhone\"};\n async function api(path,k,body){const c=new AbortController();controller=c;try{const r=await fetch(path,{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},cache:\"no-store\",body:JSON.stringify({...body,apiKey:k}),signal:c.signal});const d=await r.json().catch(()=>({error:\"Backend không trả JSON\"}));if(!r.ok)throw Error(d.error||\"HTTP \"+r.status);return d}finally{if(controller===c)controller=null}}\n async function fetchSpeechAudio(text,voiceStyle,signal){const r=await fetch(\"/api/tts\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},cache:\"no-store\",body:JSON.stringify({apiKey:key,text,style:voiceStyle}),signal});if(!r.ok){let d={};try{d=await r.json()}catch{}throw Error(\"TTS_HTTP_\"+r.status+\" \"+String(d.code||\"UPSTREAM_ERROR\")+(d.detail?\" — \"+String(d.detail).slice(0,110):\"\"))}const ct=r.headers.get(\"content-type\")||\"\";if(!ct.includes(\"audio/\"))throw Error(\"TTS_NOT_AUDIO \"+ct);globalThis.ngoTtsSource=r.headers.get(\"x-nmh-tts-source\")||\"\";const buffer=await r.arrayBuffer();if(buffer.byteLength<128)throw Error(\"TTS_AUDIO_TOO_SMALL\");return buffer}\n async function playAudioBuffer(buffer,playbackSpeed,onDone){if(!audioCtx)throw Error(\"AUDIO_NOT_UNLOCKED\");if(audioCtx.state!==\"running\")await audioCtx.resume();if(audioCtx.state!==\"running\")throw Error(\"AUDIO_CONTEXT_SUSPENDED\");let decoded;try{decoded=await audioCtx.decodeAudioData(buffer.slice(0))}catch{throw Error(\"AUDIO_DECODE_FAILED\")}if(!decoded||decoded.duration<=0)throw Error(\"AUDIO_DECODE_EMPTY\");const s=audioCtx.createBufferSource();s.buffer=decoded;s.playbackRate.value=playbackSpeed;s.connect(audioCtx.destination);audioSource=s;s.onended=()=>{if(audioSource===s){audioSource=null;onDone?.()}};s.start(0);return {duration:decoded.duration,seconds:decoded.duration/playbackSpeed}}\n $(\"testVoice\").onclick=async()=>{const supplied=$(\"key\").value.trim();if(supplied&&/^sk-[A-Za-z0-9_-]{20,250}$/.test(supplied))key=supplied;if(!/^sk-[A-Za-z0-9_-]{20,250}$/.test(key)){ $(\"ttsDiagnostic\").textContent=\"TTS: Hãy lưu API key hợp lệ trước\";return}try{closeVoice();audioUnlock();$(\"ttsDiagnostic\").textContent=\"TTS: đang gọi OpenAI để tạo giọng Marin (lượt thử có phí)\";const ctl=new AbortController();ttsCtl=ctl;const bytes=await fetchSpeechAudio(\"Xin chào, tôi đang kiểm tra giọng nói tiếng Việt của NMH Voice.\",style,ctl.signal);if(ttsCtl!==ctl)return;const data=await playAudioBuffer(bytes,Math.min(2,Math.max(.7,(style===\"nghiem_tuc\"?1:1.455)*rate)),()=>{$(\"ttsDiagnostic\").textContent=\"TTS: MARIN ĐÃ PHÁT XONG, \"+data.duration.toFixed(1)+\" giây âm thanh\";setVoiceSource(\"OpenAI Marin — phát hoàn tất\")});recordCost({ttsSeconds:data.duration,ttsChunks:1});$(\"ttsDiagnostic\").textContent=\"TTS: MARIN ĐANG PHÁT, \"+bytes.byteLength+\" bytes MP3\";setVoiceSource(\"OpenAI Marin — đang phát\")}catch(e){const msg=String(e?.message||e);recordCost({ttsErrors:1});voiceLastError=msg;$(\"ttsDiagnostic\").textContent=\"TTS THẤT BẠI: \"+msg;setVoiceSource(\"OpenAI Marin — lỗi \"+msg)}};\n $(\"test\").onclick=async()=>{const v=$(\"key\").value.trim()||key;$(\"keymsg\").textContent=\"Đang kiểm tra…\";try{const d=await api(\"/api/test\",v,{});$(\"keymsg\").textContent=d.ok?\"Key hợp lệ, model \"+d.model:\"Kiểm tra thất bại\"}catch(e){$(\"keymsg\").textContent=e.message}};\n function listen(){if(!active)return;if(!navigator.onLine){showError(\"Mất mạng\");return}if(!SR){showError(\"Thiết bị không hỗ trợ SpeechRecognition\");return}closeRec();heard=\"\";const g=gen;let r;try{r=new SR();rec=r;r.lang=\"vi-VN\";r.continuous=false;r.interimResults=true;r.onresult=e=>{let final=\"\",interim=\"\";for(let i=0;i<e.results.length;i++){const t=e.results[i][0]?.transcript||\"\";if(e.results[i].isFinal)final+=t;else interim+=t}heard=(final||interim).trim()};r.onerror=e=>{if(rec!==r)return;if(e.error===\"no-speech\"){return}closeRec();showError(\"SpeechRecognition: \"+(e.error||\"unknown\")+\". Nhấn TIẾP TỤC.\")};r.onend=()=>{if(rec!==r)return;rec=null;if(!active||g!==gen)return;const text=heard.trim();if(!text){if(++noSpeech<=2){listen();return}setState(\"paused\");$(\"error\").textContent=\"Không nhận được lời nói. Nhấn TIẾP TỤC.\";return}noSpeech=0;if(text===lastText&&Date.now()-lastTime<1800){listen();return}lastText=text;lastTime=Date.now();void ask(text,g)};r.start();setState(\"listening\");$(\"error\").textContent=\"\"}catch(e){closeRec();showError(\"Không mở được micro: \"+e.message)}}\n async function ask(text,g){setState(\"processing\");history.push({role:\"user\",content:text});render();try{const d=await api(\"/api/chat\",key,{messages:history.slice(-12).map(m=>({role:m.role,content:m.content})),style});if(!active||g!==gen)return;recordCost({gptUsd:Number(d.estimatedModelUsd||0),webUsd:Number(d.estimatedWebSearchUsd||0)});history.push({role:\"assistant\",content:d.answer,sources:d.sources||[]});render();speak(d.answer,g)}catch(e){if(active&&g===gen)showError(\"OpenAI: \"+e.message)}}\n function speechParts(text){const sentences=String(text||\"\").match(/[^.!?]+[.!?]?/g)||[String(text||\"\")];const out=[];for(const sentence of sentences){let s=sentence.trim();while(s.length>440){let at=s.lastIndexOf(\" \",440);if(at<180)at=440;out.push(s.slice(0,at).trim());s=s.slice(at).trim()}if(s)out.push(s)}return out}\n async function speak(text,g){\n  closeVoice();\n  const request=ttsRequestId,parts=speechParts(text);\n  let index=0,prefetched=null;\n  const valid=()=>active&&g===gen&&request===ttsRequestId;\n  function startFetch(i){\n    const ctl=new AbortController();\n    // Always settle the prefetch promise: an early failure must not become an unhandled rejection.\n    const promise=fetchSpeechAudio(parts[i],style,ctl.signal).then(bytes=>({bytes}),error=>({error}));\n    return {index:i,ctl,promise};\n  }\n  async function next(){\n    if(!valid())return;\n    if(index>=parts.length){closeVoice();setVoiceSource(\"OpenAI Marin — đã phát hoàn tất\");listen();return}\n    const item=prefetched&&prefetched.index===index?prefetched:startFetch(index);\n    if(prefetched===item){prefetched=null;ttsPrefetchCtl=null}\n    ttsCtl=item.ctl;\n    setState(\"speaking\",\"OpenAI Marin, câu \"+(index+1)+\"/\"+parts.length);\n    setVoiceSource(\"OpenAI Marin — đang tổng hợp\");\n    try{\n      const result=await item.promise;\n      if(!valid())return;\n      if(result.error)throw result.error;\n      const audio=await playAudioBuffer(result.bytes,Math.min(2,Math.max(.7,(style===\"nghiem_tuc\"?1:1.455)*rate)),()=>{\n        if(!valid())return;\n        index++;\n        void next();\n      });\n      if(!valid())return;\n      recordCost({ttsSeconds:audio.duration,ttsChunks:1});\n      // Synthesize ONE segment ahead while the current segment plays.\n      // No second audio source is started, and interruption aborts both requests.\n      if(index+1<parts.length){\n        prefetched=startFetch(index+1);\n        ttsPrefetchCtl=prefetched.ctl;\n      }else ttsPrefetchCtl=null;\n      setVoiceSource(\"OpenAI Marin — đang phát (\"+audio.duration.toFixed(1)+\" giây)\");\n    }catch(e){\n      if(!valid()||item.ctl.signal.aborted)return;\n      const message=String(e?.message||e);\n      recordCost({ttsErrors:1});\n      voiceLastError=message;\n      closeVoice();\n      setVoiceSource(\"OpenAI Marin — LỖI: \"+message);\n      showError(\"TTS: \"+message+\". Mở SETUP → THỬ GIỌNG AI MARIN để kiểm tra.\");\n    }\n  }\n  await next();\n}\n $(\"start\").onclick=()=>{try{audioUnlock()}catch(e){showError(\"AUDIO_UNLOCK: \"+e.message);return}if(!key){showSetup(true);$(\"keymsg\").textContent=\"Nhập API key trước\";return}if(!window.isSecureContext){showError(\"Trang không có HTTPS\");return}if(!SR||!synth){showError(\"Safari thiếu SpeechRecognition hoặc SpeechSynthesis\");return}active=true;gen++;history=[];render();try{const u=new SpeechSynthesisUtterance(\"\");u.volume=0;synth.speak(u)}catch{}listen()};\n $(\"resume\").onclick=()=>{if(active){try{audioUnlock()}catch(e){showError(\"AUDIO_UNLOCK: \"+e.message);return}gen++;listen()}};$(\"interrupt\").onclick=()=>{if(active){gen++;closeVoice();listen()}};\n window.addEventListener(\"offline\",()=>active&&pause(\"Mất mạng\"));document.addEventListener(\"visibilitychange\",()=>{if(document.hidden&&active)pause(\"Ứng dụng chuyển nền; quay lại và nhấn TIẾP TỤC\")});\n function updateVoiceUI(){$(\"pitch\").value=pitch;$(\"rate\").value=rate;$(\"pitchvalue\").textContent=pitch.toFixed(2);$(\"ratevalue\").textContent=rate.toFixed(2)+\"×\"}\n $(\"pitch\").oninput=()=>{pitch=clamp($(\"pitch\").value,0.8,2,1.5);persist(P,String(pitch));updateVoiceUI()};\n $(\"rate\").oninput=()=>{rate=clamp($(\"rate\").value,0.7,1.4,1);persist(R,String(rate));updateVoiceUI()};\n $(\"resetvoice\").onclick=()=>{pitch=1;rate=1;persist(P,\"1\");persist(R,\"1\");updateVoiceUI()};\n $(\"preview\").onclick=()=>{if(active)pause(\"Tạm dừng để nghe thử giọng\");if(!synth||!window.SpeechSynthesisUtterance){$(\"keymsg\").textContent=\"iPhone không hỗ trợ TTS\";return}closeVoice();const u=new SpeechSynthesisUtterance(\"Xin chào, mình là trợ lý giọng nói. Hôm nay chúng mình nói chuyện nhé!\");u.lang=\"vi-VN\";const v=synth.getVoices().find(x=>x.lang.toLowerCase().startsWith(\"vi\"));if(v)u.voice=v;u.pitch=pitch;u.rate=rate;synth.speak(u)};\n $(\"remember\").checked=true;\n if(key)$(\"keymsg\").textContent=\"Đã khôi phục API key lưu trên iPhone này\";\n $(\"remember\").onchange=()=>{if(!$(\"remember\").checked){forget(K);$(\"keymsg\").textContent=\"Đã tắt lưu key trên iPhone\"}else if(key){$(\"keymsg\").textContent=persist(K,key)?\"Đã lưu key trên iPhone này\":\"Không thể lưu key trên thiết bị\"}};\n updateVoiceUI();renderCost();\n window.addEventListener(\"pagehide\",()=>{key=\"\";closeRec();closeVoice();controller?.abort()});render();setState(\"idle\");\n})();\n</script></body></html>"));
const h={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
const respond=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:h});
const valid=k=>typeof k==="string"&&/^sk-[A-Za-z0-9_-]{20,250}$/.test(k);
const validMsgs=x=>Array.isArray(x)&&x.length>=1&&x.length<=12&&x.every(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string"&&m.content.length>0&&m.content.length<=1800)&&x.at(-1).role==="user";
const MODEL_V2="gpt-6-luna";
export default {async fetch(request,env={},ctx={}){
const u=new URL(request.url);
if(request.method==="GET"&&u.pathname==="/"){const page=enhanceQrPage(enhanceLatencyPage(enhanceCorgiFace(enhanceThemePage(enhanceReminderPage(enhanceV3Page(PAGE,env),env)))),env);const voicePage=env.NMH_FAST_VOICE==="active"?enhanceFastVoice(page):page;return new Response((env.NMH_VOICE_BOOST==="off"?voicePage:enhanceVoiceBoost(voicePage)),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","content-security-policy":"default-src 'none'; script-src 'unsafe-inline' https://accounts.google.com/gsi/client; style-src 'unsafe-inline' https://accounts.google.com/gsi/style; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'","x-frame-options":"DENY","referrer-policy":"no-referrer"}});
}
if(request.method==="GET"&&u.pathname==="/health")return respond({ok:true,app:"NMH Voice GPT V2",voice:"browser-stt+marin-tts",agent:"gpt-6-luna",version:"v2-tts-audioctx",uiVersion:"presence-canvas-v1",v3Version:"d1-only-google-v3",writeVersion:"semantic-actions-d1-readback-v1"});
if(request.method==='GET'&&u.pathname==='/api/reminders/capabilities')return respond({enabled:remindersEnabled(env),version:'ngo-reminders-p0-v1',foregroundOnly:true});
if(u.pathname==='/api/reminders'||u.pathname.startsWith('/api/reminders/'))return routeReminderApi(request,env);
if(u.pathname.startsWith('/api/v3/'))return handleV3(request,env);
if(request.method==="GET"&&u.pathname.startsWith("/api/docs/")){
const names={"handover":"voice-deploy/START_HERE_NEXT_CHAT.md","maintenance":"MAINTENANCE.md"};
const file=names[u.pathname.slice("/api/docs/".length)];
if(!file)return respond({error:"Not found"},404);
try{
 const headers={"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
 const cache=typeof caches==="undefined"?null:caches.default;
 const key=new Request(u.origin+"/__nmh_docs_cache_v2/"+encodeURIComponent(file));
 let cached=null;
 try{cached=cache?await cache.match(key):null}catch{}
 if(cached){
  const data=await cached.text();
  if(data.length<=60000)return new Response(data,{headers:{...headers,"x-nmh-doc-source":"edge-cache"}});
 }
 let data=null,source="";
 try{
  const target="https://api.github.com/repos/hvnm1206/TikTak-Service/contents/"+file+"?ref=nmh-voice-gpt-v1";
  const r=await fetch(target,{headers:{"Accept":"application/vnd.github+json","User-Agent":"NMH-Voice-GPT"}});
  if(r.ok){
   const record=await r.json();
   if(record?.encoding==="base64"&&typeof record.content==="string"){
    const encoded=record.content.replace(/\s/g,"");
    if(encoded.length<=85000){
     data=new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));
     source="github-contents-api";
    }
   }
  }
 }catch{}
 if(!data){
  try{
   const target="https://raw.githubusercontent.com/hvnm1206/TikTak-Service/nmh-voice-gpt-v1/"+file+"?v="+Date.now();
   const r=await fetch(target,{headers:{"Accept":"text/plain","Cache-Control":"no-cache"}});
   if(r.ok){
    const raw=await r.text();
    const valid=raw.length>=50&&raw.length<=60000&&/^#\s+\S/m.test(raw)&&!/<(?:html|script|!doctype)\b/i.test(raw);
    if(valid){data=raw;source="github-raw-fallback-freshness-unverified"}
   }
  }catch{}
 }
 if(!data||data.length>60000)return respond({error:"GitHub chưa trả được tài liệu mới, mở liên kết GitHub ở phía dưới"},502);
 if(cache){try{await cache.put(key,new Response(data,{headers:{"cache-control":"public,max-age=120"}}))}catch{}}
 return new Response(data,{headers:{...headers,"x-nmh-doc-source":source}});
}catch{return respond({error:"Không kết nối được GitHub"},502)}
}
if(!["/api/test","/api/chat","/api/tts","/api/chat-stream","/api/realtime-speech-preview","/api/route-check","/api/memory-session"].includes(u.pathname))return respond({error:"Not found"},404);
if(request.method!=="POST")return respond({error:"POST only"},405);
if((u.pathname==="/api/chat-stream"||u.pathname==="/api/realtime-speech-preview")&&env.NMH_FAST_VOICE!=="active")return respond({error:"Not found"},404);
const origin=request.headers.get("origin");
if(!origin||origin!==u.origin)return respond({error:"Invalid origin"},403);
if(!/application\/json/i.test(request.headers.get("content-type")||""))return respond({error:"JSON required"},415);
let body;try{const s=await request.text();if(s.length>18000)return respond({error:"Request too large"},413);body=JSON.parse(s)}catch{return respond({error:"Invalid JSON"},400)}
const key=body?.apiKey;if(!valid(key))return respond({error:"API key không đúng định dạng"},400);
if((u.pathname==="/api/chat"||u.pathname==="/api/chat-stream")&&!validMsgs(body.messages))return respond({error:"Lịch sử hội thoại không hợp lệ"},400);
if(u.pathname==="/api/memory-session"){
 const m=body.messages;
 if(!(Array.isArray(m)&&m.length>=1&&m.length<=12&&m.every(x=>x&&(x.role==="user"||x.role==="assistant")&&typeof x.content==="string"&&x.content.length>0&&x.content.length<=1800)&&m.some(x=>x.role==="user")))return respond({error:"Lịch sử hội thoại không hợp lệ"},400);
 if(!personalMemoryEnabled(env)||memoryMode(env)==="off"||!env.NMH_DB)return respond({ok:true,learning:"off"},200);
 const sub=await memoryV2Subject(request,env).catch(()=>null);
 if(!sub)return respond({ok:true,learning:"no-session"},200);
 const run=observePersonalMemory({db:env.NMH_DB,sub,apiKey:key,messages:m,learnedAt:Date.now(),session:true}).catch(()=>{});
 if(typeof ctx?.waitUntil==="function")ctx.waitUntil(run);else await run;
 return respond({ok:true,learning:"queued"},202);
}
if(u.pathname==="/api/realtime-speech-preview"){
 const text=typeof body.text==="string"?body.text.trim():"";
 if(!text||text.length>300)return respond({error:"Văn bản thử phải từ 1 đến 300 ký tự."},400);
 try{
  const result=await previewRealtimeSpeech({key,text,signal:request.signal});
  return new Response(result.wave,{headers:{...h,'content-type':'audio/wav','x-nmh-first-byte-ms':String(result.firstByteMs),'x-nmh-voice-usage':JSON.stringify(result.usage)}});
 }catch(e){return respond({error:String(e?.message||'Lỗi Realtime').slice(0,150)},502)}
}
if(u.pathname==="/api/route-check"){ // 17/11/2026 trip monitor: TomTom only, no OpenAI call; same origin + key-format guard as other APIs
 const cl=k=>String(k||"").trim().replace(/^["']+|["']+$/g,"").trim(),tk=cl(env.TOMTOM_KEY),vk=cl(env.VIETMAP_KEY),useVm=vk&&!tk; // 17/11: the trip monitor needs live traffic -> TomTom whenever its key exists
 if(env.NGO_ROUTES==="off"||!(useVm||tk))return respond({error:"Tra đường đang tắt"},404);
 const r=useVm?await vietmapCheck({from:body?.from,to:body?.to,key:vk,signal:request.signal}):await tomtomCheck({from:body?.from,to:body?.to,key:tk,polyline:typeof body?.polyline==="string"?body.polyline:null,signal:request.signal});
 return respond(r,r.error?502:200);
}
if(u.pathname==="/api/tts"){
 const text=String(body?.text||"").replace(/(\d)\s*[*×]\s*(\d)/g,"$1 nhân $2").replace(/[*#_~`|]+/g," ").replace(/\s+/g," ").trim(),style=body?.style,pcm=body?.format==="pcm"; // never read markdown symbols aloud ("sao")
 if(!text||text.length>500)return respond({error:"Văn bản đọc không hợp lệ"},400);
 const speakingSpeed=style==="nghiem_tuc"?1:0.756;
 const instructions=style==="nghiem_tuc"?"Speak natural Vietnamese clearly and calmly.":"Speak lively conversational Vietnamese with a playful, youthful and expressive voice; clear Northern Vietnamese intonation.";
 // 16/11/2026: Google Chirp3-HD "Leda" (same voice as Ngáo, owner-chosen). Billed per character, so the
 // slow-generate/fast-play kid voice costs nothing extra. Any Google failure falls back to OpenAI Marin.
 let googleErr="";
 if(env.GOOGLE_TTS_KEY&&env.NGO_GOOGLE_TTS!=="off"){
  const gctl=new AbortController(),gtm=setTimeout(()=>gctl.abort(),20000);
  // 17/11/2026: route answers (long street chains, no full stop) were refused by Google ("sentences too long") and fell back
  // to Marin. Split sentences over ~160 chars at commas into separate sentences for Google only.
  const gtext=text.replace(/\s*(?:→|->|⇒)\s*/g,", ").split(/(?<=[.!?…])\s+/).map(sn=>{if(sn.length<=160)return sn;const out=[];let cur="";for(const part of sn.split(/,\s*/)){if(cur&&(cur+", "+part).length>140){out.push(cur);cur=part}else cur=cur?cur+", "+part:part}if(cur)out.push(cur);return out.map(x=>/[.!?…]$/.test(x)?x:x+".").join(" ")}).join(" ");
  try{
   const gr=await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key="+encodeURIComponent(env.GOOGLE_TTS_KEY),{method:"POST",headers:{"Content-Type":"application/json"},signal:gctl.signal,
    body:JSON.stringify({input:{text:gtext},voice:{languageCode:"vi-VN",name:env.NGO_GOOGLE_VOICE||"vi-VN-Chirp3-HD-Leda"},audioConfig:{audioEncoding:pcm?"LINEAR16":"MP3",sampleRateHertz:24000,speakingRate:speakingSpeed}})});
   // 18/11/2026: exceededResources on Workers Free. Decoding Google's base64 audio here cost 35-186 ms CPU per sentence
   // (measured), far over the 10 ms limit. Clients that ask for wire "b64" get Google's JSON untouched (zero CPU) and
   // decode on the iPhone; older clients (reminders player, cached pages) keep the binary path below.
   if(gr.ok&&body?.wire==="b64")return new Response(gr.body,{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-nmh-tts-source":"google-chirp3-leda","x-nmh-tts-wire":"google-b64"}});
   if(gr.ok){
    const gj=await gr.json();let bytes=Uint8Array.from(atob(String(gj?.audioContent||"")),c=>c.charCodeAt(0));
    if(pcm&&bytes.length>44&&String.fromCharCode(...bytes.subarray(0,4))==="RIFF"){
     for(let i=12;i+8<=bytes.length;){const id=String.fromCharCode(...bytes.subarray(i,i+4)),size=bytes[i+4]|bytes[i+5]<<8|bytes[i+6]<<16|bytes[i+7]<<24;if(id==="data"){bytes=bytes.subarray(i+8,Math.min(bytes.length,i+8+size));break}i+=8+size+(size&1)}
    }
    if(bytes.length>=128)return new Response(bytes,{status:200,headers:{"content-type":pcm?"audio/L16;rate=24000;channels=1":"audio/mpeg","cache-control":"no-store","x-content-type-options":"nosniff","x-nmh-tts-source":"google-chirp3-leda"}});
    googleErr="empty audio";
   }else googleErr="HTTP "+gr.status+" "+String((await gr.json().catch(()=>null))?.error?.message||"").slice(0,120);
  }catch(e){googleErr=String(e?.name||e).slice(0,60)}finally{clearTimeout(gtm)}
  console.warn("ngo-tts google fallback",googleErr); // visible in Workers logs; reason also returned in x-nmh-tts-google-error
 }
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),30000);
 try{
  const r=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},signal:ctl.signal,
  body:JSON.stringify({model:"gpt-4o-mini-tts",voice:"marin",input:text,instructions,response_format:pcm?"pcm":"mp3",speed:speakingSpeed})});
  if(!r.ok){
   let detail="";try{const err=await r.json();detail=String(err?.error?.message||"").slice(0,160)}catch{}
   const code=r.status===401?"TTS_INVALID_API_KEY":r.status===403?"TTS_PERMISSION_DENIED":r.status===429?"TTS_RATE_LIMIT":r.status===400?"TTS_INVALID_REQUEST":"TTS_UPSTREAM_ERROR";
   return respond({error:"OpenAI TTS trả HTTP "+r.status,code,detail},r.status===401?401:r.status===403?403:r.status===429?429:r.status===400?400:502);
  }
  const contentType=r.headers.get("content-type")||"";
  if(!contentType.includes("audio/")&&!contentType.includes("octet-stream"))return respond({error:"OpenAI TTS trả dữ liệu không phải âm thanh",code:"TTS_NON_AUDIO_RESPONSE"},502);
  return new Response(r.body,{status:200,headers:{"content-type":pcm?"audio/L16;rate=24000;channels=1":"audio/mpeg","cache-control":"no-store","x-content-type-options":"nosniff","x-nmh-tts-source":"openai-marin",...(googleErr?{"x-nmh-tts-google-error":googleErr.replace(/[^\x20-\x7E]/g,"?")}:{})}});
 }catch(e){return respond({error:e?.name==="AbortError"?"TTS quá thời gian":"Không kết nối TTS"},504)}finally{clearTimeout(tm)}
}
const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),55000);
try{
 if(u.pathname==="/api/test"){
   const r=await fetch("https://api.openai.com/v1/models/"+MODEL_V2,{headers:{"Authorization":"Bearer "+key},signal:ctl.signal});
   return r.ok?respond({ok:true,model:MODEL_V2}):respond({error:r.status===401?"API key không hợp lệ":"OpenAI HTTP "+r.status},r.status===401?401:502);
 }
 if(u.pathname==="/api/chat-stream"){
   clearTimeout(timer);
   return streamChat(request,onEvent=>chatTurn(request,env,ctx,body,key,onEvent.signal,onEvent.send));
 }
 const result=await chatTurn(request,env,ctx,body,key,AbortSignal.any([request.signal,ctl.signal]));
 return respond(result,result.error?503:200);
}catch(e){
 const msg=e?.name==="AbortError"?"Quá thời gian xử lý":String(e?.message||"Không kết nối được OpenAI").slice(0,160);
 return respond({error:msg},/hạn mức/.test(msg)?429:/không hợp lệ/.test(msg)?401:502);
}finally{clearTimeout(timer)}
}};

async function chatTurn(request,env,ctx,body,key,signal,onEvent){
 const question=String(body.messages.at(-1).content);
 // All natural-language operations are selected by the same GPT conversation.
 // No phrase-matching router, duplicate model classifier, or special memory path.
 const perfStart=performance.now(),learnedAt=Date.now();
 const personalization=await loadV3Context(request,env,question);
 const perfMemory=performance.now();
 if(personalization.contextError)return {error:personalization.contextError};
 const actionRuntime=buildActionRuntime({request,env,utterance:question,requestId:body.requestId,signal});
 const perfAgentStart=performance.now();
 // 16/11/2026: optional Google driving routes. Off unless the user switched it on in SETUP; env NGO_ROUTES=off disables for everyone.
 const rq=body?.route,clean=k=>String(k||"").trim().replace(/^["']+|["']+$/g,"").trim(),tmk=clean(env.TOMTOM_KEY),vmk=clean(env.VIETMAP_KEY),gmk=clean(env.GOOGLE_MAPS_KEY); // 17/11: keys tolerate pasted spaces/quotes
 const rprov=env.NGO_ROUTE_PROVIDER==="tomtom"&&tmk?"tomtom":vmk?"vietmap":tmk?"tomtom":"google",rkey=rprov==="tomtom"?tmk:rprov==="vietmap"?vmk:gmk,cmpKey=env.NGO_ROUTE_COMPARE==="off"?null:rprov==="tomtom"?(vmk||null):rprov==="vietmap"?(tmk||null):null; // owner 17/11: Vietmap primary when its key exists; NGO_ROUTE_PROVIDER=tomtom reverts
 const routeContext=rq&&rq.enabled===true&&rkey&&env.NGO_ROUTES!=="off"?{apiKey:rkey,provider:rprov,compareKey:cmpKey,origin:(Number.isFinite(rq.origin?.lat)&&Number.isFinite(rq.origin?.lng)&&Math.abs(rq.origin.lat)<=90&&Math.abs(rq.origin.lng)<=180)?{lat:+rq.origin.lat,lng:+rq.origin.lng,...(Number.isFinite(+rq.origin.acc)&&+rq.origin.acc>=0?{acc:Math.round(+rq.origin.acc)}:{})}:null}:null;
 let result;
 const searchContext=buildSearchContext(env);
 try{result=await runAgent({apiKey:key,messages:body.messages,style:body.style,personalization,signal,actionRuntime,onEvent,routeContext,searchContext,reasoning:env.NGO_REASONING||"low"})}
 catch(e){console.warn(JSON.stringify({t:"ngo-turn",ok:false,err:String(e?.message||e).replace(/sk-[A-Za-z0-9_-]+/g,"sk-***").slice(0,200)}));throw e}
 // 17/11 trace for "không tra web được": tool names, search count, model only - no conversation content, no keys
 console.log(JSON.stringify({t:"ngo-turn",ok:true,tools:result?.tools||[],web:result?.webSearchCalls||0,model:result?.model,routes:!!routeContext}));
 const latency={memoryMs:Math.round(perfMemory-perfStart),agentMs:Math.round(performance.now()-perfAgentStart),serverMs:Math.round(performance.now()-perfStart)};
 // Verified tool actions are completed synchronously and are not reinterpreted by the background memory observer.
 if(result.actionStatus&&!personalMemoryEnabled(env))return {...result,latency};
 // The new analyzer is an isolated observer. Off by default, never changes the spoken reply.
 // No extra network call, SQL or mic/TTS handling when disabled.
 const mode=memoryMode(env);
 // 20/11/2026 owner (cost): personal memory learns from batches sent by the iPhone (/api/memory-session: every few turns
 // and at KẾT THÚC), not after every sentence. NGO_MEMORY_LEARN=per-turn restores the old behaviour.
 const perTurn=!personalMemoryEnabled(env)||env.NGO_MEMORY_LEARN==="per-turn";
 if(perTurn&&mode!=='off'&&typeof ctx?.waitUntil==='function'){
  const observe=(async()=>{
   try{
    const sub=await memoryV2Subject(request,env);
    if(!sub)return;
    const flag=await env.NMH_DB.prepare('SELECT enabled FROM v3_memory_v2_preferences WHERE user_id=?').bind(sub).first();
    if(flag?.enabled!==1)return; // opt-in only
    if(personalMemoryEnabled(env)){
     await observePersonalMemory({db:env.NMH_DB,sub,apiKey:key,messages:body.messages,learnedAt,skipAction:!!result.actionStatus});
    }else await runMemoryV2({mode,sub,db:env.NMH_DB,apiKey:key,userText:question,assistantText:result.answer});
   }catch{} // never interrupt or modify existing voice/chat/search response
  })();
  ctx.waitUntil(observe);
 }
 return {...result,latency};
}

// 20/11/2026 owner: web search through Tavily's free quota; OpenAI web_search only as a fallback, at most N per day
// (NGO_WEB_FALLBACK_DAILY, default 5) counted in D1. No D1 or a counter error = no paid fallback (fail closed).
export function buildSearchContext(env){
 const tavilyKey=String(env?.TAVILY_KEY||"").trim().replace(/^["']+|["']+$/g,"").trim();
 if(!tavilyKey||env?.NGO_SEARCH==="openai")return null;
 const cap=Math.max(0,Math.min(50,Number.parseInt(env?.NGO_WEB_FALLBACK_DAILY??"5",10)||0));
 const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date());
 return {tavilyKey,
  async fallbackAvailable(){if(!env.NMH_DB||!cap)return false;const r=await env.NMH_DB.prepare("SELECT n FROM ngo_usage_daily WHERE day=? AND kind='openai_web_fallback'").bind(day()).first();return Number(r?.n||0)<cap},
  async recordFallback(n){if(!env.NMH_DB)return;await env.NMH_DB.prepare("INSERT INTO ngo_usage_daily(day,kind,n) VALUES(?,'openai_web_fallback',?) ON CONFLICT(day,kind) DO UPDATE SET n=n+excluded.n").bind(day(),Math.max(1,Math.round(n)||1)).run()}};
}

function streamChat(request,execute){
 const upstream=new AbortController();
 const signal=AbortSignal.any([request.signal,upstream.signal,AbortSignal.timeout(55000)]);
 const {readable,writable}=new TransformStream();
 const writer=writable.getWriter(),encoder=new TextEncoder();
 const send=event=>writer.write(encoder.encode(JSON.stringify(event)+'\n'));
 void writer.closed.catch(()=>{upstream.abort()});
 void (async()=>{
  let markedText=false;
  try{
   const result=await execute({signal,send:async event=>{
    if(event.type==='firstText'){
     if(markedText)return;
     markedText=true;
    }
    await send(event);
   }});
   if(signal.aborted)throw signal.reason;
   await send(result.error?{type:'error',error:result.error}:{type:'done',result});
  }catch(e){
   await send({type:'error',error:e?.name==='TimeoutError'||e?.name==='AbortError'?'Quá thời gian xử lý':String(e?.message||'Lỗi Voice').slice(0,160)}).catch(()=>{});
  }finally{await writer.close().catch(()=>{})}
 })();
 return new Response(readable,{headers:{...h,'content-type':'application/x-ndjson; charset=utf-8'}});
}
