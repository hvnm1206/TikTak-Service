// Marin loudness stage (15/11/2026).
// Previous version capped gain at 0.88/peak, so with normal TTS peaks (~0.9) the effective gain
// stayed ≈1 and the user slider could not make Ngố louder. This version normalizes the ACTIVE
// speech level of each decoded chunk to a target set by the slider, then applies an offline
// look-ahead peak limiter on the PCM itself: louder, consistent between chunks, no clipping and
// no realtime compressor pumping. Pure JS, runs once per chunk before playback.
export function loudVoiceProcess(decoded, userGain=1.55, fixedGain=0){
  const n=Number(decoded?.numberOfChannels)||0;
  const length=Number(decoded?.length)||0;
  if(!n||!length||typeof decoded.getChannelData!=='function')return {gain:1,minEnvelope:1};
  let channels;
  try{channels=Array.from({length:n},(_,c)=>decoded.getChannelData(c))}catch{return {gain:1,minEnvelope:1}}
  const sr=Number(decoded.sampleRate)||24000;
  const ug=Number.isFinite(Number(userGain))?Math.max(1,Math.min(2.5,Number(userGain))):1.55;
  // 1) Active-speech RMS over 20 ms frames (silence and breaths do not drag the level down).
  const frame=Math.max(1,Math.round(sr*.02));
  const frames=[];
  let peak=0;
  for(let start=0;start<length;start+=frame){
    const end=Math.min(length,start+frame);
    let ms=0;
    for(const data of channels){
      let s=0;
      for(let i=start;i<end;i++){const v=data[i];if(!Number.isFinite(v))continue;const a=Math.abs(v);if(a>peak)peak=a;s+=v*v}
      ms=Math.max(ms,s/(end-start));
    }
    frames.push(ms);
  }
  if(peak<.003)return {gain:1,minEnvelope:1};
  const loudest=Math.max(...frames);
  const gate=Math.max(1e-4,loudest*.01); // -40 dBFS absolute, -20 dB relative to loudest frame
  let sum=0,count=0;
  for(const ms of frames)if(ms>=gate){sum+=ms;count++}
  if(!count&&!(fixedGain>0))return {gain:1,minEnvelope:1};
  const activeRms=Math.sqrt(sum/Math.max(1,count));
  const target=.2*ug; // default 1.55 => 0.31 RMS target; max 2.5 => 0.5 (limiter keeps peaks <= 0.95)
  // Streaming playback passes the gain measured on the first block so later blocks keep the same level.
  const gain=fixedGain>0?Math.max(.25,Math.min(10,fixedGain)):Math.max(.25,Math.min(10,target/activeRms));
  // 2) Required per-sample gain so |x*gain*env| <= ceiling.
  const ceiling=.95;
  const env=new Float32Array(length);
  for(let i=0;i<length;i++){
    let a=0;
    for(const data of channels){const v=Math.abs(data[i]);if(Number.isFinite(v)&&v>a)a=v}
    const out=a*gain;
    env[i]=out>ceiling?ceiling/out:1;
  }
  // 3) Backward pass = 4 ms look-ahead attack, forward pass = 80 ms release. env stays <= required.
  const kAtt=1-Math.exp(-1/Math.max(1,sr*.004));
  const kRel=1-Math.exp(-1/Math.max(1,sr*.08));
  for(let i=length-2;i>=0;i--){const next=env[i+1]+(1-env[i+1])*kAtt;if(next<env[i])env[i]=next}
  let minEnvelope=1;
  for(let i=1;i<length;i++){const next=env[i-1]+(1-env[i-1])*kRel;if(next<env[i])env[i]=next;if(env[i]<minEnvelope)minEnvelope=env[i]}
  for(const data of channels){
    for(let i=0;i<length;i++){
      const v=data[i];
      if(!Number.isFinite(v)){data[i]=0;continue}
      const y=v*gain*env[i];
      data[i]=y>.98?.98:y<-.98?-.98:y;
    }
  }
  return {gain,minEnvelope,measured:true};
}
const ORIGINAL='let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(audioCtx.destination)}catch{s.connect(audioCtx.destination)}avatarFace?.setAudio(meter);audioSource=s;s.onended=';
const LOUD='const gain=audioCtx.createGain();gain.gain.value=1;loudVoiceProcess(decoded,voiceGain);let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(gain)}catch{s.connect(gain)}gain.connect(audioCtx.destination);avatarFace?.setAudio(meter);audioSource=s;s.onended=';
function once(text,from,to,code){
 const count=text.split(from).length-1;
 if(count!==1)throw Error(code+':'+count);
 return text.replace(from,to);
}
export function enhanceVolumePage(page){
 let p=once(page,ORIGINAL,LOUD,'NGO_VOLUME_PRESENCE_METER_MISMATCH');
 p=once(p,' const labels={idle:',' const loudVoiceProcess='+loudVoiceProcess.toString()+'; const labels={idle:','NGO_VOLUME_HELPER_MISMATCH');
 p=once(p,'Âm lượng giọng AI Marin (khuếch đại có giới hạn): ','Âm lượng giọng AI Marin (chuẩn hóa + chống vỡ tiếng): ','NGO_VOLUME_LABEL_MISMATCH');
 p=once(p,'<p class="hint">Nếu âm thanh méo, giảm mức khuếch đại. Chỉ áp dụng cho giọng AI, không thay đổi micro hay âm lượng iPhone.</p>','<p class="hint">Kéo phải để to hơn. Mỗi đoạn giọng được đưa về cùng độ to và có bộ chống vỡ tiếng. Âm lượng iPhone vẫn phải bật đủ lớn.</p>','NGO_VOLUME_HINT_MISMATCH');
 return p;
}
