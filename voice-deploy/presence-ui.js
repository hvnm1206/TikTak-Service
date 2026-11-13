// NMH Voice Presence — no network calls, no external libraries.
// Everything in this file is compiled into the existing Cloudflare Worker HTML.
// Visual controls are local only; no additional chargeable APIs.
export const CSS=String.raw`
html,body{min-height:100%;overscroll-behavior:none}
body{background:#050b16;background-image:radial-gradient(ellipse at 50% 20%,#12364b 0,transparent 60%),linear-gradient(#040b17,#071120);color:#e9faff}
.shell{position:relative;max-width:540px;min-height:100dvh;padding:calc(env(safe-area-inset-top) + 10px) 16px calc(env(safe-area-inset-bottom) + 13px)}
header{z-index:4;position:relative;letter-spacing:.65px;margin-bottom:0}
header>span{font-size:13px;font-weight:850}header>span::before{content:"";width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:8px;background:#75e6f6;box-shadow:0 0 15px #41d9ff}
header button{background:#122635;border:1px solid #2e4d60;font-size:11px!important;padding:9px 11px!important}
#talk{display:flex;flex:1;min-height:0;flex-direction:column;position:relative}
.moods{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin:14px 0 4px}
.moods button{padding:10px 12px;border-radius:100px;font-size:11px;min-height:38px;letter-spacing:.5px;background:#0e2231;color:#9ebecd;border:1px solid #254457}
.moods button.selected{background:#86eafb;color:#082132;outline:none;box-shadow:0 0 22px #4aebff45}
.presence{flex:1;min-height:235px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
.visual-field{position:relative;width:min(100%,450px);min-height:190px;max-height:455px;flex:1;display:flex;align-items:center;justify-content:center}
.visual-field::before{content:"";width:min(74%,320px);aspect-ratio:1;border-radius:50%;position:absolute;border:1px solid #4abbeb20;box-shadow:inset 0 0 70px #2fbef511,0 0 80px #23a9dd17}
#avatar{position:absolute;inset:0;width:100%;height:100%;touch-action:manipulation;cursor:pointer}
#avatar:focus-visible{outline:2px solid #8eefff;border-radius:28px}
.presence-note{text-align:center;z-index:1;padding:4px 8px 8px}
#stateHint{font-size:10px;letter-spacing:2.7px;color:#67bbd3;font-weight:750}
#status{font-size:19px;color:#edfdff;font-weight:780;line-height:1.35;min-height:26px;margin:7px 0 0;padding:0;background:transparent}
#liveUtterance{color:#78abc0;font-size:12px;max-height:36px;overflow:hidden}
#latestText{display:none;max-height:50px;overflow:hidden;max-width:94%;border-radius:13px;border:1px solid #234f66;background:#091f30;color:#b6d7e9;padding:9px 12px;font-size:12px;line-height:1.35}
#latestText.shown{display:block}
.bottom-dock{display:flex;flex-direction:column;align-items:center;gap:4px;z-index:2;padding-top:2px}
.utility-row{display:flex;justify-content:center;gap:9px}
.utility-row button{padding:7px 12px;font-size:11px;min-height:35px;border:1px solid #31536a;background:transparent;border-radius:100px;color:#aad0de}
.voice-actions{display:flex;align-items:center;justify-content:center;gap:9px;min-height:77px;margin:3px 0}
.voice-actions button{border-radius:100px;font-size:12px;min-width:64px;min-height:48px}
.voice-actions .talk{font-size:14px;font-weight:850;height:74px;width:74px;min-width:74px;padding:5px;background:linear-gradient(145deg,#c0feff,#48d2e8);color:#051927;box-shadow:0 0 0 7px #4bd6ff17,0 0 40px #3bd2eb55}
.voice-actions #stop{background:#902b48;min-width:110px;height:63px;color:#fff}
.voice-actions #interrupt,.voice-actions #resume{background:#163147;color:#e2f8ff;border:1px solid #356077}
.voice-footnote{font-size:10px;max-width:440px;text-align:center;color:#809dac;line-height:1.45}
.transcript{position:absolute;inset:42px 0 0;z-index:8;border:1px solid #31546a;border-radius:20px;padding:12px;display:flex;flex-direction:column;min-height:0;background:rgba(5,13,25,.98);box-shadow:0 20px 50px #000b}
.transcript-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
.transcript-header strong{font-size:13px;letter-spacing:.5px}
.transcript-header button{font-size:12px}
.transcript .history{flex:1;min-height:0;height:auto;background:transparent;overflow-y:auto}
.transcript .bubble{font-size:13px;background:#153044;border:1px solid #28506a}
.transcript .bubble.user{background:#1a4b60;margin-left:16%}
#voiceStatus{display:none}
#usageSummary{margin:10px 0 16px;padding:11px 12px;border-radius:12px;background:#0c2234;border:1px solid #26506a;color:#bddce9;font-size:12px}
#setup,#maintenance{overflow-y:auto;max-height:calc(100dvh - 80px);padding:12px 0 24px}
#setup .panel,#maintenance .panel{background:#102a3a}
#error:not(:empty){border:1px solid #b65364;background:#391b2a;border-radius:11px;padding:10px;margin-top:6px;font-size:12px}
@media(max-height:680px){.moods{margin:6px 0 2px}.moods button{min-height:31px;padding:7px 9px}.visual-field{min-height:155px;max-height:270px}.presence{min-height:180px}.presence-note{padding:0 8px 2px}#status{font-size:17px}.voice-actions{min-height:63px;margin:0}.voice-actions .talk{height:63px;width:63px;min-width:63px}.voice-footnote{display:none}}
`;
export const TALK=String.raw`<section id="talk">
 <nav class="moods" role="group" aria-label="Phong cách hội thoại">
 <button id="styleDanh" class="selected" type="button">ĐANH ĐÁ</button><button id="styleChem" type="button">CHÉM GIÓ</button><button id="styleNghiem" type="button">NGHIÊM TÚC</button></nav>
 <div class="presence"><div class="visual-field"><canvas id="avatar" role="img" aria-label="Khuôn mặt NMH Voice phản ứng theo trạng thái" tabindex="0"></canvas></div>
 <div class="presence-note"><span id="stateHint">NMH PRESENCE · SẴN SÀNG</span><div id="status" role="status" aria-live="polite">Chưa bắt đầu</div><div id="liveUtterance" aria-live="off"></div></div>
 <div id="latestText" aria-live="polite"></div></div>
 <div class="bottom-dock"><div class="utility-row"><button id="journalBtn" type="button" aria-controls="transcriptPanel" aria-expanded="false">NHẬT KÝ</button>
 <button id="subsBtn" type="button" aria-pressed="false">PHỤ ĐỀ: TẮT</button></div>
 <div class="voice-actions"><button class="primary talk" id="start">NÓI</button><button class="danger hidden" id="stop">KẾT THÚC</button><button id="interrupt" class="hidden">NGẮT AI</button><button id="resume" class="hidden">TIẾP TỤC</button></div>
 <small class="voice-footnote">Chạm NÓI để bắt đầu. Giọng Marin có phí, lỗi sẽ được báo rõ. Nếu Safari ngừng nghe, dùng TIẾP TỤC.</small></div>
 <div id="transcriptPanel" class="transcript hidden" aria-label="Nhật ký cuộc trò chuyện"><div class="transcript-header"><strong>NHẬT KÝ PHIÊN</strong><button id="closeJournal" type="button">ĐÓNG</button></div>
 <div id="history" class="history"><p>Chưa có hội thoại.</p></div></div>
 <div id="voiceStatus" class="hint hidden" role="status">Nguồn giọng: chưa phát</div></section>`;
