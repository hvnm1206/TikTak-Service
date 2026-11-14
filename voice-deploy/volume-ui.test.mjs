import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {calculateStableAudioGain} from './volume-ui.js';
import worker from './worker.js';
const buffer=(amp,length=8192)=>{
 const data=new Float32Array(length);
 for(let i=0;i<length;i++)data[i]=amp*Math.sin(i*.12);
 return {numberOfChannels:1,length,getChannelData:()=>data};
};
test('quiet and loud Marin chunks normalize to similar RMS without compressor pumping',()=>{
 const small=buffer(.10),loud=buffer(.40);
 const a=calculateStableAudioGain(small,1.55),b=calculateStableAudioGain(loud,1.55);
 assert.ok(a>b);
 assert.ok(a<=1.8 && b>=.5);
 const outputA=.1*a,outputB=.4*b;
 assert.ok(Math.abs(outputA-outputB)<.04,`normalized peaks differ ${outputA}, ${outputB}`);
});
test('Marin gain never clips full PCM peak, including a narrow transient',()=>{
 const data=new Float32Array(40000).fill(.08);data[39999]=.99;
 const decoded={numberOfChannels:1,length:data.length,getChannelData:()=>data};
 const gain=calculateStableAudioGain(decoded,2.5);
 assert.ok(gain*.99<=.881,`peak over limit ${gain}`);
 assert.ok(Number.isFinite(gain));
});
test('silence and invalid buffers are safe, settings remain bounded',()=>{
 const silent=buffer(0);
 assert.equal(calculateStableAudioGain(silent,2.5),1);
 assert.equal(calculateStableAudioGain({},1.55),1);
 for(const input of [undefined,NaN,-100,100]){
  const gain=calculateStableAudioGain(buffer(.2),input);
  assert.ok(Number.isFinite(gain)&&gain>0&&gain<2);
 }
});
test('actual Worker HTML plays through a linear gain stage and does not instantiate a compressor',async()=>{
 const r=await worker.fetch(new Request('https://voice.example/'));
 const html=await r.text();
 assert.equal(r.status,200);
 assert.ok(html.includes('calculateStableAudioGain(decoded,voiceGain)'));
 assert.ok(html.includes('gain.connect(audioCtx.destination)'));
 assert.ok(!html.includes('createDynamicsCompressor'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 new vm.Script(script);
});
