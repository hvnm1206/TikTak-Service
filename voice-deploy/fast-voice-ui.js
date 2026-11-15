export function currentTurnContext(history,limit=12){
 const rows=Array.isArray(history)?history:[];
 let boundary=-1;
 for(let i=rows.length-1;i>=0;i--)if(rows[i]?.actionBoundary===true){boundary=i;break}
 return rows.slice(boundary+1).slice(-limit).map(m=>({role:m.role,content:m.content}));
}

const client=String.raw`
 ${currentTurnContext.toString()}

 async function fastVoice(body,g,turn){
  const fetchControl=new AbortController();controller=fetchControl;
  const valid=()=>active&&g===gen&&!fetchControl.signal.aborted;
  let first='',firstPlay=null,audioFinished=null,previewNode=null;
  const styleAtStart=body.style;
  const playbackSpeed=Math.min(2,Math.max(.7,(styleAtStart==="nghiem_tuc"?1:1.455)*rate));
  function startPreview(text){
   if(firstPlay)return;
   first=text;
   previewNode=document.createElement("div");
   previewNode.className="bubble assistant";
   previewNode.textContent=text;
   $("history").append(previewNode);
   $("history").scrollTop=$("history").scrollHeight;
   globalThis.nmhVoiceLatencyMark?.("ttsStart");
   firstPlay=(async()=>{
    const bytes=await fetchSpeechAudio(text,styleAtStart,fetchControl.signal,()=>globalThis.nmhVoiceLatencyMark?.("ttsFirstByte"));
    if(!valid())return false;
    globalThis.nmhVoiceLatencyMark?.("ttsReady");
    let finish;
    audioFinished=new Promise(resolve=>{finish=resolve});
    const audio=await playAudioBuffer(bytes,playbackSpeed,finish,valid);
    if(!valid())return false;
    setState("speaking","OpenAI Marin");
    setVoiceSource("OpenAI Marin — đang phát");
    globalThis.nmhVoiceLatencyMark?.("firstAudio");
    recordCost({ttsSeconds:audio.duration,ttsChunks:1});
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
   const played=await firstPlay;
   if(!valid())return;
   if(!played){speak(result.answer,g);return}
   const remainder=result.answer.startsWith(first)?result.answer.slice(first.length).trim():result.answer;
   let next=null;
   if(remainder)next=prepareFirstSpeech(remainder,styleAtStart,fetchControl.signal);
   await Promise.race([audioFinished,new Promise(resolve=>fetchControl.signal.addEventListener("abort",resolve,{once:true}))]);
   if(!valid())return;
   if(remainder){ttsPrefetchCtl=null;speak(remainder,g,next,true,styleAtStart)}
   else{closeVoice();setVoiceSource("OpenAI Marin — đã phát hoàn tất");listen()}
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
