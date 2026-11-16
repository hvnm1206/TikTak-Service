// Ngố voice boost (15/11/2026): two iPhone-side fixes, each with its own SETUP switch.
// 1) Loudspeaker audio session: after Safari SpeechRecognition the page stays in the
//    record-capable audio session, where iOS plays Web Audio quietly (voice-processing route).
//    Switch to "playback" while Ngố speaks, back to "auto" before the mic opens.
//    Uses WebKit navigator.audioSession when present; silently skipped elsewhere.
// 2) Fast end-of-speech: Safari's own endpoint waits for a long silence before final result.
//    When interim text stops changing for ENDPOINT_MS, stop recognition so the turn starts sooner.
export const ENDPOINT_MS=1000;
export const TRIP_LOGIC=String.raw`
 // 17/11/2026 trip monitor (owner: "Hướng 2" - Google Maps does turn-by-turn, Ngố watches traffic while it stays open).
 // Pure decision: compare a fresh TomTom check from the current position with the trip baseline; speak only on real change.
 function ngoTripDecide(trip,check,now){
  const routes=(check&&Array.isArray(check.routes))?check.routes:[];if(!routes.length)return {say:null,trip};
  const streets=x=>String(x||"").split(" → ").filter(Boolean),own=streets(trip.path);
  const score=r=>streets(r.path).filter(x=>own.includes(x)).length;
  const best=routes[0];let cur=routes.reduce((a,r)=>score(r)>score(a)?r:a,routes[0]);if(!score(cur))cur=best;
  const t={...trip,alerted:[...(trip.alerted||[])]},msgs=[],seen=k=>t.alerted.includes(k),mark=k=>t.alerted.push(k);
  const hhmm=ms=>new Date(ms).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Ho_Chi_Minh"});
  for(const j of (cur.slow_points||[]))if(j.kind!=="ùn tắc"&&!seen("inc:"+j.street+j.kind)){mark("inc:"+j.street+j.kind);msgs.push("Phía trước có "+j.kind+" ở "+j.street+", chậm khoảng "+j.delay_minutes+" phút.")}
  const end=now+(Number(cur.seconds_now)||0)*1000,worse=Math.round((end-t.expectEnd)/60000);
  const quiet=now-(t.lastAlertAt||0)>=6*60000;
  if(worse>=5&&quiet){const jam=(cur.slow_points||[]).find(j=>j.kind==="ùn tắc");msgs.push("Đường phía trước chậm thêm khoảng "+worse+" phút"+(jam?", tắc ở "+jam.street:"")+". Dự kiến tới lúc "+hhmm(end)+".");t.expectEnd=end}
  else if(worse<=-5)t.expectEnd=end; // got faster: move the baseline quietly
  const gain=Math.round(((Number(cur.seconds_now)||0)-(Number(best.seconds_now)||0))/60);
  if(cur!==best&&gain>=4&&quiet&&!seen("alt:"+best.path)){mark("alt:"+best.path);msgs.push("Có đường nhanh hơn khoảng "+gain+" phút"+(best.path?", đi qua "+best.path:"")+". Bấm nút Google Maps để đổi đường.");t.altUrl=true}
  if(msgs.length)t.lastAlertAt=now;
  return {say:msgs.length?msgs.slice(0,2).join(" "):null,trip:t};
 }
 function ngoDistM(a,b){const R=6371000,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
`;
const HELPERS=String.raw`
 let ngoLoudSpeaker=load("ngo_loud_speaker_v1","1")!=="0",ngoFastEndpoint=load("ngo_fast_endpoint_v1","1")!=="0";
 var ngoStreamVoice=load("ngo_stream_voice_v1","1")!=="0";
 // 16/11/2026: the last ~0.1-0.2 s of speech still sits in the iPhone output buffer when the final source ends;
 // opening the microphone at once switches the audio session and clips the last word. Wait for output latency + margin.
 function ngoListenAfterPlayback(){const g0=gen,lat=(audioCtx&&(audioCtx.outputLatency||0)+(audioCtx.baseLatency||0))||0,ms=Math.round(Math.min(.7,lat+.3)*1000);setTimeout(()=>{if(active&&gen===g0&&!rec)listen()},ms)}
 // 16/11/2026: optional driving routes (Google Maps). OFF by default; location is read only while the switch is on.
 let ngoRoutesOn=load("ngo_routes_v1","0")==="1",ngoGeo=null,ngoGeoWatch=null;
 let ngoGeoErr="";
 function ngoGeoShow(){try{const el=document.getElementById("ngoGeoStatus");if(!el)return;el.textContent=!ngoRoutesOn?"":ngoGeo?"📍 Đã có vị trí iPhone ("+Math.round((Date.now()-ngoGeo.at)/1000)+" giây trước)":ngoGeoErr==="denied"?"⚠️ iPhone đang CHẶN vị trí cho Safari: Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị → Trang web Safari → Khi dùng ứng dụng; rồi tải lại Ngố.":ngoGeoErr?"⚠️ Chưa lấy được vị trí ("+ngoGeoErr+").":"⏳ Đang lấy vị trí…"}catch{}}
 function ngoGeoOk(p){ngoGeo={lat:p.coords.latitude,lng:p.coords.longitude,at:Date.now()};ngoGeoErr="";ngoGeoShow()}
 function ngoGeoFail(e){ngoGeoErr=e&&e.code===1?"denied":e&&e.code===3?"hết thời gian chờ":"không xác định";ngoGeoShow()}
 function ngoGeoStart(){try{if(!navigator.geolocation){ngoGeoErr="trình duyệt không hỗ trợ";ngoGeoShow();return}if(ngoGeoWatch!==null)return;ngoGeoWatch=navigator.geolocation.watchPosition(ngoGeoOk,ngoGeoFail,{enableHighAccuracy:false,maximumAge:60000,timeout:15000});ngoGeoShow()}catch{}}
 // Before a question is sent: use a fix < 10 min old, otherwise ask the iPhone once and wait up to 6 s.
 globalThis.ngoRouteContextAsync=async()=>{if(!ngoRoutesOn)return {};if(!(ngoGeo&&Date.now()-ngoGeo.at<10*60000)&&navigator.geolocation){
  await new Promise(res=>{let done=false;const end=()=>{if(!done){done=true;res()}};setTimeout(end,6000);try{navigator.geolocation.getCurrentPosition(p=>{ngoGeoOk(p);end()},e=>{ngoGeoFail(e);end()},{enableHighAccuracy:false,maximumAge:120000,timeout:6000})}catch{end()}})}
  return globalThis.ngoRouteContext()};
 function ngoGeoStop(){try{if(ngoGeoWatch!==null)navigator.geolocation.clearWatch(ngoGeoWatch)}catch{}ngoGeoWatch=null;ngoGeo=null}
 globalThis.ngoRouteContext=()=>ngoRoutesOn?{route:{enabled:true,origin:ngoGeo&&Date.now()-ngoGeo.at<10*60000?{lat:ngoGeo.lat,lng:ngoGeo.lng}:null}}:{};
 globalThis.ngoShowRouteError=err=>{try{let e=document.getElementById("ngoRouteErr");if(!ngoRoutesOn||!err){e?.remove();return}if(!e){e=document.createElement("div");e.id="ngoRouteErr";e.style.cssText="position:fixed;left:12px;right:12px;bottom:calc(70px + env(safe-area-inset-bottom));z-index:50;background:#7f1d1d;color:#fff;padding:10px 12px;border-radius:12px;font:600 13px/1.35 system-ui;box-shadow:0 6px 20px #0008";e.onclick=()=>e.remove();document.body.appendChild(e)}e.textContent="⚠️ Tra đường: "+String(err).slice(0,200)}catch{}};
 globalThis.ngoShowRouteCompare=txt=>{try{let e=document.getElementById("ngoRouteCmp");if(!ngoRoutesOn||!txt){e?.remove();return}if(!e){e=document.createElement("div");e.id="ngoRouteCmp";e.style.cssText="position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top) + 40px);z-index:50;background:#1e3a8a;color:#fff;padding:8px 12px;border-radius:12px;font:600 12px/1.35 system-ui;box-shadow:0 6px 20px #0008";e.onclick=()=>e.remove();document.body.appendChild(e)}e.textContent=String(txt).slice(0,260)}catch{}};
 globalThis.ngoShowMapsLink=url=>{try{let b=document.getElementById("ngoMapsLink");if(!ngoRoutesOn||!url||!/^https:\/\/www\.google\.com\/maps\/dir\//.test(url)){b?.remove();return}
  if(!b){b=document.createElement("a");b.id="ngoMapsLink";b.target="_blank";b.rel="noopener";b.textContent="🗺️ Mở Google Maps dẫn đường";b.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:50;background:#2563eb;color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;text-decoration:none;box-shadow:0 6px 20px #0008";document.body.appendChild(b)}
  b.href=url;clearTimeout(b._t);b._t=setTimeout(()=>b.remove(),5*60000)}catch{}};
 if(ngoRoutesOn)ngoGeoStart();
${TRIP_LOGIC}
 let ngoTrip=null,ngoTripSayQ=null,ngoTripBusy=false;const NGO_TRIP_EVERY=4*60000;
 function ngoTripChip(){try{let c=document.getElementById("ngoTripChip");if(!ngoTrip){c?.remove();return}
  if(!c){c=document.createElement("button");c.id="ngoTripChip";c.type="button";c.style.cssText="position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 6px);z-index:51;background:#065f46;color:#fff;border:0;padding:6px 12px;border-radius:999px;font:700 12px/1.2 system-ui;box-shadow:0 4px 14px #0008;max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";c.onclick=()=>ngoTripEnd();document.body.appendChild(c)}
  c.textContent="🚗 Đang canh đường → "+String(ngoTrip.to.name||"điểm đến").slice(0,40)+" · chạm để dừng"}catch{}}
 function ngoTripEnd(){ngoTrip=null;ngoTripSayQ=null;ngoTripChip()}
 globalThis.ngoTripStart=trip=>{try{if(!ngoRoutesOn||!trip||!trip.to||!Number.isFinite(trip.to.lat)||!Number.isFinite(trip.to.lng))return;const now=Date.now();
  ngoTrip={to:trip.to,path:String(trip.path||""),expectEnd:now+(Number(trip.seconds)||0)*1000,started:now,lastCheck:now,lastAlertAt:0,alerted:[]};ngoTripChip()}catch{}};
 function ngoTripSay(text){if(!active)return false;if(step!=="listening"||heard)return false;gen++;closeRec();const g=gen;history.push({role:"assistant",content:text});render();speak(text,g);return true}
 async function ngoTripTick(){try{
  if(!ngoTrip)return;if(!ngoRoutesOn||Date.now()-ngoTrip.started>3*3600000){ngoTripEnd();return}
  if(ngoTripSayQ&&ngoTripSay(ngoTripSayQ))ngoTripSayQ=null;
  if(ngoTripBusy||!active||document.hidden||Date.now()-ngoTrip.lastCheck<NGO_TRIP_EVERY)return;
  if(!(ngoGeo&&Date.now()-ngoGeo.at<2*60000)&&navigator.geolocation)await new Promise(res=>{let done=false;const end=()=>{if(!done){done=true;res()}};setTimeout(end,8000);try{navigator.geolocation.getCurrentPosition(p=>{ngoGeoOk(p);end()},e=>{ngoGeoFail(e);end()},{enableHighAccuracy:false,maximumAge:30000,timeout:8000})}catch{end()}}); // a parked/slow car may not trigger watchPosition updates
  if(!ngoTrip||!(ngoGeo&&Date.now()-ngoGeo.at<2*60000))return;
  const here={lat:ngoGeo.lat,lng:ngoGeo.lng};
  if(ngoDistM(here,ngoTrip.to)<400){const n=ngoTrip.to.name;ngoTripEnd();ngoTripSayQ="Sắp tới "+(n||"nơi")+" rồi, Ngố dừng canh đường.";return}
  ngoTripBusy=true;ngoTrip.lastCheck=Date.now();
  const r=await fetch("/api/route-check",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({apiKey:key,from:here,to:ngoTrip.to})});
  const d=await r.json().catch(()=>({}));if(!ngoTrip)return;
  if(!r.ok||d.error){globalThis.ngoShowRouteError?.("canh đường: "+(d.error||"HTTP "+r.status));return}
  const out=ngoTripDecide(ngoTrip,d,Date.now());ngoTrip=out.trip;
  if(out.trip.altUrl){delete ngoTrip.altUrl;globalThis.ngoShowMapsLink?.("https://www.google.com/maps/dir/?api=1&origin="+here.lat.toFixed(5)+","+here.lng.toFixed(5)+"&destination="+ngoTrip.to.lat.toFixed(5)+","+ngoTrip.to.lng.toFixed(5)+"&travelmode=driving")}
  if(out.say)ngoTripSayQ=out.say,ngoTripSay(ngoTripSayQ)&&(ngoTripSayQ=null);
 }catch{}finally{ngoTripBusy=false}}
 try{setInterval(ngoTripTick,20000)}catch{}
 function ngoAudioSession(type){try{const s=navigator.audioSession;if(!s)return;const want=ngoLoudSpeaker?type:"auto";if(s.type!==want)s.type=want}catch{}}
`;
const SETUP_HTML='<div style="margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid #334155"><strong>TĂNG TỐC &amp; LOA</strong>'+
 '<label><input id="ngoLoudSpeaker" type="checkbox" style="width:auto"> Ưu tiên loa ngoài khi Ngố nói (iPhone)</label>'+
 '<label><input id="ngoFastEndpoint" type="checkbox" style="width:auto"> Chốt câu nhanh ('+(ENDPOINT_MS/1000).toFixed(1)+' giây im lặng)</label>'+
 '<label><input id="ngoStreamVoice" type="checkbox" style="width:auto"> Phát giọng ngay khi đang tải (nhanh hơn ~3 giây)</label>'+
 '<label><input id="ngoRoutes" type="checkbox" style="width:auto"> Tra đường &amp; giao thông (ô tô, dữ liệu TomTom) — dùng vị trí iPhone</label>'+
 '<p class="hint" id="ngoGeoStatus"></p>'+
 '<p class="hint">Tắt "chốt câu nhanh" nếu Ngố hay cắt ngang khi anh ngập ngừng. Tắt "loa ngoài" nếu micro không nhận sau khi Ngố nói. Tắt "phát ngay" để so với cách cũ (chậm hơn) nếu thấy tiếng không mượt.</p></div>';
