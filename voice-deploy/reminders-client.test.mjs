import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {enhanceReminderPage} from './reminders-client.js';

const page='<html><body><section id="start">Voice unmodified</section></body></html>';
test('foreground client script parses, and feature flag OFF leaves original DOM byte-for-byte',()=>{
 assert.equal(enhanceReminderPage(page,{}),page);
 assert.equal(enhanceReminderPage(page,{NMH_REMINDERS_MODE:'shadow'}),page);
 const html=enhanceReminderPage(page,{NMH_REMINDERS_MODE:'active'});
 assert.ok(html.includes('<section id="start">Voice unmodified</section>'));
 assert.ok(html.includes('nmhReminderToast'));
 const m=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(m?.[1],'missing injected script');
 assert.doesNotThrow(()=>new Script(m[1],{filename:'ngo-reminder-foreground.js'}));
});

test('client uses foreground polling, server atomic claim and manual Marin retry',()=>{
 const html=enhanceReminderPage(page,{NMH_REMINDERS_MODE:'active'});
 for(const mark of ["document.visibilityState!=='visible'","/api/reminders/due","/api/reminders/claim","'POST'","claim.claimed",
  "nmhReminderPlay","audio.play()","'/api/tts'","localStorage.getItem","state.textContent='Chưa phát được âm thanh"]){
  assert.ok(html.includes(mark),'Missing '+mark);
 }
 assert.ok(!html.includes('serviceWorker')&&!html.includes('PushManager'));
});

test('10-minute bounded foreground polling, no old 10-second interval, deduplicates resume',()=>{
 const html=enhanceReminderPage(page,{NMH_REMINDERS_MODE:'active'});
 assert.ok(html.includes('REMINDER_POLL_MS=10*60*1000'));
 assert.ok(html.includes('setInterval(()=>{void tick()},REMINDER_POLL_MS)'));
 assert.ok(!html.includes('setInterval(()=>{void tick()},10000)'));
 assert.ok(html.includes('if(document.visibilityState!==\'visible\'||checking)return;'));
 assert.ok(html.includes('finally{checking=false}'));
 assert.ok(html.includes('Date.now()-lastCheckAt>=60000'));
 assert.ok(html.includes('if(document.visibilityState===\'visible\''));
});
