// Ngố voice boost (15/11/2026): two iPhone-side fixes, each with its own SETUP switch.
// 1) Loudspeaker audio session: after Safari SpeechRecognition the page stays in the
//    record-capable audio session, where iOS plays Web Audio quietly (voice-processing route).
//    Switch to "playback" while Ngố speaks, back to "auto" before the mic opens.
//    Uses WebKit navigator.audioSession when present; silently skipped elsewhere.
// 2) Fast end-of-speech: Safari's own endpoint waits for a long silence before final result.
//    When interim text stops changing for ENDPOINT_MS, stop recognition so the turn starts sooner.
export const ENDPOINT_MS=1000;
const HELPERS=String.raw`
 let ngoLoudSpeaker=load("ngo_loud_speaker_v1","1")!=="0",ngoFastEndpoint=load("ngo_fast_endpoint_v1","1")!=="0";
 function ngoAudioSession(type){try{const s=navigator.audioSession;if(!s)return;const want=ngoLoudSpeaker?type:"auto";if(s.type!==want)s.type=want}catch{}}
`;
const SETUP_HTML='<div style="margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid #334155"><strong>TĂNG TỐC &amp; LOA</strong>'+
 '<label><input id="ngoLoudSpeaker" type="checkbox" style="width:auto"> Ưu tiên loa ngoài khi Ngố nói (iPhone)</label>'+
 '<label><input id="ngoFastEndpoint" type="checkbox" style="width:auto"> Chốt câu nhanh ('+(ENDPOINT_MS/1000).toFixed(1)+' giây im lặng)</label>'+
 '<p class="hint">Tắt "chốt câu nhanh" nếu Ngố hay cắt ngang khi anh ngập ngừng. Tắt "loa ngoài" nếu micro không nhận sau khi Ngố nói.</p></div>';
const SETUP_JS=String.raw`
 $("ngoLoudSpeaker").checked=ngoLoudSpeaker;$("ngoFastEndpoint").checked=ngoFastEndpoint;
 $("ngoLoudSpeaker").onchange=()=>{ngoLoudSpeaker=$("ngoLoudSpeaker").checked;persist("ngo_loud_speaker_v1",ngoLoudSpeaker?"1":"0");ngoAudioSession("auto")};
 $("ngoFastEndpoint").onchange=()=>{ngoFastEndpoint=$("ngoFastEndpoint").checked;persist("ngo_fast_endpoint_v1",ngoFastEndpoint?"1":"0")};
`;
function once(text,from,to){
 const n=text.split(from).length-1;
 if(n!==1)throw Error('NGO_VOICE_BOOST_MISMATCH '+n+': '+from.slice(0,70));
 return text.replace(from,to);
}
export function enhanceVoiceBoost(page){
 let p=page;
 p=once(p,' const labels={idle:',HELPERS+' const labels={idle:');
 // Audio session: playback while speaking, auto before the microphone opens.
 p=once(p,'if(!audioCtx)throw Error("AUDIO_NOT_UNLOCKED");','ngoAudioSession("playback");if(!audioCtx)throw Error("AUDIO_NOT_UNLOCKED");');
 p=once(p,'closeRec();heard="";','closeRec();ngoAudioSession("auto");heard="";');
 // Fast endpoint, scoped to this recognizer instance.
 p=once(p,'const g=gen;let r;','const g=gen;let r,ngoEndTimer=null;');
 p=once(p,'if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110)};',
  'if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110);clearTimeout(ngoEndTimer);if(ngoFastEndpoint&&heard)ngoEndTimer=setTimeout(()=>{if(rec===r){try{r.stop()}catch{}}},'+ENDPOINT_MS+')};');
 p=once(p,'r.onend=()=>{if(rec!==r)return;','r.onend=()=>{clearTimeout(ngoEndTimer);if(rec!==r)return;');
 // SETUP switches next to the voice panel.
 p=once(p,'<h3 style="margin:0 0 12px">TÙY CHỈNH GIỌNG NÓI</h3>','<h3 style="margin:0 0 12px">TÙY CHỈNH GIỌNG NÓI</h3>'+SETUP_HTML);
 p=once(p,'$("gain").oninput=',SETUP_JS+'$("gain").oninput=');
 return p;
}