const SETUP_JS=String.raw`
 $("ngoLoudSpeaker").checked=ngoLoudSpeaker;$("ngoFastEndpoint").checked=ngoFastEndpoint;
 $("ngoLoudSpeaker").onchange=()=>{ngoLoudSpeaker=$("ngoLoudSpeaker").checked;persist("ngo_loud_speaker_v1",ngoLoudSpeaker?"1":"0");ngoAudioSession("auto")};
 $("ngoStreamVoice").checked=ngoStreamVoice;$("ngoStreamVoice").onchange=()=>{ngoStreamVoice=$("ngoStreamVoice").checked;persist("ngo_stream_voice_v1",ngoStreamVoice?"1":"0")};
 $("ngoRoutes").checked=ngoRoutesOn;$("ngoRoutes").onchange=()=>{ngoRoutesOn=$("ngoRoutes").checked;persist("ngo_routes_v1",ngoRoutesOn?"1":"0");if(ngoRoutesOn)ngoGeoStart();else{ngoGeoStop();globalThis.ngoShowMapsLink(null);globalThis.ngoShowRouteCompare(null);ngoTripEnd()}ngoGeoShow()};ngoGeoShow();try{setInterval(ngoGeoShow,15000)}catch{}
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
 p=once(p,'body:JSON.stringify({...body,apiKey:k})','body:JSON.stringify({...body,apiKey:k,...(path==="/api/chat"?await (globalThis.ngoRouteContextAsync?.()||{}):{})})');
 p=once(p,'if(!r.ok)throw Error(d.error||"HTTP "+r.status);return d}finally{if(controller===c)controller=null}}','if(!r.ok)throw Error(d.error||"HTTP "+r.status);if(path==="/api/chat"){globalThis.ngoShowMapsLink?.(d.mapsUrl);globalThis.ngoShowRouteError?.(d.routeError);globalThis.ngoShowRouteCompare?.(d.routeCompare);if(d.trip)globalThis.ngoTripStart?.(d.trip)}return d}finally{if(controller===c)controller=null}}');
 if(p.includes('body:JSON.stringify({...body,apiKey:key})')){
  p=once(p,'body:JSON.stringify({...body,apiKey:key})','body:JSON.stringify({...body,apiKey:key,...(await (globalThis.ngoRouteContextAsync?.()||{}))})');
  p=once(p,'if(d.type==="done")result=d.result;','if(d.type==="done"){result=d.result;globalThis.ngoShowMapsLink?.(result?.mapsUrl);globalThis.ngoShowRouteError?.(result?.routeError);globalThis.ngoShowRouteCompare?.(result?.routeCompare);if(result?.trip)globalThis.ngoTripStart?.(result.trip)}');
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
