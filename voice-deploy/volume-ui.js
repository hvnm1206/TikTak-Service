// Post-presence audio patch: keep avatar audio meter and mic lifecycle intact.
const ORIGINAL='let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(audioCtx.destination)}catch{s.connect(audioCtx.destination)}avatarFace?.setAudio(meter);audioSource=s;s.onended=';
const BOOST='const gain=audioCtx.createGain();gain.gain.value=voiceGain;const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=15;limiter.ratio.value=7;limiter.attack.value=.003;limiter.release.value=.18;let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(gain)}catch{s.connect(gain)}gain.connect(limiter);limiter.connect(audioCtx.destination);avatarFace?.setAudio(meter);audioSource=s;s.onended=';
export function enhanceVolumePage(page){
 const count=page.split(ORIGINAL).length-1;
 if(count!==1)throw Error('NGO_VOLUME_PRESENCE_METER_MISMATCH:'+count);
 return page.replace(ORIGINAL,BOOST);
}