export const FACE_SCRIPT=String.raw`
class PresenceFace{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');
  this.phase='idle';this.persona='danh_da';this.audio=null;this.power=0;
  this.lookX=0;this.lookY=0;this.targetX=0;this.targetY=0;this.last=0;this.nextBlink=0;this.blinkStart=-1000;
  this.birth=performance.now();
  this.reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  this.resize();this.onResize=()=>this.resize();
  this.ro=window.ResizeObserver?new ResizeObserver(this.onResize):null;this.ro?.observe(canvas);
  window.addEventListener('resize',this.onResize);
  canvas.addEventListener('pointermove',e=>{const b=canvas.getBoundingClientRect();this.targetX=Math.max(-1,Math.min(1,((e.clientX-b.left)/b.width-.5)*1.4));this.targetY=Math.max(-1,Math.min(1,((e.clientY-b.top)/b.height-.5)*1.4))});
  canvas.addEventListener('pointerleave',()=>{this.targetX=0;this.targetY=0});
  canvas.addEventListener('click',()=>this.wink());
  canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.wink()}});
  this.loop=t=>{this.raf=requestAnimationFrame(this.loop);if(document.hidden||t-this.last<33)return;this.last=t;this.draw(t)};
  this.raf=requestAnimationFrame(this.loop);
 }
 wink(){this.blinkStart=performance.now()}
 setState(s){this.phase=s;this.nextBlink=Math.min(this.nextBlink||0,performance.now()+250)}
 setPersona(s){this.persona=s}
 setAudio(a){this.audio=a}
 resize(){const b=this.canvas.getBoundingClientRect();this.W=b.width;this.H=b.height;this.dpr=Math.min(2,window.devicePixelRatio||1);if(this.W&&this.H){this.canvas.width=Math.max(1,Math.round(this.W*this.dpr));this.canvas.height=Math.max(1,Math.round(this.H*this.dpr));this.ctx?.setTransform(this.dpr,0,0,this.dpr,0,0)}}
 measure(){
  if(this.phase!=='speaking'||!this.audio)return 0;
  try{const v=new Uint8Array(this.audio.fftSize);this.audio.getByteTimeDomainData(v);let acc=0;for(const b of v){const s=(b-128)/128;acc+=s*s}return Math.min(1,Math.sqrt(acc/v.length)*4)}catch{return 0}
 }
 draw(t){
  const c=this.ctx,W=this.W,H=this.H;if(!c||!W||!H)return;
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,W,H);
  const sc=Math.min(W/410,H/340),cx=W/2,cy=H/2-6*sc;
  const clock=(t-this.birth)/1000,move=this.reduced?0:1;
  this.lookX+=(this.targetX-this.lookX)*.10;this.lookY+=(this.targetY-this.lookY)*.10;
  if(t>this.nextBlink){this.blinkStart=t;this.nextBlink=t+1800+Math.random()*3000}
  const dt=t-this.blinkStart;let open=dt>210?1:Math.max(.06,Math.abs(dt-105)/105);
  if(this.phase==='processing')open=Math.min(open,.81);
  if(this.phase==='paused')open=Math.min(open,.62);
  if(this.phase==='error')open=Math.min(open,.31);
  const accent=this.phase==='error'?'#ff7c99':this.persona==='nghiem_tuc'?'#9dbbff':this.persona==='chem_gio'?'#a6ffe7':'#89edff';
  const rgb=this.phase==='error'?'250,96,133':this.persona==='nghiem_tuc'?'124,165,250':this.persona==='chem_gio'?'106,244,197':'80,215,244';
  const pulse=this.phase==='speaking'?1:this.phase==='listening'?.7:this.phase==='processing'?.45:.2;
  this.power+=(this.measure()-this.power)*.25;
  const R=142*sc,orb=c.createRadialGradient(cx,cy,12,cx,cy,R*1.27);
  orb.addColorStop(0,'rgba('+rgb+',.15)');orb.addColorStop(.6,'rgba('+rgb+','+(.09+.08*pulse)+')');orb.addColorStop(1,'rgba('+rgb+',0)');
  c.fillStyle=orb;c.beginPath();c.arc(cx,cy,R*1.28,0,Math.PI*2);c.fill();
  for(let i=0;i<3;i++){
   const rad=R*(.88+i*.16+move*Math.sin(clock*1.3+i)*.006);
   c.strokeStyle='rgba('+rgb+','+(.34-i*.08+.12*pulse)+')';c.lineWidth=i===0?2:1;
   c.setLineDash(i===2?[3,10]:[]);
   c.beginPath();const start=(i%2?1:-1)*clock*.12*move+i;
   c.arc(cx,cy,rad,start,start+Math.PI*(i===0?1.88:1.46));c.stroke();c.setLineDash([]);
  }
  if(this.phase==='listening'){
   c.lineWidth=2.5*sc;c.strokeStyle='rgba('+rgb+',.75)';
   c.beginPath();c.arc(cx,cy,R*.94,-.6,.6);c.stroke();
  }
  if(this.phase==='processing')for(let i=0;i<3;i++){
   const a=clock*2*move+i*Math.PI*2/3;c.fillStyle=accent;
   c.beginPath();c.arc(cx+Math.cos(a)*R*.91,cy+Math.sin(a)*R*.91,3.1*sc,0,Math.PI*2);c.fill();
  }
  const bob=move*Math.sin(clock*.85)*2*sc,fy=cy+bob;
  const skin=c.createRadialGradient(cx-45*sc,fy-55*sc,2,cx,fy,128*sc);
  skin.addColorStop(0,'rgba(30,69,87,.84)');skin.addColorStop(.8,'rgba(7,25,39,.84)');skin.addColorStop(1,'rgba(6,17,30,.14)');
  c.fillStyle=skin;c.beginPath();c.ellipse(cx,fy,122*sc,106*sc,0,0,Math.PI*2);c.fill();
  c.strokeStyle='rgba('+rgb+',.18)';c.lineWidth=1;c.beginPath();c.ellipse(cx,fy,122*sc,106*sc,0,0,Math.PI*2);c.stroke();
  // Eyes express personality using brow angle; gaze follows a touch, never a camera.
  for(const side of [-1,1]){
   const ex=cx+side*55*sc+this.lookX*6*sc,ey=fy-17*sc+this.lookY*5*sc,ew=40*sc;
   let eh=(this.persona==='nghiem_tuc'?52:56)*sc*open;
   if(this.phase==='speaking')eh*=1-.14*this.power;
   eh=Math.max(3*sc,eh);
   c.shadowColor=accent;c.shadowBlur=15*sc;c.fillStyle=accent;
   c.beginPath();c.roundRect(ex-ew,ey-eh/2,ew*2,eh,Math.min(20*sc,eh/2));c.fill();c.shadowBlur=0;
   if(eh>12*sc&&this.phase!=='error'){
    c.save();c.beginPath();c.roundRect(ex-ew,ey-eh/2,ew*2,eh,Math.min(20*sc,eh/2));c.clip();
    const ix=ex+this.lookX*13*sc,iy=ey+this.lookY*9*sc;
    const gl=c.createRadialGradient(ix-8*sc,iy-9*sc,0,ix,iy,28*sc);
    gl.addColorStop(0,'#246d82');gl.addColorStop(1,'#052131');
    c.fillStyle=gl;c.beginPath();c.arc(ix,iy,27*sc,0,Math.PI*2);c.fill();
    c.fillStyle='#041322';c.beginPath();c.arc(ix,iy,15*sc,0,Math.PI*2);c.fill();
    c.fillStyle='#f1ffff';c.beginPath();c.arc(ix-9*sc,iy-10*sc,6*sc,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(255,255,255,.66)';c.beginPath();c.arc(ix+9*sc,iy+8*sc,2.5*sc,0,Math.PI*2);c.fill();c.restore();
   }
   c.strokeStyle=accent;c.lineWidth=3*sc;c.lineCap='round';
   const tilt=this.persona==='danh_da'?(side<0?4:-9):this.persona==='chem_gio'?-4:0;
   c.beginPath();c.moveTo(ex-ew+7*sc,ey-43*sc);c.quadraticCurveTo(ex,ey-(50+tilt)*sc,ex+ew-7*sc,ey-(43-tilt)*sc);c.stroke();
  }
  // Mouth motion is driven by actual MP3 playback analyser; no synthetic microphone level.
  c.lineCap='round';c.strokeStyle=accent;c.shadowColor=accent;c.shadowBlur=13*sc;
  if(this.phase==='speaking'){
   for(let i=-3;i<=3;i++){
    const h=(6+(1-Math.abs(i)/4)*this.power*31)*sc;
    c.lineWidth=6*sc;c.beginPath();c.moveTo(cx+i*13*sc,fy+66*sc-h/2);c.lineTo(cx+i*13*sc,fy+66*sc+h/2);c.stroke();
   }
  }else if(this.phase==='error'){
   c.lineWidth=4*sc;c.beginPath();c.moveTo(cx-22*sc,fy+65*sc);c.lineTo(cx+22*sc,fy+65*sc);c.stroke();
  }else{
   c.lineWidth=4*sc;c.beginPath();c.moveTo(cx-27*sc,fy+56*sc);
   c.quadraticCurveTo(cx,fy+(this.persona==='nghiem_tuc'?62:74)*sc,cx+27*sc,fy+56*sc);c.stroke();
  }c.shadowBlur=0;
 }
}
let avatarFace=null;
let captionsOn=load('nmh_voice_captions_v1','off')==='on';
function journal(open){
 $('transcriptPanel').classList.toggle('hidden',!open);
 $('journalBtn').setAttribute('aria-expanded',String(open));
 $('journalBtn').textContent=open?'ĐÓNG NHẬT KÝ':'NHẬT KÝ';
}
function captionRefresh(){
 $('subsBtn').textContent='PHỤ ĐỀ: '+(captionsOn?'BẬT':'TẮT');
 $('subsBtn').setAttribute('aria-pressed',String(captionsOn));
 $('latestText').classList.toggle('shown',captionsOn);
 const last=history[history.length-1];
 $('latestText').textContent=captionsOn&&last?(last.role==='user'?'BẠN · ':'AI · ')+last.content.slice(0,145):'';
 if(!captionsOn)$('liveUtterance').textContent='';
}
$('journalBtn').onclick=()=>journal($('transcriptPanel').classList.contains('hidden'));
$('closeJournal').onclick=()=>journal(false);
$('subsBtn').onclick=()=>{captionsOn=!captionsOn;persist('nmh_voice_captions_v1',captionsOn?'on':'off');captionRefresh()};
`;
function patchOnce(s,from,to){
 const count=s.split(from).length-1;
 if(count!==1)throw Error('NMH Presence patch mismatch ('+count+'): '+from.slice(0,70));
 return s.replace(from,to);
}
export function enhanceVoicePage(original){
 let p=original;
 p=patchOnce(p,'</style>',CSS+'</style>');
 const a=p.indexOf('<section id="talk">'),z=p.indexOf('</section>',a);
 if(a<0||z<0)throw Error('NMH Presence missing talk section');
 p=p.slice(0,a)+TALK+p.slice(z+'</section>'.length);
 p=patchOnce(p,'<section id="setup" class="hidden"><h2>SETUP</h2>','<section id="setup" class="hidden"><h2>SETUP</h2><div id="usageSummary" class="hint" role="status">Chi phí: chưa có lượt sử dụng trên thiết bị này</div>');
 p=patchOnce(p,' const labels={idle:',FACE_SCRIPT+' let micWatch=null; const labels={idle:');
 p=patchOnce(p,'function setState(s,detail=""){step=s;','function setState(s,detail=""){step=s;avatarFace?.setState(s);$("stateHint").textContent=({idle:"SẴN SÀNG",listening:"MIC · ĐANG NGHE",processing:"AI · ĐANG SUY NGHĨ",speaking:"MARIN · ĐANG NÓI",paused:"TẠM DỪNG",error:"CẦN KIỂM TRA"}[s]||"NMH PRESENCE");');
 p=patchOnce(p,'function closeRec(){if(rec){','function closeRec(){if(micWatch){clearTimeout(micWatch);micWatch=null}if(rec){');
 p=patchOnce(p,'r.onend=()=>{if(rec!==r)return;rec=null;','r.onend=()=>{if(rec!==r)return;if(micWatch){clearTimeout(micWatch);micWatch=null}rec=null;');
 p=patchOnce(p,'r.start();setState("listening");','r.start();setState("listening");micWatch=setTimeout(()=>{if(rec!==r||!active||g!==gen)return;const done=r.onend;if(heard.trim()&&done){r.onend=null;done();try{r.abort()}catch{}}else{closeRec();showError("Micro không có phản hồi sau 18 giây. Nhấn TIẾP TỤC để thử lại.")}},18000);');
 p=patchOnce(p,'e.scrollTop=e.scrollHeight}','e.scrollTop=e.scrollHeight;captionRefresh()}');
 p=patchOnce(p,'heard=(final||interim).trim()};','heard=(final||interim).trim();if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110);if(final.trim()&&rec===r&&active&&g===gen){const done=r.onend;if(done){r.onend=null;done();try{r.abort()}catch{}}}};');
 p=patchOnce(p,'const text=heard.trim();if(!text)','const text=heard.trim();$("liveUtterance").textContent="";if(!text)');
 p=patchOnce(p,'if(audioSource){audioSource.onended=null;','avatarFace?.setAudio(null);if(audioSource){audioSource.onended=null;');
 p=patchOnce(p,'s.connect(audioCtx.destination);audioSource=s;s.onended=','let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(audioCtx.destination)}catch{s.connect(audioCtx.destination)}avatarFace?.setAudio(meter);audioSource=s;s.onended=');
 p=patchOnce(p,'if(audioSource===s){audioSource=null;onDone?.()}','if(audioSource===s){audioSource=null;avatarFace?.setAudio(null);onDone?.()}');
 p=patchOnce(p,'function styleUI(){const a=','function styleUI(){avatarFace?.setPersona(style);const a=');
 p=patchOnce(p,' updateVoiceUI();renderCost();',' avatarFace=new PresenceFace($("avatar"));avatarFace.setPersona(style);updateVoiceUI();renderCost();captionRefresh();');
 return p;
}
