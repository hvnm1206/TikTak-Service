// NMH Voice V3 private setup pane. No new public endpoint/secret is exposed here.
const memoryPanel=String.raw`
  <details id="v3MemoryV2Section" style="display:none"><summary><strong>GHI NHỚ THÔNG MINH (TỰ CHỌN)</strong></summary>
   <p class="hint">Khi bật, GPT có thể đề xuất ghi nhớ điều bền vững sau lượt hội thoại. Không ghi mọi lời nói. Ký ức tự học được xem và xóa trong mục này. Có thể tắt bất cứ lúc nào.</p>
   <p id="v3MemoryV2Status" class="hint" role="status">Đang kiểm tra cài đặt ghi nhớ…</p>
   <button type="button" id="v3MemoryV2Toggle" disabled>BẬT GHI NHỚ THÔNG MINH</button>
   <button type="button" id="v3LearnedReload" hidden>CẬP NHẬT KẾT QUẢ</button>
   <p class="hint" id="v3LearnedRun" role="status"></p>
   <div id="v3LearnedPanel" hidden>
    <p class="hint">Những gì Ngố đã học và tín hiệu đang chờ thêm căn cứ.</p>
    <div id="v3LearnedItems"></div>
    <button type="button" id="v3LearnedMore" hidden>XEM TIẾP</button>
   </div>
  </details>
`;
const panel=String.raw`
<section id="v3Personal" class="panel" style="margin:16px 0;display:grid;gap:10px">
 <h3 style="margin:0">CÁ NHÂN HÓA & ĐỒNG BỘ</h3>
 <p id="v3State" class="hint" role="status">Đang kiểm tra dịch vụ đồng bộ...</p>
 <div id="v3Login" style="display:none"><div id="v3GoogleBtn"></div><p class="hint">Đăng nhập Google để dùng chung dữ liệu trên nhiều thiết bị. OpenAI API key vẫn nằm trên từng thiết bị.</p></div>
 <div id="v3App" style="display:none">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong id="v3User"></strong><button id="v3Logout" type="button">ĐĂNG XUẤT</button></div>
  <details open><summary><strong>TÍNH CÁCH — PROMPT</strong></summary>
   <label for="v3Prompt" class="hint">Tự viết và chỉnh sửa Prompt. Áp dụng từ lượt hỏi tiếp theo.</label>
   <textarea id="v3Prompt" rows="7" maxlength="2500" style="width:100%;background:#111827;color:white;border:1px solid #64748b;border-radius:12px;padding:12px;font:inherit"></textarea>
   <div class="controls"><button type="button" id="v3SampleDanh">MẪU ĐANH ĐÁ</button><button type="button" id="v3SampleChem">MẪU CHÉM GIÓ</button><button type="button" id="v3SampleNghiem">MẪU NGHIÊM TÚC</button></div>
   <p id="v3ActivePreset" class="hint" role="status" aria-live="polite">Đang dùng: Prompt riêng — chưa chọn mẫu.</p>
   <button type="button" class="primary" id="v3SavePrompt">LƯU PROMPT</button>
   <p id="v3PromptSaveStatus" class="hint" role="status" aria-live="polite" style="margin:8px 0 0;white-space:pre-wrap">Chỉnh sửa Prompt rồi bấm LƯU PROMPT. Chỉ xác nhận thành công sau khi đọc lại D1.</p>
  </details>
  ${memoryPanel}
  <details><summary><strong>GHI NHỚ CHỦ ĐỘNG</strong></summary>
   <p class="hint">Chỉ ghi khi bạn nhập ở đây hoặc ra lệnh bằng giọng “Nhớ rằng...”. Không tự ghi lại mọi hội thoại.</p>
   <textarea id="v3MemoryText" rows="3" maxlength="500" style="width:100%;background:#111827;color:white;border:1px solid #64748b;border-radius:12px;padding:12px;font:inherit"></textarea>
   <button type="button" id="v3AddMemory">THÊM GHI NHỚ</button>
   <div id="v3Memories"></div>
  </details>
  <details><summary><strong>KHO TÀI LIỆU</strong></summary>
   <p class="hint">Lưu trực tiếp nội dung TXT/Markdown vào Cloudflare D1, không cần R2 hoặc kích hoạt thanh toán. PDF/DOCX chưa hỗ trợ trích xuất ở phiên này.</p>
   <input id="v3File" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown">
   <button type="button" id="v3Upload">THÊM TÀI LIỆU</button>
   <div id="v3Documents"></div>
  </details>
 </div>
 <p id="v3Msg" class="hint" role="status"></p>
</section>
`;
const script=String.raw`
(()=>{
 const $=id=>document.getElementById(id);
 const pilotMemory=false;
 const msg=s=>{$('v3Msg').textContent=String(s)};
 let rev=0,loginClient='',promptDirty=false,promptSaving=false,profileLoaded=false,loadedPrompt='',activePreset='',presetSelectionPending=false;
 let savedPresets={},presetBaseline,earlyPresetConflict=false;
 const updatePresetPreview=key=>{
  $('v3Prompt').value=savedPresets[key]??presets[key];
  promptStatus((Object.prototype.hasOwnProperty.call(savedPresets,key)?'ĐÃ CÓ MẪU TÙY CHỈNH: ':'CHƯA CÓ BẢN TÙY CHỈNH — ĐANG HIỆN MẪU GỐC: ')+presetLabel[key]+'. Sửa rồi bấm LƯU PROMPT để cập nhật đúng mẫu này.');
 };
 const loadInitialProfile=p=>{
  rev=p.revision;loadedPrompt=p.prompt||'';savedPresets=p.presets||{};profileLoaded=true;
  if(presetSelectionPending){
   presetBaseline=savedPresets[activePreset];
   if(!promptDirty&&!promptSaving)updatePresetPreview(activePreset);
   else earlyPresetConflict=presetBaseline!==undefined;
  }else activePreset=inferLegacyPreset(p);
  showPreset();
 };
 const presetLabel={danh:'ĐANH ĐÁ',chem:'CHÉM GIÓ',nghiem:'NGHIÊM TÚC'};
 const showPreset=()=>{
  $('v3ActivePreset').textContent=activePreset?'ĐANG CHỈNH MẪU: '+presetLabel[activePreset]:'ĐANG CHỈNH: PROMPT RIÊNG (không thuộc mẫu nào)';
  for(const [key,id] of [['danh','v3SampleDanh'],['chem','v3SampleChem'],['nghiem','v3SampleNghiem']]){
   const b=$(id);b.classList?.toggle('selected',key===activePreset);b.setAttribute?.('aria-pressed',String(key===activePreset));
  }
 };
 const inferLegacyPreset=p=>{
  if(p?.activePreset)return p.activePreset;
  const text=String(p?.prompt||'');
  return Object.keys(presets).find(key=>text===presets[key]&&(!p?.presets||p.presets[key]===undefined))||'';
 };
 const promptStatus=s=>{$('v3PromptSaveStatus').textContent=String(s)};
 const markPromptDirty=()=>{promptDirty=true;promptStatus('Chưa lưu thay đổi. Bấm LƯU PROMPT để đồng bộ.')};
 $('v3Prompt').addEventListener('input',markPromptDirty);
 let memoryV2={available:false,enabled:false,revision:0,mode:'off'};
 let signedIn=false;
 const req=async(path,method='GET',payload)=>{
  const opts={method,credentials:'same-origin',headers:{'content-type':'application/json'}};
  if(payload!==undefined)opts.body=JSON.stringify(payload);
  const r=await fetch(path,opts),d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'HTTP '+r.status);
  return d;
 };
 const safeText=(host,value)=>{host.replaceChildren();host.textContent=String(value||'')};
 function line(host,title,remove,edit){
  const p=document.createElement('div');p.style.cssText='display:flex;gap:6px;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #374151';
  const text=document.createElement('span');text.style.cssText='overflow-wrap:anywhere;white-space:pre-wrap;flex:1';text.textContent=String(title).slice(0,500);
  const btn=document.createElement('button');btn.type='button';btn.textContent='XÓA';btn.style.cssText='flex:0 0 auto;padding:8px';btn.onclick=remove;
  p.append(text);
  if(edit){const eb=document.createElement('button');eb.type='button';eb.textContent='SỬA';eb.style.cssText='padding:8px';eb.onclick=edit;p.append(eb)}
  p.append(btn);host.append(p);
 }
 async function populate(){
  const [p,m,d]=await Promise.all([req('/api/v3/profile'),req('/api/v3/memories'),req('/api/v3/documents')]);
  // Never replace the user's unsaved edits on refresh or a late Google callback.
  if(!promptDirty&&!promptSaving&&!presetSelectionPending){
   rev=p.revision;loadedPrompt=p.prompt||'';savedPresets=p.presets||{};activePreset=inferLegacyPreset(p);$('v3Prompt').value=loadedPrompt;profileLoaded=true;showPreset();
   promptStatus('Prompt đang được đồng bộ. Sửa rồi bấm LƯU PROMPT.');
  }else if(!profileLoaded){
   loadInitialProfile(p);
  }
  const ml=$('v3Memories');ml.replaceChildren();
  for(const item of m.memories||[])line(ml,item.body,async()=>{if(!confirm('Xóa ghi nhớ này?'))return;try{await req('/api/v3/memories/'+encodeURIComponent(item.id),'DELETE',{});await populate();msg('Đã xóa')}catch(e){msg(e.message)}},async()=>{const text=prompt('Sửa nội dung ghi nhớ:',item.body);if(text===null)return;try{await req('/api/v3/memories/'+encodeURIComponent(item.id),'PUT',{body:text.trim()});await populate();msg('Đã sửa')}catch(e){msg(e.message)}});
  const dl=$('v3Documents');dl.replaceChildren();
  for(const item of d.documents||[])line(dl,item.name+' ('+item.segment_count+' đoạn)',async()=>{if(!confirm('Xóa tài liệu này?'))return;try{await req('/api/v3/documents/'+encodeURIComponent(item.id),'DELETE',{});await populate();msg('Đã xóa')}catch(e){msg(e.message)}},async()=>{try{const d=await req('/api/v3/documents/'+encodeURIComponent(item.id));alert(d.name+'\n\n'+d.text)}catch(e){msg(e.message)}});
 }
 let learnedOffset=0;
 const learnedLabels={identity:'Con người và quan hệ',context:'Mục tiêu và hoàn cảnh',ask:'ASK',disc:'DISC',collaboration:'Cách hỗ trợ'};
 const runLabels={'pending':'Đang phân tích','saved':'Đã ghi hoặc cập nhật','no-change':'Không có mục mới đủ điều kiện ghi','ignored':'Bỏ qua lượt này','analysis-failed':'Phân tích gặp lỗi','skipped-action':'Lượt dùng công cụ ghi nhớ hoặc nhắc việc'};
 const reasonLabels={'no-proposal':'GPT không đề xuất mục nào','no-valid-change':'Đề xuất trùng hoặc chưa qua kiểm tra','invalid-output':'GPT trả kết quả không hợp lệ','incomplete':'GPT chưa trả đủ kết quả','timeout':'Quá thời gian','internal':'Lỗi xử lý trên máy chủ'};
 const aspectLabels={attitude:'thái độ',skill:'kỹ năng',knowledge:'kiến thức',D:'D',I:'I',S:'S',C:'C'};
 async function showLearned(reset){
  const host=$('v3LearnedItems'),more=$('v3LearnedMore');
  const reload=$('v3LearnedReload');
  more.disabled=true;reload.disabled=true;
  try{
   const data=await req('/api/v3/personal-memory?offset='+(reset?0:learnedOffset));
   $('v3LearnedPanel').hidden=false;
   if(reset){
    host.replaceChildren();
    const r=data.lastRun;
    const reason=r&&(reasonLabels[r.reason]||(/^http-[0-9]{3}$/.test(r.reason||'')?'OpenAI HTTP '+r.reason.slice(5):''));
    $('v3LearnedRun').textContent=r?['Lượt gần nhất '+new Date(r.learned_at).toLocaleTimeString('vi-VN'),runLabels[r.state],r.saved_count?r.saved_count+' mục':'',reason].filter(Boolean).join(' · '):'Chưa có kết quả phân tích.';
   }
   for(const item of data.entries||[]){
    const title=[learnedLabels[item.category],aspectLabels[item.aspect],item.domain,
     item.state==='candidate'?'Chờ căn cứ':item.kind==='inferred'?'Nhận định':'',item.body,'Nguồn: '+item.evidence].filter(Boolean).join(' · ');
    line(host,title,async()=>{
     if(!confirm('Xóa mục này cùng lịch sử ghi nhớ?'))return;
     try{await req('/api/v3/personal-memory','DELETE',{id:item.id});await showLearned(true)}catch(e){msg(e.message)}
    });
   }
   if(reset&&!data.entries?.length)host.textContent='Chưa có mục nào.';
   learnedOffset=data.nextOffset;
   more.hidden=learnedOffset===null;
  }finally{more.disabled=false;reload.disabled=false}
 }
 $('v3LearnedReload').onclick=async()=>{
  if(!signedIn){await refresh();return}
  await refreshMemoryV2();
 };
 const showMemoryError=e=>{$('v3LearnedRun').textContent='Chưa đọc được kết quả: '+e.message};
 $('v3LearnedMore').onclick=()=>showLearned(false).catch(e=>msg(e.message));
 async function refreshMemoryV2(){
  try{
   const p=await req('/api/v3/memory-v2-preference');
   memoryV2=p;
   $('v3MemoryV2Section').style.display=p.available||pilotMemory?'block':'none';
   $('v3LearnedPanel').hidden=!(p.personalMemory||pilotMemory);
   $('v3MemoryV2Toggle').disabled=!p.available;
   if(!p.available){$('v3MemoryV2Status').textContent='Ghi nhớ thông minh chưa được bật trên máy chủ.';return}
   $('v3MemoryV2Status').textContent=p.mode==='shadow'
    ? 'ĐANG THỬ NGHIỆM KHÔNG GHI DỮ LIỆU — '+(p.enabled?'Đã đồng ý phân tích':'Chưa đồng ý phân tích')
    : (p.enabled?'ĐANG BẬT — bộ nhớ có thể cập nhật sau mỗi lượt':'ĐANG TẮT — không tự ghi nhớ');
   $('v3MemoryV2Toggle').textContent=p.enabled?'TẮT GHI NHỚ THÔNG MINH':'BẬT GHI NHỚ THÔNG MINH';
   if(p.personalMemory||pilotMemory)await showLearned(true).catch(showMemoryError);
  }catch(e){
   if(pilotMemory){
    $('v3MemoryV2Section').style.display='block';
    $('v3MemoryV2Toggle').disabled=true;
    $('v3MemoryV2Status').textContent='Chưa đọc được cài đặt ghi nhớ: '+e.message;
   }else msg('Memory V2 chưa sẵn sàng: '+e.message);
  }
 }
 $('v3MemoryV2Toggle').onclick=async()=>{
  if(!signedIn||!memoryV2.available)return;
  const want=!memoryV2.enabled;
  if(want&&!confirm('Cho phép GPT phân tích các lượt hội thoại của tài khoản này để đề xuất ghi nhớ lâu dài? Có thể tắt bất cứ lúc nào.'))return;
  try{
   const r=await req('/api/v3/memory-v2-preference','PUT',{enabled:want,revision:memoryV2.revision});
   memoryV2={...memoryV2,enabled:r.enabled,revision:r.revision};
   await refreshMemoryV2();
   msg(r.enabled?'Đã bật tùy chọn ghi nhớ thông minh.':'Đã tắt ghi nhớ thông minh.');
  }catch(e){msg('Không thay đổi được: '+e.message)}
 };
 async function refresh(){
  try{
   const conf=await req('/api/v3/config');
   if(!conf.ready){if(pilotMemory)$('v3MemoryV2Status').textContent='Máy chủ chưa sẵn sàng để đọc ghi nhớ.';$('v3State').textContent='Đồng bộ chưa kích hoạt: cần D1 và Google Web Client. Không cần R2. Dữ liệu chưa được lưu.';return}
   loginClient=conf.googleClientId;
   const me=await req('/api/v3/me').catch(()=>null);
   signedIn=!!me?.signedIn;
   if(signedIn){
    $('v3Login').style.display='none';$('v3App').style.display='grid';$('v3State').textContent='Đã đồng bộ — chỉ bạn truy cập dữ liệu tài khoản này.';$('v3User').textContent=me.name||'Tài khoản Google';await Promise.all([populate().catch(e=>msg('Chưa tải đủ hồ sơ: '+e.message)),refreshMemoryV2()]);
   }else{
    if(pilotMemory){
     $('v3MemoryV2Toggle').disabled=true;
     $('v3MemoryV2Status').textContent='Đăng nhập Google để bật ghi nhớ và xem kết quả.';
     $('v3LearnedPanel').hidden=true;
     $('v3LearnedItems').replaceChildren();
     $('v3LearnedRun').textContent='';
    }
    $('v3Login').style.display='block';$('v3App').style.display='none';$('v3State').textContent='Chưa đăng nhập Google — ghi nhớ và tài liệu chưa đồng bộ.';
    if(window.google?.accounts?.id&&loginClient){
     $('v3GoogleBtn').replaceChildren();
     google.accounts.id.initialize({client_id:loginClient,callback:async response=>{
      try{await req('/api/v3/auth/google','POST',{credential:response.credential});await refresh();msg('Đăng nhập thành công')}catch(e){msg('Đăng nhập thất bại: '+e.message)}
     }});
     google.accounts.id.renderButton($('v3GoogleBtn'),{theme:'outline',size:'large',text:'signin_with',width:240});
    }else msg('Đang tải đăng nhập Google; nếu không hiện nút, kiểm tra trình duyệt và cấu hình.');
   }
  }catch(e){if(pilotMemory)$('v3MemoryV2Status').textContent='Chưa kiểm tra được phiên đăng nhập: '+e.message;msg('Đồng bộ chưa sẵn sàng: '+e.message)}
 }
 $('v3Logout').onclick=async()=>{try{await req('/api/v3/logout','POST',{});location.reload()}catch(e){msg(e.message)}};
 const presets={
  danh:'Lanh lợi, đanh đá nhẹ và hài hước. Xưng tao, gọi người dùng là mày. Không xúc phạm. Khi hỏi kỹ thuật, ưu tiên sự thật.',
  chem:'Dí dỏm, thông minh, kể chuyện ngắn. Xưng tôi, gọi người dùng là anh. Không bịa.',
  nghiem:'Chuyên nghiệp, rõ ràng, đi thẳng trọng tâm; phản biện có căn cứ, không đồng tình vô điều kiện.'
 };
 const selectPreset=key=>{
  if(promptSaving)return;
  if(promptDirty&&!confirm('Prompt đang sửa chưa lưu. Chuyển mẫu sẽ thay nội dung hiện tại. Tiếp tục?'))return;
  activePreset=key;showPreset();
  // Selecting a template is navigation, not a manual unsaved edit.
  // The selected text is a preview until Save; do not trigger a spurious confirm on next selection.
  promptDirty=false;
  presetSelectionPending=true;
  presetBaseline=savedPresets[key];earlyPresetConflict=false;
  updatePresetPreview(key);
 };
 $('v3SampleDanh').onclick=()=>selectPreset('danh');
 $('v3SampleChem').onclick=()=>selectPreset('chem');
 $('v3SampleNghiem').onclick=()=>selectPreset('nghiem');
 $('v3SavePrompt').onclick=async()=>{
  if(promptSaving)return;
  const draft=$('v3Prompt').value,btn=$('v3SavePrompt');
  promptSaving=true;btn.disabled=true;btn.textContent='ĐANG LƯU…';promptStatus('Đang ghi Prompt và đọc lại dữ liệu D1…');
  try{
   // Load the latest revision and compare saved baseline before overwriting another device.
   const current=await req('/api/v3/profile');
   if(!profileLoaded)loadInitialProfile(current);
   const selectedKey=activePreset;
   const baseline=presetSelectionPending?presetBaseline:savedPresets[selectedKey];
   const slot=current.presets?.[selectedKey];
   if(earlyPresetConflict||(current.revision!==rev&&(current.prompt!==loadedPrompt||(selectedKey&&slot!==baseline)))){
    earlyPresetConflict=false;presetBaseline=slot;
    rev=current.revision;loadedPrompt=current.prompt||'';savedPresets=current.presets||{};
    promptDirty=true;promptStatus('Đã có Prompt hoặc mẫu lưu khác với bản đang sửa. Bản nháp vẫn được giữ. Kiểm tra bản đã lưu hoặc bấm LƯU PROMPT lần nữa để thay thế.');
    return;
   }
   rev=current.revision;
   const result=await req('/api/v3/profile','PUT',{prompt:draft,revision:rev,presetKey:selectedKey});
   if(result?.ok!==true||result?.verified!==true||result?.prompt!==draft||result?.revision!==rev+1||result?.activePreset!==selectedKey||(selectedKey&&result?.presets?.[selectedKey]!==draft))throw Error('Máy chủ chưa xác nhận chính xác nội dung Prompt.');
   // Re-read independently to prove the newest revision belongs to this account.
   const confirmed=await req('/api/v3/profile');
   if(confirmed.prompt!==draft||confirmed.revision!==result.revision||confirmed.activePreset!==selectedKey||(selectedKey&&confirmed?.presets?.[selectedKey]!==draft))throw Error('Chưa đọc lại được đúng Prompt vừa lưu.');
   rev=confirmed.revision;loadedPrompt=draft;savedPresets=confirmed.presets||{};activePreset=confirmed.activePreset||'';presetSelectionPending=false;earlyPresetConflict=false;showPreset();
   if($('v3Prompt').value===draft){promptDirty=false;promptStatus('ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG'+(selectedKey?' — mẫu này đã được cập nhật vĩnh viễn theo tài khoản.':'')+' — có hiệu lực từ lượt hỏi tiếp theo.');}
   else{promptDirty=true;promptStatus('Đã lưu bản vừa gửi. Có thay đổi mới chưa lưu trong ô Prompt.');}
  }catch(e){
   promptDirty=true;promptStatus('CHƯA LƯU ĐƯỢC: '+String(e?.message||'Lỗi không xác định')+'. Nội dung đang nhập được giữ nguyên.');
  }finally{promptSaving=false;btn.disabled=false;btn.textContent='LƯU PROMPT'}
 };
 $('v3AddMemory').onclick=async()=>{try{const text=$('v3MemoryText').value.trim();if(!text){msg('Chưa có nội dung ghi nhớ');return}await req('/api/v3/memories','POST',{body:text});$('v3MemoryText').value='';await populate();msg('Đã lưu ghi nhớ')}catch(e){msg('Chưa lưu: '+e.message)}};
 $('v3Upload').onclick=async()=>{
  const file=$('v3File').files?.[0];if(!file){msg('Chưa chọn file');return}
  if(!/\.(txt|md|markdown)$/i.test(file.name)){msg('Hiện chưa trích xuất được PDF/DOCX, chỉ nhận TXT/Markdown');return}
  if(file.size>60000){msg('Tài liệu vượt giới hạn 60.000 byte của bản thử nghiệm');return}
  try{
   const text=await file.text();const d=await req('/api/v3/documents','POST',{name:file.name,mime:/\.txt$/i.test(file.name)?'text/plain':'text/markdown',text});
   $('v3File').value='';await populate();msg('Đã đồng bộ tài liệu: '+d.segments+' đoạn')
  }catch(e){msg('Chưa tải được tài liệu: '+e.message)}
 };
 window.nmhV3Refresh=()=>refresh();
 window.nmhV3GoogleReady=()=>{if(loginClient)refresh()};
 refresh();
})();
`;
export function enhanceV3Page(original,env={}){
 if(!original.includes('<section id="setup"')||!original.includes('</body>'))throw Error('Voice Setup layout changed');
 const id=String(env?.NMH_V3_GOOGLE_CLIENT_ID||'');
 const authorized=/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(id);
 const pilot=env.NMH_PERSONAL_MEMORY==='pilot';
 const google=authorized?'<script src="https://accounts.google.com/gsi/client" async defer onload="window.nmhV3GoogleReady?.()"></script>':'';
 const layout=pilot?panel.replace(memoryPanel,'').replace(' <div id="v3App"',memoryPanel
  .replace('id="v3MemoryV2Section" style="display:none"','id="v3MemoryV2Section" open')
  .replace('id="v3LearnedReload" hidden','id="v3LearnedReload"')+' <div id="v3App"'):panel;
 return original.replace('<button id="back">QUAY LẠI</button></section>',layout+'<button id="back">QUAY LẠI</button></section>')
  .replace('</body>',google+'<script>'+(pilot?script.replace('const pilotMemory=false','const pilotMemory=true'):script)+'</script></body>');
}
