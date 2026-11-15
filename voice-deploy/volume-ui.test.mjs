import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {loudVoiceProcess} from './volume-ui.js';
import worker from './worker.js';
import {readFileSync} from 'node:fs';
// Real Vietnamese speech (espeak-ng, 3 s, 16 kHz s16le) peak-normalized to 0.9 like typical TTS output.
function realSpeech(peakTarget=.9){
 const raw=new Int16Array(readFileSync(new URL('./fixtures/vi-speech-16k-s16le.pcm',import.meta.url)).buffer.slice(0));
 const d=Float32Array.from(raw,v=>v/32768);let p=0;for(const v of d)p=Math.max(p,Math.abs(v));
 return d.map(v=>v/p*peakTarget);
}
const realBuf=d=>({numberOfChannels:1,length:d.length,sampleRate:16000,getChannelData:()=>d});
const activeRms=d=>{const f=320,ms=[];for(let s=0;s<d.length;s+=f){let a=0;for(let i=s;i<Math.min(d.length,s+f);i++)a+=d[i]*d[i];ms.push(a/f)}const g=Math.max(...ms)*.01;const k=ms.filter(x=>x>=g);return Math.sqrt(k.reduce((a,b)=>a+b,0)/k.length)};
const SR=24000;
// Speech-like test signal: syllable bursts (crest factor ~5) separated by silence.
function speech(amp,seconds=2){
 const length=SR*seconds,data=new Float32Array(length);
 for(let i=0;i<length;i++){
  const t=i/SR,syll=(t*4)%1;
  const envelope=syll<.7?Math.sin(Math.PI*syll/.7)**4:0; // peaky like real speech (crest ~ TTS)
  data[i]=amp*envelope*(.55*Math.sin(2*Math.PI*180*t)+.3*Math.sin(2*Math.PI*900*t)+.15*Math.sin(2*Math.PI*2400*t));
 }
 return data;
}
const buf=data=>({numberOfChannels:1,length:data.length,sampleRate:SR,getChannelData:()=>data});
const rms=d=>Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length);
const peak=d=>d.reduce((m,v)=>Math.max(m,Math.abs(v)),0);

test('regression on real speech: old design gave ~1x gain (slider dead); new stage is >=4 dB louder at default and slider adds more',()=>{
 const base=realSpeech(.9);
 const outs=[1.55,2.5].map(g=>{const d=base.slice();const r=loudVoiceProcess(realBuf(d),g);assert.ok(peak(d)<=.98);assert.ok(r.gain>1.5);return activeRms(d)});
 const gainDb=x=>20*Math.log10(x/activeRms(base));
 assert.ok(gainDb(outs[0])>=4,`default +${gainDb(outs[0])} dB`);
 assert.ok(outs[1]>outs[0]*1.12,`max ${outs[1]} vs default ${outs[0]}`);
});
test('slider really changes loudness: 2.5 louder than 1.55 louder than 1.0',()=>{
 const out=[1,1.55,2.5].map(g=>{const d=speech(.5);loudVoiceProcess(buf(d),g);return rms(d)});
 assert.ok(out[0]<out[1]&&out[1]<out[2],JSON.stringify(out));
 assert.ok(out[2]/out[0]>1.6,JSON.stringify(out));
});
test('quiet and loud real-speech chunks come out at similar loudness (no level jumps between chunks)',()=>{
 const q=realSpeech(.3),l=realSpeech(.95);
 loudVoiceProcess(realBuf(q),1.55);loudVoiceProcess(realBuf(l),1.55);
 const ratio=activeRms(q)/activeRms(l);
 assert.ok(ratio>.89&&ratio<1.12,`ratio ${ratio}`);
});
test('narrow transient never clips and the limiter gain changes smoothly (no clicks)',()=>{
 const d=speech(.3),src=d.slice();d[30000]=src[30000]=.99;d[30001]=src[30001]=-.99;
 const r=loudVoiceProcess(buf(d),2.5);
 assert.ok(peak(d)<=.98);
 assert.ok(r.minEnvelope<1);
 let prev=null,prevI=-2,maxStep=0;
 for(let i=29000;i<31000;i++){
  if(Math.abs(src[i])<.02)continue;
  const g=d[i]/src[i];
  if(prev!==null&&i-prevI===1)maxStep=Math.max(maxStep,Math.abs(g-prev)/r.gain);
  prev=g;prevI=i;
 }
 assert.ok(maxStep<.15,`gain step ${maxStep}`);
});
test('silence, NaN and invalid buffers are safe; invalid slider values fall back to bounded gain',()=>{
 const silent=new Float32Array(4800);
 assert.equal(loudVoiceProcess(buf(silent),2.5).gain,1);
 assert.ok(silent.every(v=>v===0));
 assert.equal(loudVoiceProcess({},1.55).gain,1);
 const withNaN=speech(.3);withNaN[10]=NaN;loudVoiceProcess(buf(withNaN),1.55);
 assert.ok(withNaN.every(Number.isFinite));
 for(const input of [undefined,NaN,-100,100]){
  const d=speech(.2);const r=loudVoiceProcess(buf(d),input);
  assert.ok(Number.isFinite(r.gain)&&r.gain>0&&r.gain<=10);
  assert.ok(peak(d)<=.98);
 }
});
test('stereo buffers are processed on every channel',()=>{
 const a=speech(.2),b=speech(.2);
 loudVoiceProcess({numberOfChannels:2,length:a.length,sampleRate:SR,getChannelData:c=>c?b:a},1.55);
 assert.ok(Math.abs(rms(a)-rms(b))<1e-6&&rms(a)>.15);
});
test('actual Worker HTML plays through the loudness stage and does not instantiate a compressor',async()=>{
 for(const env of [{},{NMH_FAST_VOICE:'active'}]){
  const r=await worker.fetch(new Request('https://voice.example/'),env,{});
  const html=await r.text();
  assert.equal(r.status,200);
  assert.ok(html.includes('loudVoiceProcess(decoded,voiceGain)'));
  assert.ok(html.includes('gain.connect(audioCtx.destination)'));
  assert.ok(!html.includes('createDynamicsCompressor'));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  new vm.Script(script);
 }
});
