export function currentTurnContext(history,limit=12){
 const rows=Array.isArray(history)?history:[];
 let boundary=-1;
 for(let i=rows.length-1;i>=0;i--)if(rows[i]?.actionBoundary===true){boundary=i;break}
 return rows.slice(boundary+1).slice(-limit).map(m=>({role:m.role,content:m.content,...(m.role==="assistant"&&Array.isArray(m.tools)?{tools:m.tools}:{}),...(m.role==="assistant"&&m.web?{web:m.web}:{}),...(m.role==="assistant"&&Array.isArray(m.sources)&&m.sources.length?{sources:m.sources.slice(0,3).map(s=>({title:s.title,url:s.url}))}:{})}));
}

const client=String.raw`
 ${currentTurnContext.toString()}


 // Progressive Marin playback, v2 (16/11/2026). v1 waited for 1 s blocks (audible gaps), let each
 // node resample 24 kHz + playbackRate on its own (clicks at joins) and restarted the limiter per block.
 // v2: one continuous Catmull-Rom resampler 24 kHz -> context rate (speed folded in, phase carried
 // across network chunks), 0.5 s jitter buffer, sample-exact back-to-back scheduling, fixed gain
 // measured once, memoryless soft-knee limiter (no state to reset between blocks).
 var ngoStreamSources=[];
 function ngoStopStream(){for(const x of ngoStreamSources){x.onended=null;try{x.stop()}catch{}try{x.disconnect()}catch{}}ngoStreamSources=[]}
 function ngoSoftLimit(x){const a=Math.abs(x);if(a<=.72)return x;const y=.72+.26*Math.tanh((a-.72)/.26);return x<0?-y:y}
 function ngoMakeLimiter(rate){
  // Streaming look-ahead peak limiter: 5 ms delay, gain reaches the needed reduction before the peak,
  // 120 ms release; state persists across blocks so there is no reset at joins.
  const L=Math.max(1,Math.round(rate*.005)),ceil=.92,att=1-Math.exp(-1/(L/3)),rel=1-Math.exp(-1/(rate*.12));
  const delay=new Float32Array(L),req=new Float32Array(L);let w=0,env=1,filled=0;
  return function(x){
   const out=new Float32Array(x.length);
   for(let i=0;i<x.length;i++){
    const v=x[i],a=Math.abs(v);req[w]=a>ceil?ceil/a:1;
    let m=1;for(let k=0;k<L;k++)if(req[k]<m)m=req[k];
    env+= (m<env?att:rel)*(m-env);if(env>m&&m<1&&env-m>.001&&m===req[w])env=Math.min(env,m+(env-m)*.5);
    const d=filled<L?0:delay[w];delay[w]=v;w=(w+1)%L;if(filled<L)filled++;
    const y=d*env;out[i]=y>.98?.98:y<-.98?-.98:y;
   }
   return out;
  };
 }
 function ngoMakeResampler(ratio){
  // ratio = input samples per output sample (24000*speed/ctxRate). Catmull-Rom, phase kept across calls.
  let keep=new Float32Array([0]),pos=0; // keep[0] is the sample before the current position
  return function(input,flush){
   let src=new Float32Array(keep.length+input.length);src.set(keep);src.set(input,keep.length);
   const realLen=src.length;
   if(flush){const pad=new Float32Array(realLen+2);pad.set(src);pad[realLen]=pad[realLen+1]=src[realLen-1]||0;src=pad}
   const out=[];
   const limit=flush?realLen-1:src.length-3; // need src[i+2] with i=floor(pos)+1
   while(Math.floor(pos)+1<=limit){
    const i=Math.floor(pos)+1,t=pos-Math.floor(pos);
    const p0=src[i-1],p1=src[i],p2=src[i+1],p3=src[i+2];
    out.push(p1+.5*t*(p2-p0+t*(2*p0-5*p1+4*p2-p3+t*(3*(p1-p2)+p3-p0))));
    pos+=ratio;
   }
   const drop=Math.min(Math.floor(pos),realLen-1);
   keep=src.slice(drop,realLen);pos-=drop;
   return Float32Array.from(out);
  };
 }
 function ngoPcmFromGoogleJson(j){
  const bin=atob(String(j?.audioContent||""));let bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  if(bytes.length>44&&bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70){
   for(let i=12;i+8<=bytes.length;){const id=String.fromCharCode(bytes[i],bytes[i+1],bytes[i+2],bytes[i+3]),size=(bytes[i+4]|bytes[i+5]<<8|bytes[i+6]<<16|bytes[i+7]<<24)>>>0;if(id==="data"){bytes=bytes.subarray(i+8,Math.min(bytes.length,i+8+size));break}i+=8+size+(size&1)}
  }
  if(bytes.length<128)throw Error("TTS_EMPTY_AUDIO");
  const step=16384;let o=0;
  return {read:async()=>{if(o>=bytes.length)return {done:true};const v=bytes.subarray(o,o+step);o+=step;return {value:v,done:false}},cancel:async()=>{},releaseLock(){}};
 }
 async function ngoStreamSpeech(text,voiceStyle,signal,playbackSpeed,onDone,valid,onFirstByte){
  if(typeof ngoStreamVoice!=="undefined"&&!ngoStreamVoice)throw Error("STREAM_VOICE_OFF");
  if(!audioCtx)throw Error("AUDIO_STREAM_NOT_UNLOCKED");
  ngoAudioSessionSafe("playback");
  if(audioCtx.state!=="running")await audioCtx.resume();
  if(audioCtx.state!=="running")throw Error("AUDIO_CONTEXT_SUSPENDED");
  const r=await fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({apiKey:key,text,style:voiceStyle,format:"pcm",wire:"b64"}),signal});
  if(!r.ok||!r.body)throw Error("TTS_STREAM_HTTP_"+r.status);
  globalThis.ngoTtsSource=r.headers.get("x-nmh-tts-source")||"";
  // 18/11/2026: Google audio arrives as base64 JSON and is decoded here on the phone (server CPU limit); OpenAI Marin stays raw PCM.
  const reader=r.headers.get("x-nmh-tts-wire")==="google-b64"?ngoPcmFromGoogleJson(await r.json()):r.body.getReader(),inRate=24000,outRate=audioCtx.sampleRate;
  const resample=ngoMakeResampler(inRate*playbackSpeed/outRate),limiter=ngoMakeLimiter(outRate);
  const meter=audioCtx.createAnalyser();meter.fftSize=256;meter.connect(audioCtx.destination);
  let odd=null,queue=[],queued=0,nextTime=0,gain=0,measure=[],measured=0,total=0,started=false,firstByte=false,last=null,resolveStart,rejectStart;
  const startPromise=new Promise((a,b)=>{resolveStart=a;rejectStart=b});
  const START=Math.round(outRate*.5),MIN=Math.round(outRate*.12);
  function decode(bytes){
   let data=bytes;if(odd!==null){data=new Uint8Array(bytes.length+1);data[0]=odd;data.set(bytes,1);odd=null}
   if(data.length%2){odd=data[data.length-1];data=data.subarray(0,data.length-1)}
   const n=data.length/2,f=new Float32Array(n),v=new DataView(data.buffer,data.byteOffset,data.length);
   for(let i=0;i<n;i++)f[i]=v.getInt16(i*2,true)/32768;return f;
  }
  function pickGain(){
   // one loudness measurement on the first ~0.5 s of speech, then fixed for the whole utterance
   const all=new Float32Array(measured);let o=0;for(const m of measure){all.set(m,o);o+=m.length}
   const b={numberOfChannels:1,length:all.length,sampleRate:outRate,getChannelData:()=>all.slice()};
   const res=loudVoiceProcess(b,voiceGain);gain=res.measured?Math.min(6,res.gain):1;measure=null;
  }
  function flushQueue(force){
   if(!queued||(!force&&queued<MIN))return;
   if(!gain)pickGain();
   const buf=audioCtx.createBuffer(1,queued,outRate),ch=buf.getChannelData(0);let o=0;
   for(const q of queue){const g=new Float32Array(q.length);for(let i=0;i<q.length;i++)g[i]=q[i]*gain;ch.set(limiter(g),o);o+=q.length}
   queue=[];queued=0;
   const s=audioCtx.createBufferSource();s.buffer=buf;s.connect(meter);
   const now=audioCtx.currentTime;
   if(nextTime<now+.02){ // first block or underrun: short fade-in avoids a click
    const fade=Math.min(ch.length,Math.round(outRate*.006));for(let i=0;i<fade;i++)ch[i]*=i/fade;
    nextTime=now+.04;
   }
   s.start(nextTime);nextTime+=buf.length/outRate;total+=buf.length/outRate*playbackSpeed;
   ngoStreamSources.push(s);audioSource=s;last=s;
   if(!started){started=true;globalThis.nmhVoiceLatencyMark?.("ttsReady");avatarFace?.setAudio(meter);resolveStart({duration:0,stream:true})}
  }
  function push(out){
   if(!out.length)return;queue.push(out);queued+=out.length;
   if(measure){measure.push(out);measured+=out.length}
   if(!started){if(queued>=START)flushQueue(true);return}
   // keep ~0.25 s scheduled ahead; flush as soon as there is enough or the queue is running low
   if(queued>=MIN||nextTime-audioCtx.currentTime<.25)flushQueue(true);
  }
  (async()=>{
   try{
    while(true){
     const {value,done}=await reader.read();
     if(!valid()){await reader.cancel().catch(()=>{});throw Error("AUDIO_CANCELLED")}
     if(value&&value.length){if(!firstByte){firstByte=true;onFirstByte?.()}push(resample(decode(value),false))}
     if(done){push(resample(new Float32Array(0),true));push(new Float32Array(Math.round(outRate*.25)));flushQueue(true);break} // flush limiter + 0.25 s silent tail so the last word is fully out before onended
    }
    if(!started)throw Error("TTS_STREAM_EMPTY");
    recordCost({ttsSeconds:total,ttsChunks:1});
    const ended=()=>{if(audioSource===last){audioSource=null;avatarFace?.setAudio(null)}ngoStreamSources=[];onDone?.()};
    if(audioCtx.currentTime>=nextTime-.01)ended();else last.onended=ended;
   }catch(e){if(!started)rejectStart(e);else{ngoStopStream();onDone?.()}}
  })();
  return startPromise;
 }
 function ngoAudioSessionSafe(t){try{if(typeof ngoAudioSession==="function")ngoAudioSession(t)}catch{}}
 async function fastVoice(body,g,turn){
  const fetchControl=new AbortController();controller=fetchControl;
  const valid=()=>active&&g===gen&&!fetchControl.signal.aborted;
  let first='',firstPlay=null,audioFinished=null,previewNode=null;
  const styleAtStart=body.style;
  const playbackSpeed=Math.min(2,Math.max(.7,(styleAtStart==="nghiem_tuc"?1:1.455)*rate));
  function startPreview(text,bubble=true){
   if(firstPlay)return;
   first=text;
   if(bubble){previewNode=document.createElement("div");
   previewNode.className="bubble assistant";
   previewNode.textContent=text;
   $("history").append(previewNode);
   $("history").scrollTop=$("history").scrollHeight;}
   globalThis.nmhVoiceLatencyMark?.("ttsStart");
   firstPlay=(async()=>{
    let finish;
    audioFinished=new Promise(resolve=>{finish=resolve});
    try{
     await ngoStreamSpeech(text,styleAtStart,fetchControl.signal,playbackSpeed,finish,valid,()=>globalThis.nmhVoiceLatencyMark?.("ttsFirstByte"));
    }catch(e){
     if(!valid())return false;
     // Fallback: original whole-file MP3 path.
     const bytes=await fetchSpeechAudio(text,styleAtStart,fetchControl.signal,()=>globalThis.nmhVoiceLatencyMark?.("ttsFirstByte"));
     if(!valid())return false;
     globalThis.nmhVoiceLatencyMark?.("ttsReady");
     const audio=await playAudioBuffer(bytes,playbackSpeed,finish,valid);
     recordCost({ttsSeconds:audio.duration,ttsChunks:1});
    }
    if(!valid())return false;
    const ngoVoiceName=String(globalThis.ngoTtsSource||"").startsWith("google")?"Google Leda":"OpenAI Marin";
    setState("speaking",ngoVoiceName);
    setVoiceSource(ngoVoiceName+" — đang phát");
    globalThis.nmhVoiceLatencyMark?.("firstAudio");
    return true;
   })().catch(()=>false);
  }
  try{
   const r=await fetch("/api/chat-stream",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({...body,apiKey:key}),signal:fetchControl.signal});
   if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.error||"HTTP "+r.status)}
   const reader=r.body?.getReader();
   if(!reader)throw Error("Safari không đọc được luồng văn bản");
   const decoder=new TextDecoder();
   let pending="",result;
   function event(line){
    if(!line||!valid())return;
    const d=JSON.parse(line);
    if(d.type==="firstText")globalThis.nmhVoiceLatencyMark?.("firstText");
    if(d.type==="tool"&&step==="processing")setState("processing",d.name==="web_search"||d.name.startsWith("search_")||d.name==="get_weather"?"Đang tra cứu":"Đang thực hiện thao tác");
    if(d.type==="preview")startPreview(d.text);
    if(d.type==="error")throw Error(d.error);
    if(d.type==="done")result=d.result;
   }
   try{
    while(valid()){
     const {value,done}=await reader.read();
     pending+=decoder.decode(value,{stream:!done});
     let n;
     while((n=pending.indexOf("\n"))>=0){event(pending.slice(0,n));pending=pending.slice(n+1)}
     if(pending.length>1_000_000)throw Error("Phản hồi quá dài");
     if(done){event(pending);break}
    }
   } finally {await reader.cancel().catch(()=>{});reader.releaseLock()}
   if(!valid())return;
   if(!result?.answer)throw Error("Phản hồi bị ngắt trước khi hoàn tất");
   globalThis.nmhVoiceLatencyMark?.("chatDone");
   globalThis.nmhVoiceLatencyServer?.(result.latency);
   recordCost({gptUsd:Number(result.estimatedModelUsd||0),webUsd:Number(result.estimatedWebSearchUsd||0)});
   turn.content=result.answer;turn.sources=result.sources||[];turn.actionBoundary=!!result.actionStatus;history.push(turn);render();
   if(!firstPlay){const firstPart=speechParts(result.answer)[0];if(firstPart)startPreview(firstPart,false)}
   const played=await firstPlay;
   if(!valid())return;
   if(!played){speak(result.answer,g);return}
   const remainder=result.answer.startsWith(first)?result.answer.slice(first.length).trim():result.answer;
   let next=null;
   if(remainder)next=prepareFirstSpeech(remainder,styleAtStart,fetchControl.signal);
   await Promise.race([audioFinished,new Promise(resolve=>fetchControl.signal.addEventListener("abort",resolve,{once:true}))]);
   if(!valid())return;
   if(remainder){ttsPrefetchCtl=null;speak(remainder,g,next,true,styleAtStart)}
   else{closeVoice();setVoiceSource((String(globalThis.ngoTtsSource||"").startsWith("google")?"Google Leda":"OpenAI Marin")+" — đã phát hoàn tất");if(typeof ngoListenAfterPlayback==="function")ngoListenAfterPlayback();else listen()}
  }catch(e){
   if(!valid())return;
   previewNode?.remove();
   closeVoice();
   fetchControl.abort();
   showError("OpenAI: "+String(e?.message||e));
  }finally{if(controller===fetchControl)controller=null}
 }
 $("testRealtime").onclick=async()=>{
  const status=$("realtimeDiagnostic"),text=$("realtimeText").value.trim();
  if(!key||!text){status.textContent="Cần API key và văn bản để thử.";return}
  if(active)pause("Tạm dừng để thử giọng Realtime");
  closeVoice();
  const ctl=new AbortController();ttsCtl=ctl;
  const valid=()=>ttsCtl===ctl&&!ctl.signal.aborted;
  try{
   audioUnlock();
   const start=performance.now();
   status.textContent="Đang thử Realtime Marin…";
   const r=await fetch("/api/realtime-speech-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:key,text}),signal:ctl.signal});
   if(!r.ok)throw Error((await r.json()).error||"HTTP "+r.status);
   const audio=await r.arrayBuffer();
   if(!valid())return;
   await playAudioBuffer(audio,1,undefined,valid);
   const first=r.headers.get("x-nmh-first-byte-ms");
   status.textContent="Realtime Marin · byte đầu tại Worker: "+first+" ms sau kết nối · đến phát: "+Math.round(performance.now()-start)+" ms · usage: "+r.headers.get("x-nmh-voice-usage");
  }catch(e){if(valid())status.textContent="Thử Realtime thất bại: "+e.message}
 };
 function prepareFirstSpeech(text,voiceStyle,signal){
  const ctl=new AbortController();
  const combined=ctl.signal;
  const cancel=()=>ctl.abort();
  if(signal.aborted)cancel();else signal.addEventListener("abort",cancel,{once:true});
  const promise=fetchSpeechAudio(speechParts(text)[0],voiceStyle,combined).then(bytes=>({bytes}),error=>({error}));
  return {index:0,ctl,promise};
 }
`;

