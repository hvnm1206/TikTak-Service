// Offline QR for the fixed PUBLIC production app URL. No Google/API tokens encoded, no external QR service.
// QR Version 4 / ECC M / 4-module quiet zone. Generated and scanned independently.
export const NGO_APP_URL='https://nmh-voice-gpt-test.magical-budget.workers.dev/';
export const NGO_QR_SIZE=41;
export const NGO_QR_HEX_ROWS=["00000000000","00000000000","00000000000","00000000000","01fc596a7f0","0104df81410","01756a5a5d0","017547d45d0","0175d2f25d0","0105ef14410","01fd55557f0","0001661e000","017cbe967c0","005b51b26d0","00eee380960","0098870cde0","01a6e047b80","0063af724b0","00351008e60","01b97d5ec40","016fbc95b10","0180c1fb6d0","01562e9db60","0122f1fdbf0","01e7f506b80","01019e7ec90","017de701ce0","012aae3e4d0","015d82a7f20","0001e839150","01fcd253560","0105531b1e0","01757265f90","01759b2f970","01752cde600","0104ad2c9c0","01fd11812a0","00000000000","00000000000","00000000000","00000000000"];
export const NGO_QR_MATRIX_SHA256='9aa11ca4324cf0479d963dd15c73793348d28088ebe499bb901883b9743ff026';
export function buildQrSvg(){
 if(NGO_QR_HEX_ROWS.length!==NGO_QR_SIZE||NGO_QR_HEX_ROWS.some(x=>!/^([0-9a-f]{11})$/.test(x)))throw Error('QR_MATRIX_INVALID');
 const paths=[];
 for(let y=0;y<NGO_QR_SIZE;y++){
  const row=BigInt('0x'+NGO_QR_HEX_ROWS[y]);
  for(let x=0;x<NGO_QR_SIZE;){
   const black=Number((row>>BigInt(NGO_QR_SIZE-x-1))&1n);
   if(!black){x++;continue}
   let end=x+1;
   while(end<NGO_QR_SIZE&&Number((row>>BigInt(NGO_QR_SIZE-end-1))&1n)===1)end++;
   paths.push('M'+x+' '+y+'h'+(end-x)+'v1H'+x+'z');
   x=end;
  }
 }
 return '<svg id="ngoAppQrCode" role="img" aria-label="Mã QR mở ứng dụng Ngố" viewBox="0 0 41 41" width="232" height="232" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;height:auto;aspect-ratio:1;background:white;shape-rendering:crispEdges"><rect x="0" y="0" width="41" height="41" fill="#fff"/><path d="'+paths.join('')+'" fill="#000"/></svg>';
}
export function enhanceQrPage(html){
 const marker='<h2>SETUP</h2>';
 if(typeof html!=='string'||html.split(marker).length!==2)throw Error('NGO_SETUP_QR_MARKER_MISSING');
 const url=NGO_APP_URL;
 const box='<details id="ngoQrShare" open style="margin:16px 0;border:1px solid #64748b;border-radius:12px;padding:12px;background:#182437"><summary style="cursor:pointer;font-weight:700">MÃ QR MỞ NGỐ TRÊN ĐIỆN THOẠI</summary><div style="display:grid;justify-items:center;gap:10px;padding:12px 2px">'+buildQrSvg()+'<p class="hint" style="margin:0;text-align:center">Quét mã bằng camera để mở đúng ứng dụng Ngố. API key và tài khoản không nằm trong mã QR.</p><a id="ngoAppQrLink" href="'+url+'" target="_blank" rel="noopener noreferrer" style="color:#8bdcff;overflow-wrap:anywhere;word-break:break-word;text-align:center">'+url+'</a><button type="button" id="ngoAppQrCopy">SAO CHÉP LINK</button><p id="ngoAppQrStatus" class="hint" role="status" aria-live="polite"></p></div></details>';
 const script='<script id="ngoQrCopyScript">(()=>{const b=document.getElementById("ngoAppQrCopy"),s=document.getElementById("ngoAppQrStatus");if(!b||!s)return;b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText('+JSON.stringify(url)+');s.textContent="Đã sao chép đường dẫn Ngố."}catch{s.textContent="Không sao chép tự động được. Hãy nhấn giữ liên kết phía trên để sao chép."}})})();</script>';
 return html.replace(marker,marker+box).replace('</body>',script+'</body>');
}
