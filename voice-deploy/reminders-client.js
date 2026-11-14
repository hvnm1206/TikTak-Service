// Additive foreground-only UI. No edits to SpeechRecognition, mic, Voice scheduler or Marin engine.
const html=String.raw`
<aside id="nmhReminderToast" role="alert" aria-live="assertive" style="display:none;position:fixed;bottom:12px;left:12px;right:12px;max-width:480px;margin:auto;background:#172439;color:white;border:2px solid #f59e0b;border-radius:12px;padding:14px;z-index:30000;box-shadow:0 6px 30px #0009">
 <strong>NGỐ — ĐẾN GIỜ NHẮC</strong><p id="nmhReminderText" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>
 <p id="nmhReminderSound" style="font-size:13px">Đang hiển thị lời nhắc.</p>
 <div style="display:flex;gap:8px"><button type="button" id="nmhReminderPlay">PHÁT BẰNG MARIN</button><button type="button" id="nmhReminderClose">ĐÓNG</button></div>
</aside>`;
const script=String.raw`
(()=>{
 const box=document.getElementById('nmhReminderToast');
 if(!box)return;
 const label=document.getElementById('nmhReminderText'),state=document.getElementById('nmhReminderSound');
 const playBtn=document.getElementById('nmhReminderPlay'),closeBtn=document.getElementById('nmhReminderClose');
 const queue=[];let busy=false,active=null,audio=null,objectUrl=null;
 function cleanupAudio(){if(audio){try{audio.pause();audio.removeAttribute('src');audio.load()}catch{} audio=null}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 async function req(path,method='GET',data){
  const o={method,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}};
  if(data!==undefined){o.headers['content-type']='application/json';o.body=JSON.stringify(data)}
  const r=await fetch(path,o),d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'HTTP '+r.status);
  return d;
 }
 async function speak(){
  if(!active)return;
  const key=(()=>{try{return localStorage.getItem('nmh_voice_api_key_v1')||''}catch{return ''}})();
  if(!/^sk-[A-Za-z0-9_-]{20,250}$/.test(key)){state.textContent='Chưa có API key đã lưu trên iPhone. Lời nhắc đã hiển thị; lưu key tại SETUP để phát Marin.';return}
  state.textContent='Đang tải giọng Marin…';
  try{
   cleanupAudio();
   const r=await fetch('/api/tts',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey:key,text:active.text.slice(0,450),style:'nghiem_tuc'})});
   if(!r.ok)throw Error('TTS HTTP '+r.status);
   const blob=await r.blob();if(!blob.type.startsWith('audio/'))throw Error('Dữ liệu không phải âm thanh');
   objectUrl=URL.createObjectURL(blob);audio=new Audio(objectUrl);
   audio.addEventListener('ended',()=>{state.textContent='Đã phát xong Marin.'},{once:true});
   audio.addEventListener('error',()=>{state.textContent='Không phát được. Bấm PHÁT để thử lại.'},{once:true});
   await audio.play();state.textContent='Đang phát giọng Marin.';
  }catch(e){state.textContent='Chưa phát được âm thanh ('+String(e?.message||'bị chặn').slice(0,85)+'). Bấm PHÁT BẰNG MARIN để thử lại.'}
 }
 function showNext(){
  if(busy||!queue.length)return;
  busy=true;active=queue.shift();label.textContent=active.text;
  state.textContent='Thông báo đã hiển thị. Nếu Safari chặn âm thanh, bấm nút phát.';
  box.style.display='block';void speak();
 }
 closeBtn.addEventListener('click',()=>{cleanupAudio();box.style.display='none';busy=false;active=null;showNext()});
 playBtn.addEventListener('click',()=>{void speak()});
 const REMINDER_POLL_MS=10*60*1000;
 let lastCheckAt=0,checking=false;
 async function tick(){
  if(document.visibilityState!=='visible'||checking)return;
  // Foreground re-entry is checked promptly; duplicate focus events share one in-flight check.
  checking=true;lastCheckAt=Date.now();
  try{
   const data=await req('/api/reminders/due');
   for(const item of data.reminders||[]){
    // Claim is atomic on D1. Only the winning tab/device shows a reminder.
    try{const claim=await req('/api/reminders/claim','POST',{id:item.id});
     if(claim.claimed&&claim.reminder)queue.push(claim.reminder);
    }catch{}
   }
   showNext();
  }catch(e){/* offline: do not claim success or discard pending D1 reminders */}
  finally{checking=false}
 }
 const timer=setInterval(()=>{void tick()},REMINDER_POLL_MS);
 // Avoid duplicate wake/focus requests; still check when returning after >=60 seconds.
 const onResume=()=>{if(document.visibilityState==='visible'&&!checking&&Date.now()-lastCheckAt>=60000)void tick()};
 document.addEventListener('visibilitychange',onResume);
 window.addEventListener('focus',onResume);
 window.addEventListener('pagehide',()=>{clearInterval(timer);cleanupAudio()});
 setTimeout(()=>{void tick()},500);
})();
`;
export function enhanceReminderPage(original,env={}){
 if(env?.NMH_REMINDERS_MODE!=='active')return original;
 if(!original.includes('</body>'))throw Error('Missing HTML body');
 return original.replace('</body>',html+'<script>'+script+'</script></body>');
}
