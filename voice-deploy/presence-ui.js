// NMH Voice Presence — no network calls, no external libraries.
// Everything in this file is compiled into the existing Cloudflare Worker HTML.
export const CSS=String.raw\`
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
\`;
export const TALK=String.raw\`<section id="talk">
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
 <div id="voiceStatus" class="hint hidden" role="status">Nguồn giọng: chưa phát</div></section>\`;
export const FACE_SCRIPT=String.raw\`
/*__FACE_ENGINE__*/
\`;
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
 p=patchOnce(p,' const labels={idle:',FACE_SCRIPT+' const labels={idle:');
 p=patchOnce(p,'function setState(s,detail=""){step=s;','function setState(s,detail=""){step=s;avatarFace?.setState(s);$("stateHint").textContent=({idle:"SẴN SÀNG",listening:"MIC · ĐANG NGHE",processing:"AI · ĐANG SUY NGHĨ",speaking:"MARIN · ĐANG NÓI",paused:"TẠM DỪNG",error:"CẦN KIỂM TRA"}[s]||"NMH PRESENCE");');
 p=patchOnce(p,'e.scrollTop=e.scrollHeight}','e.scrollTop=e.scrollHeight;captionRefresh()}');
 p=patchOnce(p,'heard=(final||interim).trim()};','heard=(final||interim).trim();if(captionsOn)$("liveUtterance").textContent=heard.slice(0,110)};');
 p=patchOnce(p,'const text=heard.trim();if(!text)','const text=heard.trim();$("liveUtterance").textContent="";if(!text)');
 p=patchOnce(p,'if(audioSource){audioSource.onended=null;','avatarFace?.setAudio(null);if(audioSource){audioSource.onended=null;');
 p=patchOnce(p,'s.connect(audioCtx.destination);audioSource=s;s.onended=','let meter=null;try{meter=audioCtx.createAnalyser();meter.fftSize=256;s.connect(meter);meter.connect(audioCtx.destination)}catch{s.connect(audioCtx.destination)}avatarFace?.setAudio(meter);audioSource=s;s.onended=');
 p=patchOnce(p,'if(audioSource===s){audioSource=null;onDone?.()}','if(audioSource===s){audioSource=null;avatarFace?.setAudio(null);onDone?.()}');
 p=patchOnce(p,'function styleUI(){const a=','function styleUI(){avatarFace?.setPersona(style);const a=');
 p=patchOnce(p,' updateVoiceUI();renderCost();',' avatarFace=new PresenceFace($("avatar"));avatarFace.setPersona(style);updateVoiceUI();renderCost();captionRefresh();');
 return p;
}
