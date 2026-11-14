// Disposable sandbox-only integration probe. NEVER imported by production worker.js.
// Must be deployed under a separate name with a fresh secret and removed after test.
import {runMemoryV2} from './memory-v2.js';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default {
 async fetch(req,env){
  if(new URL(req.url).pathname!=='/isolated-check'||req.method!=='POST')return reply({error:'not-found'},404);
  if(typeof env.NMH_MEMORY_PROBE_SECRET!=='string'||!env.NMH_MEMORY_PROBE_SECRET||req.headers.get('authorization')!=='Bearer '+env.NMH_MEMORY_PROBE_SECRET)return reply({error:'unauthorized'},401);
  if(env.NMH_MEMORY_V2_PROBE_ENV!=='sandbox'||!env.NMH_DB)return reply({error:'not-sandbox'},503);
  const db=env.NMH_DB;
  const sub='sandbox-memory-v2-'+crypto.randomUUID();
  const other='sandbox-memory-v2-'+crypto.randomUUID();
  const now=Date.now();
  const makeFakeResponse=proposal=>async()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal)}]}]});
  let result={ok:false,steps:[]};
  try{
   await db.batch([db.prepare('INSERT INTO v3_users (id,name,created_at) VALUES (?,?,?)').bind(sub,'Sandbox probe A',now),db.prepare('INSERT INTO v3_users (id,name,created_at) VALUES (?,?,?)').bind(other,'Sandbox probe B',now)]);
   const foreignId=crypto.randomUUID();
   await db.prepare('INSERT INTO v3_memories (id,user_id,body,created_at) VALUES (?,?,?,?)').bind(foreignId,other,'Sandbox other owner must remain',now).run();
   const request='Con chó của tao tên Mít';
   const add=await runMemoryV2({mode:'active',sub,db,apiKey:'sk-'+'a'.repeat(42),userText:request,assistantText:'Đã hiểu',fetchImpl:makeFakeResponse({ops:[{type:'add',id:null,body:'Người dùng nuôi chó tên Mít',evidence:request,confidence:.99}]})});
   if(add.status!=='saved')throw Error('add failed: '+add.status);
   const items=(await db.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all()).results;
   if(items.length!==1||items[0].body!=='Người dùng nuôi chó tên Mít')throw Error('readback failed');
   result.steps.push('add-readback');
   const duplicate=await runMemoryV2({mode:'active',sub,db,apiKey:'sk-'+'a'.repeat(42),userText:request,assistantText:'Đã hiểu',fetchImpl:()=>{throw Error('duplicate should not invoke GPT')}});
   if(duplicate.status!=='duplicate')throw Error('idempotency failed '+duplicate.status);
   result.steps.push('idempotency');
   const wrong='Quên con chó tên Mít đi';
   const denied=await runMemoryV2({mode:'active',sub,db,apiKey:'sk-'+'a'.repeat(42),userText:wrong,assistantText:'Đã hiểu',fetchImpl:makeFakeResponse({ops:[{type:'delete',id:foreignId,body:null,evidence:'Quên con chó tên Mít',confidence:.99}]})});
   if(denied.status!=='no-change')throw Error('other owner deletion attempt incorrectly handled: '+denied.status);
   if(!(await db.prepare('SELECT body FROM v3_memories WHERE user_id=? AND id=?').bind(other,foreignId).first()))throw Error('foreign memory corrupted');
   result.steps.push('owner-isolation');
   const updateText='Từ nay chó Mít đổi thành Bông';
   const edit=await runMemoryV2({mode:'active',sub,db,apiKey:'sk-'+'a'.repeat(42),userText:updateText,assistantText:'Đã hiểu',fetchImpl:makeFakeResponse({ops:[{type:'update',id:items[0].id,body:'Người dùng nuôi chó tên Bông',evidence:updateText,confidence:.99}]})});
   if(edit.status!=='saved')throw Error('update failed '+edit.status);
   result.steps.push('update-readback');
   const deleteText='Quên con chó tên Bông đi';
   const del=await runMemoryV2({mode:'active',sub,db,apiKey:'sk-'+'a'.repeat(42),userText:deleteText,assistantText:'Đã hiểu',fetchImpl:makeFakeResponse({ops:[{type:'delete',id:items[0].id,body:null,evidence:'Quên con chó tên Bông',confidence:.99}]})});
   if(del.status!=='saved')throw Error('delete failed '+del.status);
   if((await db.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all()).results.length)throw Error('delete not reflected in D1');
   result.steps.push('delete-readback');
   const shadow=await runMemoryV2({mode:'shadow',sub,db,apiKey:'sk-'+'a'.repeat(42),userText:'Tao thích đồ ăn cay',assistantText:'Đã hiểu',fetchImpl:makeFakeResponse({ops:[{type:'add',id:null,body:'Người dùng thích đồ ăn cay',evidence:'Tao thích đồ ăn cay',confidence:.99}]})});
   if(shadow.status!=='shadow')throw Error('shadow mode failed');
   if((await db.prepare('SELECT id,body FROM v3_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(sub).all()).results.length)throw Error('shadow wrote memory');
   result.steps.push('shadow-no-write');
   result.ok=true;
  }catch(e){result.error=String(e?.message||e).slice(0,200)}
  finally{
   try{
    for(const user of [sub,other]){
     await db.prepare('DELETE FROM v3_memory_v2_turns WHERE user_id=?').bind(user).run();
     await db.prepare('DELETE FROM v3_memories WHERE user_id=?').bind(user).run();
     await db.prepare('DELETE FROM v3_users WHERE id=?').bind(user).run();
    }
    result.cleaned=true;
   }catch(e){result.cleaned=false;result.error=(result.error||'')+' cleanup-error'}
  }
  return reply(result,result.ok&&result.cleaned?200:500);
 }
};
