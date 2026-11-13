// NMH Voice V3 private setup pane. No new public endpoint/secret is exposed here.
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
   <button type="button" class="primary" id="v3SavePrompt">LƯU PROMPT</button>
  </details>
  <details><summary><strong>GHI NHỚ CHỦ ĐỘNG</strong></summary>
   <p class="hint">Chỉ ghi khi bạn nhập ở đây hoặc ra lệnh bằng giọng “Nhớ rằng...”. Không tự ghi lại mọi hội thoại.</p>
   <textarea id="v3MemoryText" rows="3" maxlength="500" style="width:100%;background:#111827;color:white;border:1px solid #64748b;border-radius:12px;padding:12px;font:inherit"></textarea>
   <button type="button" id="v3AddMemory">THÊM GHI NHỚ</button>
   <div id="v3Memories"></div>
  </details>
  <details><summary><strong>KHO TÀI LIỆU</strong></summary>
   <p class="hint">Giai đoạn này chỉ lập chỉ mục TXT và Markdown. PDF/DOCX chưa xử lý nội dung; không tuyên bố đã tra cứu khi chưa trích xuất được chữ.</p>
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
 const msg=s=>{$('v3Msg').textContent=String(s)};
 let rev=0,loginClient='';
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
  rev=p.revision;$('v3Prompt').value=p.prompt||'';
  const ml=$('v3Memories');ml.replaceChildren();
  for(const item of m.memories||[])line(ml,item.body,async()=>{if(!confirm('Xóa ghi nhớ này?'))return;try{await req('/api/v3/memories/'+encodeURIComponent(item.id),'DELETE',{});await populate();msg('Đã xóa')}catch(e){msg(e.message)}},async()=>{const text=prompt('Sửa nội dung ghi nhớ:',item.body);if(text===null)return;try{await req('/api/v3/memories/'+encodeURIComponent(item.id),'PUT',{body:text.trim()});await populate();msg('Đã sửa')}catch(e){msg(e.message)}});
  const dl=$('v3Documents');dl.replaceChildren();
  for(const item of d.documents||[])line(dl,item.name+' ('+item.segment_count+' đoạn)',async()=>{if(!confirm('Xóa tài liệu này?'))return;try{await req('/api/v3/documents/'+encodeURIComponent(item.id),'DELETE',{});await populate();msg('Đã xóa')}catch(e){msg(e.message)}});
 }
 async function refresh(){
  try{
   const conf=await req('/api/v3/config');
   if(!conf.ready){$('v3State').textContent='Đồng bộ chưa kích hoạt: cần quyền Cloudflare D1/R2, Google Web Client và khóa phiên. Dữ liệu chưa được lưu.';return}
   loginClient=conf.googleClientId;
   const me=await req('/api/v3/me').catch(()=>null);
   if(me?.signedIn){
    $('v3Login').style.display='none';$('v3App').style.display='grid';$('v3State').textContent='Đã đồng bộ — chỉ bạn truy cập dữ liệu tài khoản này.';$('v3User').textContent=me.name||'Tài khoản Google';await populate();
   }else{
    $('v3Login').style.display='block';$('v3App').style.display='none';$('v3State').textContent='Chưa đăng nhập Google — ghi nhớ và tài liệu chưa đồng bộ.';
    if(window.google?.accounts?.id&&loginClient){
     google.accounts.id.initialize({client_id:loginClient,callback:async response=>{
      try{await req('/api/v3/auth/google','POST',{credential:response.credential});await refresh();msg('Đăng nhập thành công')}catch(e){msg('Đăng nhập thất bại: '+e.message)}
     }});
     google.accounts.id.renderButton($('v3GoogleBtn'),{theme:'outline',size:'large',text:'signin_with',width:240});
    }else msg('Không tải được Google Sign-In. Kiểm tra cấu hình trình duyệt.');
   }
  }catch(e){msg('Đồng bộ chưa sẵn sàng: '+e.message)}
 }
 $('v3Logout').onclick=async()=>{try{await req('/api/v3/logout','POST',{});location.reload()}catch(e){msg(e.message)}};
 const presets={
  danh:'Lanh lợi, đanh đá nhẹ và hài hước. Xưng tao, gọi người dùng là mày. Không xúc phạm. Khi hỏi kỹ thuật, ưu tiên sự thật.',
  chem:'Dí dỏm, thông minh, kể chuyện ngắn. Xưng tôi, gọi người dùng là anh. Không bịa.',
  nghiem:'Chuyên nghiệp, rõ ràng, đi thẳng trọng tâm; phản biện có căn cứ, không đồng tình vô điều kiện.'
 };
 $('v3SampleDanh').onclick=()=>{$('v3Prompt').value=presets.danh};
 $('v3SampleChem').onclick=()=>{$('v3Prompt').value=presets.chem};
 $('v3SampleNghiem').onclick=()=>{$('v3Prompt').value=presets.nghiem};
 $('v3SavePrompt').onclick=async()=>{try{const d=await req('/api/v3/profile','PUT',{prompt:$('v3Prompt').value,revision:rev});rev=d.revision;msg('Đã lưu Prompt và đồng bộ')}catch(e){msg(e.message)}};
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
 refresh();
})();
`;
export function enhanceV3Page(original,env={}){
 if(!original.includes('<section id="setup"')||!original.includes('</body>'))throw Error('Voice Setup layout changed');
 const id=String(env?.NMH_V3_GOOGLE_CLIENT_ID||'');
 const authorized=/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(id);
 const google=authorized?'<script src="https://accounts.google.com/gsi/client" async defer></script>':'';
 return original.replace('<button id="back">QUAY LẠI</button></section>',panel+'<button id="back">QUAY LẠI</button></section>')
  .replace('</body>',google+'<script>'+script+'</script></body>');
}
