// Responses SSE and the browser's NDJSON transport share a bounded line reader.
export async function* responseLines(body) {
  if (!body) throw Error('Phản hồi không có luồng dữ liệu.');
  const reader=body.getReader(), decoder=new TextDecoder();
  let pending='';
  try {
    while(true){
      const {value,done}=await reader.read();
      pending+=decoder.decode(value,{stream:!done});
      let newline;
      while((newline=pending.indexOf('\n'))>=0){
        yield pending.slice(0,newline).replace(/\r$/,'');
        pending=pending.slice(newline+1);
      }
      if(pending.length>1_000_000)throw Error('Sự kiện phản hồi quá dài.');
      if(done){if(pending)yield pending;return}
    }
  } finally {
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
