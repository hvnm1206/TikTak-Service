// NGỐ: independently injected visual-only theme layer.
// Never hooks speech, TTS, reminders, memory, navigation, or microphone events.
const css=String.raw`<style id="ngoThemeCSS">
:root[data-ngo-theme="duck"]{--ngo-accent:#ed9418;--ngo-panel:#29313e;--ngo-stage:#423628}
:root[data-ngo-theme="corgi"]{--ngo-accent:#d98736;--ngo-panel:#26383a;--ngo-stage:#40352f}
:root[data-ngo-theme="duck"] body,:root[data-ngo-theme="corgi"] body{background:linear-gradient(155deg,#141d30,#17283a)}
:root[data-ngo-theme="duck"] button.primary,:root[data-ngo-theme="duck"] button.selected,
:root[data-ngo-theme="corgi"] button.primary,:root[data-ngo-theme="corgi"] button.selected{background:var(--ngo-accent);color:#101827}
:root[data-ngo-theme="duck"] .panel,:root[data-ngo-theme="corgi"] .panel{background:var(--ngo-panel)}
#ngoMascotStage{margin:10px auto 16px;width:min(100%,280px);height:190px;display:none;align-items:center;justify-content:center;position:relative;border-radius:22px;background:radial-gradient(circle at 50% 45%,#334e5d99,transparent 72%);overflow:hidden;pointer-events:none}
#ngoMascotStage[data-theme="duck"],#ngoMascotStage[data-theme="corgi"]{display:flex}
#ngoMascotStage svg{width:174px;height:174px;filter:drop-shadow(0 8px 9px #0007);transform-origin:50% 65%;animation:ngoMascotFloat 3.4s ease-in-out infinite}
#ngoMascotStage[data-state="speaking"] svg{animation:ngoMascotTalk .45s ease-in-out infinite alternate}
#ngoMascotStage[data-state="listening"] svg{animation:ngoMascotListen 1.2s ease-in-out infinite}
#ngoMascotStage[data-state="processing"] svg{animation:ngoMascotThink 1.5s ease-in-out infinite}
#ngoMascotStage[data-state="error"] svg{animation:none;opacity:.65}
#ngoMascotName{position:absolute;right:12px;bottom:8px;color:#cbd5e1;font:600 11px system-ui}
#ngoThemePicker{margin:16px 0;padding:15px;border:1px solid #64748b;border-radius:13px;background:#182437}
#ngoThemePicker label{display:block;font-weight:700;margin-bottom:7px}
#ngoThemeSelect{width:100%;min-height:47px;border:1px solid #8997a5;color:white;background:#243447;border-radius:10px;padding:8px 12px;font-size:16px}
@keyframes ngoMascotFloat{0%,100%{transform:translateY(2px)}50%{transform:translateY(-5px)}}
@keyframes ngoMascotTalk{from{transform:translateY(1px) scale(1)}to{transform:translateY(-4px) scale(1.055)}}
@keyframes ngoMascotListen{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}
@keyframes ngoMascotThink{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@media(prefers-reduced-motion:reduce){#ngoMascotStage svg{animation:none!important}}
</style>`;
const script=String.raw`<script id="ngoThemeScript">
(()=>{
  const status=document.getElementById('status');
  const setup=document.getElementById('setup');
  if(!status||!setup)return;
  const duck='<svg viewBox="0 0 210 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vịt trắng Ngố vui nhộn"><path d="M49 177 Q22 155 27 108 Q28 55 69 35 Q83 7 113 27 Q131 5 138 21 L133 36 Q180 48 186 105 Q195 152 163 181Z" fill="#fffdf6" stroke="#202630" stroke-width="6" stroke-linejoin="round"/><path d="M59 77 Q72 56 86 78 M124 76 Q139 52 156 73" fill="none" stroke="#373a40" stroke-width="4" stroke-linecap="round"/><ellipse cx="75" cy="107" rx="20" ry="33" fill="#f3fbff" stroke="#202630" stroke-width="3"/><ellipse cx="139" cy="106" rx="20" ry="33" fill="#f3fbff" stroke="#202630" stroke-width="3"/><ellipse cx="80" cy="115" rx="10" ry="19" fill="#171d23"/><ellipse cx="134" cy="115" rx="10" ry="19" fill="#171d23"/><circle cx="83" cy="106" r="4" fill="white"/><circle cx="136" cy="107" r="4" fill="white"/><path d="M42 146 Q85 119 108 132 Q135 116 174 148 Q136 190 85 176 Q54 174 42 146Z" fill="#ffc12d" stroke="#29251e" stroke-width="6" stroke-linejoin="round"/><path d="M70 169 Q108 201 150 165 Q127 210 103 201 Q82 197 70 169Z" fill="#c64147" stroke="#2b2830" stroke-width="4"/><path d="M61 154 Q105 164 153 151" fill="none" stroke="#ed9426" stroke-width="5" stroke-linecap="round"/></svg>';
  const corgi='<svg viewBox="0 0 210 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chó corgi Ngố vui nhộn"><path d="M52 105 L25 23 Q23 11 37 21 L81 57 Q108 47 130 55 L175 21 Q190 11 187 29 L168 108Z" fill="#df943d" stroke="#252a28" stroke-width="7" stroke-linejoin="round"/><path d="M55 75 42 40 69 69 M153 74 172 41 151 71" fill="#f5bcae" stroke="#eec1b7" stroke-width="9" stroke-linecap="round"/><ellipse cx="106" cy="117" rx="79" ry="70" fill="#e9a348" stroke="#232a28" stroke-width="7"/><path d="M105 53 Q94 95 98 133 Q80 157 62 153 Q69 184 104 184 Q139 181 150 152 Q120 159 113 128 Q114 99 105 53Z" fill="#fff0ce"/><ellipse cx="67" cy="127" rx="29" ry="23" fill="#fff0ce"/><ellipse cx="143" cy="127" rx="29" ry="23" fill="#fff0ce"/><circle cx="75" cy="112" r="13" fill="#232a28"/><circle cx="137" cy="112" r="13" fill="#232a28"/><circle cx="78" cy="108" r="4" fill="#fff"/><circle cx="140" cy="108" r="4" fill="#fff"/><ellipse cx="107" cy="136" rx="17" ry="13" fill="#20262a"/><path d="M87 154 Q107 174 126 152" fill="none" stroke="#25282b" stroke-width="5" stroke-linecap="round"/><path d="M99 164 Q103 193 116 188 Q128 174 113 167Z" fill="#e16c78" stroke="#a84751" stroke-width="3"/></svg>';
  const stage=document.createElement('div');stage.id='ngoMascotStage';stage.setAttribute('aria-label','Nhân vật giao diện Ngố');
  stage.innerHTML='<span id="ngoMascotName"></span>';
  status.insertAdjacentElement('afterend',stage);
  const picker=document.createElement('section');picker.id='ngoThemePicker';
  picker.innerHTML='<label for="ngoThemeSelect">GIAO DIỆN NGỐ</label><select id="ngoThemeSelect"><option value="default">Mặc định — giữ giao diện cũ</option><option value="duck">Vịt Ngố</option><option value="corgi">Corgi Ngố</option></select><p class="hint">Chỉ đổi nhân vật và màu giao diện; giữ nguyên micro, Marin, GPT, nhắc việc, bộ nhớ.</p>';
  const heading=setup.querySelector('h2');if(heading)heading.insertAdjacentElement('afterend',picker);else setup.prepend(picker);
  const select=picker.querySelector('select');
  const store='nmh_voice_theme_v1';
  const allowed=['default','duck','corgi'];
  let theme='default';try{const v=localStorage.getItem(store);if(allowed.includes(v))theme=v}catch{}
  const setTheme=v=>{
    theme=allowed.includes(v)?v:'default';
    select.value=theme;
    document.documentElement.dataset.ngoTheme=theme;
    stage.dataset.theme=theme;
    stage.querySelector('#ngoMascotName').textContent=theme==='duck'?'VỊT NGỐ':theme==='corgi'?'CORGI NGỐ':'';
    stage.querySelectorAll('svg').forEach(n=>n.remove());
    if(theme!=='default')stage.insertAdjacentHTML('afterbegin',theme==='duck'?duck:corgi);
    try{localStorage.setItem(store,theme)}catch{}
  };
  select.addEventListener('change',()=>setTheme(select.value));
  function state(){
    const t=status.textContent||'';
    stage.dataset.state=/Đang nghe/.test(t)?'listening':/Đang xử lý/.test(t)?'processing':/Đang trả lời/.test(t)?'speaking':/Lỗi Voice/.test(t)?'error':'idle';
  }
  new MutationObserver(state).observe(status,{childList:true,characterData:true,subtree:true});
  setTheme(theme);state();
})();
</script>`;
export function enhanceThemePage(original){
  if(typeof original!=='string'||!original.includes('</head>')||!original.includes('</body>'))throw Error('NGO_THEME_HTML_INVALID');
  return original.replace('</head>',css+'</head>').replace('</body>',script+'</body>');
}