function replaceOnce(page,from,to){
 if(page.split(from).length!==2)throw Error('NMH fast voice integration mismatch: '+from.slice(0,75));
 return page.replace(from,to);
}

export function enhanceFastVoice(page){
 const start=page.indexOf(' async function ask(text,g){'),end=page.indexOf('\n function speechParts',start);
 if(start<0||end<0)throw Error('NMH fast voice ask integration mismatch');
 let p=page.slice(0,start)+client+'\n async function ask(text,g){'+
  'if($("fastVoiceEnabled").checked===false){await askBaseline(text,g);return}setState("processing");globalThis.nmhVoiceLatencyMark?.("chatStart");history.push({role:"user",content:text});render();await fastVoice({messages:currentTurnContext(history),style},g,{role:"assistant"});}'+page.slice(start,end).replace("function ask(","function askBaseline(")+page.slice(end);
 p=replaceOnce(p,'messages:history.slice(-12).map(m=>({role:m.role,content:m.content}))','messages:currentTurnContext(history)');
 p=replaceOnce(p,'history.push({role:"assistant",content:d.answer,sources:d.sources||[]});','history.push({role:"assistant",content:d.answer,sources:d.sources||[],actionBoundary:!!d.actionStatus});');
 p=replaceOnce(p,'async function speak(text,g){','async function speak(text,g,firstPrepared=null,continuation=false,turnStyle=style){');
 p=replaceOnce(p,'let index=0,prefetched=null;','let index=0,prefetched=firstPrepared;');
 p=replaceOnce(p,'if(i===0)globalThis.nmhVoiceLatencyMark?.("ttsStart");','if(i===0&&!continuation)globalThis.nmhVoiceLatencyMark?.("ttsStart");');
 p=replaceOnce(p,'fetchSpeechAudio(parts[i],style,ctl.signal)','fetchSpeechAudio(parts[i],turnStyle,ctl.signal,i===0&&!continuation?()=>globalThis.nmhVoiceLatencyMark?.("ttsFirstByte"):null)');
 const part=p.indexOf(' async function speak(text,g,');
 p=p.slice(0,part)+p.slice(part).replace('(style==="nghiem_tuc"?1:1.455)','(turnStyle==="nghiem_tuc"?1:1.455)');
 p=replaceOnce(p,'if(index===0)globalThis.nmhVoiceLatencyMark?.("ttsReady");','if(index===0&&!continuation)globalThis.nmhVoiceLatencyMark?.("ttsReady");');
 p=replaceOnce(p,'if(index===0)globalThis.nmhVoiceLatencyMark?.("firstAudio");','if(index===0&&!continuation)globalThis.nmhVoiceLatencyMark?.("firstAudio");');
 p=replaceOnce(p,'        void next();\n      });','        void next();\n      },valid);');
 p=replaceOnce(p,'function fetchSpeechAudio(text,voiceStyle,signal){','function fetchSpeechAudio(text,voiceStyle,signal,onFirstByte){');
 p=replaceOnce(p,'const buffer=await r.arrayBuffer();','const buffer=onFirstByte&&r.body?await readVoiceBytes(r.body,onFirstByte):await r.arrayBuffer();');
 p=replaceOnce(p,'async function playAudioBuffer(buffer,playbackSpeed,onDone){','async function playAudioBuffer(buffer,playbackSpeed,onDone,valid=()=>true){');
 p=replaceOnce(p,'const s=audioCtx.createBufferSource();s.buffer=decoded;','if(!valid())throw Error("AUDIO_CANCELLED");const s=audioCtx.createBufferSource();s.buffer=decoded;');
 p=replaceOnce(p,'function closeVoice(){ttsRequestId++;','function closeVoice(){ngoStopStream();ttsRequestId++;');
 p=replaceOnce(p,'gen++;closeVoice();listen()','gen++;controller?.abort();controller=null;closeVoice();listen()');
 p=replaceOnce(p,'!(active&&s==="speaking")','!(active&&(s==="speaking"||s==="processing"))');
 p=replaceOnce(p,'<h2>SETUP</h2>','<h2>SETUP</h2><label><input id="fastVoiceEnabled" type="checkbox" checked style="width:auto"> Phát câu đầu sớm</label><label for="realtimeText">Văn bản thử giọng Realtime</label><input id="realtimeText" maxlength="300"><button type="button" id="testRealtime">THỬ REALTIME MARIN</button><p id="realtimeDiagnostic" aria-live="polite"></p>');
 return replaceOnce(p,' async function fetchSpeechAudio',String.raw`
 async function readVoiceBytes(body,onFirstByte){
  const reader=body.getReader(),parts=[];
  let length=0;
  try{
   while(true){
    const {value,done}=await reader.read();
    if(done)break;
    if(!value.length)continue;
    if(!length)onFirstByte();
    length+=value.length;
    if(length>4_000_000)throw Error("TTS_AUDIO_TOO_LARGE");
    parts.push(value);
   }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
  const all=new Uint8Array(length);
  let offset=0;
  for(const part of parts){all.set(part,offset);offset+=part.length}
  return all.buffer;
 }
 async function fetchSpeechAudio`);
}
