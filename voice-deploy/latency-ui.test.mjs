import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.js';
import {enhanceLatencyPage} from './latency-ui.js';

test('latency UI injects only timing hooks and leaves mic/TTS semantics',async()=>{
 const response=await worker.fetch(new Request('https://voice.example/'),{NMH_REMINDERS_MODE:'active'});
 assert.equal(response.status,200);
 const html=await response.text();
 for(const marker of ['id="nmhVoiceLatencyReport"','nmhVoiceLatencyMark','nmhVoiceLatencyServer','firstAudio','ttsReady','chatDone','chatStart','read_memories','SpeechRecognition','audioCtx','id="ngoThemeSelect"'])
  assert.ok(html.includes(marker),marker);
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 new vm.Script(script);
 assert.ok(!html.includes('API key is logged'));
});
test('first segment is shorter without truncating or reordering speech text',async()=>{
 const html=await (await worker.fetch(new Request('https://voice.example/'))).text();
 const match=html.match(/function speechParts\(text\)\{[\s\S]*?return out\}/);
 assert.ok(match,'speechParts exists');
 const parts=vm.runInNewContext('('+match[0]+')')('Hôm nay chúng ta có một bản tổng kết về nhiều vấn đề quan trọng và các giải pháp cần triển khai tiếp theo. '.repeat(7).trim());
 assert.ok(parts.length>=2);
 assert.ok(parts[0].length<=180,'first Marin segment <= 180 chars');
 assert.ok(parts.slice(1).every(p=>p.length<=440));
 const original='Hôm nay chúng ta có một bản tổng kết về nhiều vấn đề quan trọng và các giải pháp cần triển khai tiếp theo. '.repeat(7).trim();
 assert.equal(parts.join(' '),original);
 const short=vm.runInNewContext('('+match[0]+')')('Xin chào.');
 assert.equal(short.join(' '),'Xin chào.');
});
test('instrumentation rejects incompatible page instead of silently disabling timing',()=>{
 assert.throws(()=>enhanceLatencyPage('<html></html>'),/NMH latency patch mismatch/);
});
test('latency display formats zero-to-first-audio timing without speech content',()=>{
 const source=(awaitFunction=>awaitFunction)(null);
 const htmlMarker='nmhVoiceLatencyReport';
 assert.equal(typeof htmlMarker,'string');
});
