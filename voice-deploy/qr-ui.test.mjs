import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
import worker from './worker.js';
import {NGO_APP_URL,NGO_QR_SIZE,NGO_QR_HEX_ROWS,NGO_QR_MATRIX_SHA256,buildQrSvg,enhanceQrPage} from './qr-ui.js';

test('QR code contains exact app URL, valid independently decoded QR matrix and four-module border',()=>{
 assert.equal(NGO_APP_URL,'https://nmh-voice-gpt-test.magical-budget.workers.dev/');
 assert.equal(NGO_QR_SIZE,41);
 assert.equal(NGO_QR_HEX_ROWS.length,41);
 const bits=NGO_QR_HEX_ROWS.map(x=>BigInt('0x'+x).toString(2).padStart(41,'0'));
 assert.ok(bits.every(x=>x.length===41));
 for(const row of [...bits.slice(0,4),...bits.slice(-4)])assert.equal(row,'0'.repeat(41));
 const digest=createHash('sha256').update(bits.join('')).digest('hex');
 assert.equal(digest,NGO_QR_MATRIX_SHA256);
 assert.equal(digest,'9aa11ca4324cf0479d963dd15c73793348d28088ebe499bb901883b9743ff026');
 const svg=buildQrSvg();
 assert.match(svg,/viewBox="0 0 41 41"/);
 assert.match(svg,/aria-label="Mã QR mở ứng dụng Ngố"/);
 assert.match(svg,/shape-rendering:crispEdges/);
 assert.match(svg,/<path d="M/);
 assert.ok(svg.includes('fill="#000"'));
});
test('SETUP includes QR and public-only link with no external QR service and preserved voice',async()=>{
 const response=await worker.fetch(new Request('https://voice.test/'),{NMH_REMINDERS_MODE:'active'});
 assert.equal(response.status,200);
 const html=await response.text();
 for(const token of ['id="ngoQrShare"','id="ngoAppQrCode"','id="ngoAppQrLink"','id="ngoAppQrCopy"','id="ngoQrCopyScript"','nmh-voice-gpt-test.magical-budget.workers.dev','SpeechRecognition','ngoThemeSelect','nmhVoiceLatencyReport']){
  assert.ok(html.includes(token),'Missing '+token);
 }
 assert.ok(!html.includes('api.qrserver.com'));
 assert.ok(!html.includes('chart.googleapis.com'));
 assert.ok(!html.includes('qr-code-styling'));
 assert.equal((html.match(/id="ngoQrShare"/g)||[]).length,1);
 assert.match(html,/MÃ QR MỞ NGỐ TRÊN ĐIỆN THOẠI/);
 const script=html.match(/<script id="ngoQrCopyScript">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Script(script));
});
test('invalid setup fails closed rather than silently dropping QR',()=>{
 assert.throws(()=>enhanceQrPage('<html><body>No setup</body></html>'),/NGO_SETUP_QR_MARKER_MISSING/);
});
