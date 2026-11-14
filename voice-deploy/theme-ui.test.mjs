import test from 'node:test';
import assert from 'node:assert/strict';
import {enhanceThemePage} from './theme-ui.js';
import fs from 'node:fs';
import vm from 'node:vm';

test('theme is an additive visual layer with default old appearance',()=>{
 const input='<!doctype html><html><head><title>Voice</title></head><body><div id="status">Chưa bắt đầu</div><section id="setup"><h2>SETUP</h2></section><button id="start">NÓI</button><div id="nmhReminderToast"></div></body></html>';
 const output=enhanceThemePage(input);
 for(const marker of ['id="start"','id="nmhReminderToast"','ngoThemeCSS','ngoThemeScript','ngoThemeSelect','nmh_voice_theme_v1','data-state','Vịt Ngố','Corgi Ngố'])assert.ok(output.includes(marker),marker);
 assert.equal((output.match(/<script/g)||[]).length,1);
 assert.equal((output.match(/<\/script>/g)||[]).length,1);
 assert.ok(output.includes('theme=\'default\''));
 const script=output.match(/<script id="ngoThemeScript">([\s\S]*?)<\/script>/)?.[1]; assert.ok(script);
 new vm.Script(script);
});
test('theme does not touch core Voice or storage of keys',()=>{
 const source=fs.readFileSync(new URL('./theme-ui.js',import.meta.url),'utf8');
 assert.ok(!/speechRecognition|SpeechRecognition|\/api\/tts|\/api\/chat|\/api\/reminders|nmh_voice_api_key_v1/.test(source));
 for(const key of ['theme','avatar','status','MutationObserver','prefers-reduced-motion'])assert.ok(source.includes(key));
});
test('Marin volume uses WebAudio gain, compressor and persisted bounded input, not microphone replacement',()=>{
 const src=fs.readFileSync(new URL('./worker.js',import.meta.url),'utf8');
 assert.ok(src.includes('audioCtx.createGain()')&&src.includes('audioCtx.createDynamicsCompressor()'));
 assert.ok(src.includes('gain.connect(limiter);limiter.connect(audioCtx.destination)'));
 assert.ok(src.includes('nmh_voice_gain_v1')&&src.includes('id=\\\"gain\\\"'));
 assert.ok(src.includes('clamp(load(\\\"nmh_voice_gain_v1\\\",\\\"1.55\\\"),1,2.5,1.55)'));
 assert.ok(src.includes('enhanceThemePage(enhanceReminderPage(enhanceV3Page(PAGE,env),env))'));
 assert.ok(src.includes('window.SpeechRecognition||window.webkitSpeechRecognition'));
});
