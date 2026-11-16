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
 var ngoStreamVoice=load("ngo_stream_voice_v1","1")!=="0";
 // 16/11/2026: the last ~0.1-0.2 s of speech still sits in the iPhone output buffer when the final source ends;
 // opening the microphone at once switches the audio session and clips the last word. Wait for output latency + margin.
 function ngoListenAfterPlayback(){const g0=gen,lat=(audioCtx&&(audioCtx.outputLatency||0)+(audioCtx.baseLatency||0))||0,ms=Math.round(Math.min(.7,lat+.3)*1000);setTimeout(()=>{if(active&&gen===g0&&!rec)listen()},ms)}
 // 16/11/2026: optional driving routes (Google Maps). OFF by default; location is read only while the switch is on.
 let ngoRoutesOn=load("ngo_routes_v1","0")==="1",ngoGeo=null,ngoGeoWatch=null;
 function ngoGeoStart(){try{if(!navigator.geolocation||ngoGeoWatch!==null)return;ngoGeoWatch=navigator.geolocation.watchPosition(p=>{ngoGeo={lat:p.coords.latitude,lng:p.coords.longitude,at:Date.now()}},()=>{},{enableHighAccuracy:false,maximumAge:60000,timeout:15000})}catch{}}
 function ngoGeoStop(){try{if(ngoGeoWatch!==null)navigator.geolocation.clearWatch(ngoGeoWatch)}catch{}ngoGeoWatch=null;ngoGeo=null}
 globalThis.ngoRouteContext=()=>ngoRoutesOn?{route:{enabled:true,origin:ngoGeo&&Date.now()-ngoGeo.at<10*60000?{lat:ngoGeo.lat,lng:ngoGeo.lng}:null}}:{};
 globalThis.ngoShowMapsLink=url=>{try{let b=document.getElementById("ngoMapsLink");if(!ngoRoutesOn||!url||!/^https:\/\/www\.google\.com\/maps\/dir\//.test(url)){b?.remove();return}
  if(!b){b=document.createElement("a");b.id="ngoMapsLink";b.target="_blank";b.rel="noopener";b.textContent="🗺️ Mở Google Maps dẫn đường";b.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:50;background:#2563eb;color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;text-decoration:none;box-shadow:0 6px 20px #0008";document.body.appendChild(b)}
  b.href=url;clearTimeout(b._t);b._t=setTimeout(()=>b.remove(),5*60000)}catch{}};
 if(ngoRoutesOn)ngoGeoStart();
 function ngoAudioSession(type){try{const s=navigator.audioSession;if(!s)return;const want=ngoLoudSpeaker?type:"auto";if(s.type!==want)s.type=want}catch{}}
`;
const SETUP_HTML='<div style="margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid #334155"><strong>TĂNG TỐC &amp; LOA</strong>'+
 '<label><input id="ngoLoudSpeaker" type="checkbox" style="width:auto"> Ưu tiên loa ngoài khi Ngố nói (iPhone)</label>'+
 '<label><input id="ngoFastEndpoint" type="checkbox" style="width:auto"> Chốt câu nhanh ('+(ENDPOINT_MS/1000).toFixed(1)+' giây im lặng)</label>'+
 '<label><input id="ngoStreamVoice" type="checkbox" style="width:auto"> Phát giọng ngay khi đang tải (nhanh hơn ~3 giây)</label>'+
 '<label><input id="ngoRoutes" type="checkbox" style="width:auto"> Tra đường &amp; giao thông (ô tô, dữ liệu TomTom) — dùng vị trí iPhone</label>'+
 '<p class="hint">Tắt "chốt câu nhanh" nếu Ngố hay cắt ngang khi anh ngập ngừng. Tắt "loa ngoài" nếu micro không nhận sau khi Ngố nói. Tắt "phát ngay" để so với cách cũ (chậm hơn) nếu thấy tiếng không mượt.</p></div>';
const SETUP_JS=String.raw`
 $("ngoLoudSpeaker").checked=ngoLoudSpeaker;$("ngoFastEndpoint").checked=ngoFastEndpoint;
 $("ngoLoudSpeaker").onchange=()=>{ngoLoudSpeaker=$("ngoLoudSpeaker").checked;persist("ngo_loud_speaker_v1",ngoLoudSpeaker?"1":"0");ngoAudioSession("auto")};
 $("ngoStreamVoice").checked=ngoStreamVoice;$("ngoStreamVoice").onchange=()=>{ngoStreamVoice=$("ngoStreamVoice").checked;persist("ngo_stream_voice_v1",ngoStreamVoice?"1":"0")};
 $("ngoRoutes").checked=ngoRoutesOn;$("ngoRoutes").onchange=()=>{ngoRoutesOn=$("ngoRoutes").checked;persist("ngo_routes_v1",ngoRoutesOn?"1":"0");if(ngoRoutesOn)ngoGeoStart();else{ngoGeoStop();globalThis.ngoShowMapsLink(null)}};
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
 p=once(p,'body:JSON.stringify({...body,apiKey:k})','body:JSON.stringify({...body,apiKey:k,...(path==="/api/chat"?globalThis.ngoRouteContext?.()||{}:{})})');
 p=once(p,'if(!r.ok)throw Error(d.error||"HTTP "+r.status);return d}finally{if(controller===c)controller=null}}','if(!r.ok)throw Error(d.error||"HTTP "+r.status);if(path==="/api/chat")globalThis.ngoShowMapsLink?.(d.mapsUrl);return d}finally{if(controller===c)controller=null}}');
 if(p.includes('body:JSON.stringify({...body,apiKey:key})')){
  p=once(p,'body:JSON.stringify({...body,apiKey:key})','body:JSON.stringify({...body,apiKey:key,...(globalThis.ngoRouteContext?.()||{})})');
  p=once(p,'if(d.type==="done")result=d.result;','if(d.type==="done"){result=d.result;globalThis.ngoShowMapsLink?.(result?.mapsUrl)}');
 }
 p=once(p,'setVoiceSource("OpenAI Marin — đã phát hoàn tất");listen();return}','setVoiceSource((String(globalThis.ngoTtsSource||"").startsWith("google")?"Google Leda":"OpenAI Marin")+" — đã phát hoàn tất");ngoListenAfterPlayback();return}');
 p=once(p,'if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110)};',
  'if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110);clearTimeout(ngoEndTimer);if(ngoFastEndpoint&&heard)ngoEndTimer=setTimeout(()=>{if(rec===r){try{r.stop()}catch{}}},'+ENDPOINT_MS+')};');
 p=once(p,'r.onend=()=>{if(rec!==r)return;','r.onend=()=>{clearTimeout(ngoEndTimer);if(rec!==r)return;');
 // SETUP switches next to the voice panel.
 p=once(p,'<h3 style="margin:0 0 12px">TÙY CHỈNH GIỌNG NÓI</h3>','<h3 style="margin:0 0 12px">TÙY CHỈNH GIỌNG NÓI</h3>'+SETUP_HTML);
 p=once(p,'$("gain").oninput=',SETUP_JS+'$("gain").oninput=');
 return p;
}
