// Voice latency instrumentation + shorter first Marin segment, independent from mic/GPT tools.
// Never logs speech text, API keys or user IDs. Measurements are per-turn UI-only.
const MARKER='window.nmhVoiceLatencyMark';
const CODE=String.raw`
const latencyClock={start:0,marks:{},server:null,speechEnd:null};
function markVoiceLatency(name){
 const now=performance.now();
 if(name==='listen'){latencyClock.speechEnd=null;return}
 if(name==='speechEnd'){latencyClock.speechEnd=now;return}
 if(!latencyClock.start&&name!=='recognized')return;
 if(name==='recognized'){latencyClock.start=now;latencyClock.marks={recognized:0,speechTail:latencyClock.speechEnd==null?null:now-latencyClock.speechEnd};latencyClock.server=null;return}
 latencyClock.marks[name]=Math.max(0,Math.round(now-latencyClock.start));
 const output=document.getElementById('nmhVoiceLatencyReport');
 if(!output)return;
 const m=latencyClock.marks,server=latencyClock.server||{};
 const f=n=>Number.isFinite(n)?(n/1000).toFixed(2)+'s':'—';
 const first=m.firstAudio;
 const firstText=m.firstText!=null&&m.chatStart!=null?m.firstText-m.chatStart:null;
 const firstByte=m.ttsFirstByte!=null&&m.ttsStart!=null?m.ttsFirstByte-m.ttsStart:null;
 const decode=m.firstAudio!=null&&m.ttsReady!=null?m.firstAudio-m.ttsReady:null;
 const chat=m.chatDone!=null&&m.chatStart!=null?m.chatDone-m.chatStart:null;
 const tts=first!=null&&m.ttsStart!=null?first-m.ttsStart:null;
 output.textContent='ĐỘ TRỄ · Safari chốt câu '+f(m.speechTail)+' · chữ GPT đầu '+f(firstText)+' · GPT hoàn tất '+f(chat)+' · byte âm thanh đầu '+f(firstByte)+' · giải mã/phát '+f(decode)+' · âm thanh '+f(tts)+' · chốt câu → tiếng đầu '+f(first)+' · Memory/D1 '+f(server.memoryMs);
}
window.nmhVoiceLatencyMark=markVoiceLatency;
window.nmhVoiceLatencyServer=data=>{latencyClock.server=data&&typeof data==='object'?data:null;markVoiceLatency('serverReady')};
`;
function once(text,from,to){
 const occurrences=text.split(from).length-1;
 if(occurrences!==1)throw Error('NMH latency patch mismatch '+occurrences+': '+from.slice(0,85));
 return text.replace(from,to);
}
export function enhanceLatencyPage(original){
 let p=original;
 p=once(p,' const labels={idle:',CODE+' const labels={idle:');
 p=once(p,'r.interimResults=true;r.onresult=', 'r.interimResults=true;globalThis.nmhVoiceLatencyMark?.("listen");r.onspeechend=()=>{if(rec===r)globalThis.nmhVoiceLatencyMark?.("speechEnd")};r.onresult=');
 p=once(p,'void ask(text,g)};r.start();','globalThis.nmhVoiceLatencyMark?.("recognized");void ask(text,g)};r.start();');
 p=once(p,'try{const d=await api("/api/chat",key,{messages:','try{globalThis.nmhVoiceLatencyMark?.("chatStart");const d=await api("/api/chat",key,{messages:');
 p=once(p,'style});if(!active||g!==gen)return;recordCost({gptUsd:','style});globalThis.nmhVoiceLatencyMark?.("chatDone");globalThis.nmhVoiceLatencyServer?.(d.latency);if(!active||g!==gen)return;recordCost({gptUsd:');
 p=once(p,'const ctl=new AbortController();\n    // Always settle the prefetch promise:','if(i===0)globalThis.nmhVoiceLatencyMark?.("ttsStart");const ctl=new AbortController();\n    // Always settle the prefetch promise:');
 p=once(p,'if(result.error)throw result.error;\n      const audio=await playAudioBuffer','if(result.error)throw result.error;\n      if(index===0)globalThis.nmhVoiceLatencyMark?.("ttsReady");\n      const audio=await playAudioBuffer');
 p=once(p,'if(!valid())return;\n      recordCost({ttsSeconds:audio.duration','if(!valid())return;\n      if(index===0)globalThis.nmhVoiceLatencyMark?.("firstAudio");\n      recordCost({ttsSeconds:audio.duration');
 // Limit ONLY the first synthesized chunk, subsequent chunks retain established 440-char ceiling.
 // Preserves every word in order; splits at whitespace when possible.
 const old='while(s.length>440){let at=s.lastIndexOf(" ",440);if(at<180)at=440;out.push(s.slice(0,at).trim());s=s.slice(at).trim()}';
 const updated='while(s.length>(out.length===0?180:440)){const max=out.length===0?180:440;let at=s.lastIndexOf(" ",max);if(at<Math.floor(max*.5))at=max;out.push(s.slice(0,at).trim());s=s.slice(at).trim()}';
 p=once(p,old,updated);
 // Diagnostic is user-readable but does not disclose transcript/keys or call network.
 p=once(p,'<h2>SETUP</h2>','<h2>SETUP</h2><p id="nmhVoiceLatencyReport" class="hint" role="status">ĐỘ TRỄ · chưa có lượt nói. Hiển thị sau lần trò chuyện tiếp theo.</p>');
 return p;
}
