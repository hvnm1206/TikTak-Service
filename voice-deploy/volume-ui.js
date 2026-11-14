// Visual-only Web Audio gain stage: stable level per Marin chunk, no dynamic compressor pumping.
// The limiter uses decoded PCM peak, so output does not clip after gain correction.
export function calculateStableAudioGain(decoded, userGain=1.55){
  const n=Number(decoded?.numberOfChannels)||0;
  const length=Number(decoded?.length)||0;
  if(!n||!length||typeof decoded.getChannelData!=='function')return 1;
  let sum=0, count=0, peak=0;
  try{
    const stride=Math.max(1,Math.ceil(length/4096));
    for(let channel=0;channel<Math.min(n,2);channel++){
      const data=decoded.getChannelData(channel);
      for(let i=0;i<data.length;i+=stride){
        const a=Math.abs(data[i]);
        if(!Number.isFinite(a))continue;
        sum+=a*a;count++;peak=Math.max(peak,a);
      }
    }
  }catch{return 1}
  if(!count||peak<0.003)return 1;
  const rms=Math.sqrt(sum/count);
  // Normalize modestly towards stable perceived loudness; preserve dynamics within each chunk.
  const desired=(0.14/Math.max(0.018,rms))*(Math.max(1,Math.min(2.5,Number(userGain)||1.55))/1.55);
  const bounded=Math.max(0.5,Math.min(1.8,desired));
  return Math.min(bounded,0.88/peak);
}
const ORIGINAL='let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(audioCtx.destination)}catch{s.connect(audioCtx.destination)}avatarFace?.setAudio(meter);audioSource=s;s.onended=';
const STABLE='const gain=audioCtx.createGain();gain.gain.value=calculateStableAudioGain(decoded,voiceGain);let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(gain)}catch{s.connect(gain)}gain.connect(audioCtx.destination);avatarFace?.setAudio(meter);audioSource=s;s.onended=';
export function enhanceVolumePage(page){
 const count=page.split(ORIGINAL).length-1;
 if(count!==1)throw Error('NGO_VOLUME_PRESENCE_METER_MISMATCH:'+count);
 const replaced=page.replace(ORIGINAL,STABLE);
 const marker=' const labels={idle:';
 if(replaced.split(marker).length!==2)throw Error('NGO_VOLUME_HELPER_MISMATCH');
 return replaced.replace(marker,' const calculateStableAudioGain='+calculateStableAudioGain.toString()+';'+marker);
}
