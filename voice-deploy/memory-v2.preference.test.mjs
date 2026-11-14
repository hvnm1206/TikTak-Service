import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {handleV3} from './v3-backend.js';
const origin='https://voice.local.test';
const google='792345678901-test-oauth.apps.googleusercontent.com';
const raw=randomBytes(32).toString('base64url');
const digest=createHash('sha256').update(raw).digest('hex');
function env(mode='off'){
 const preferences=new Map();
 const sessions=new Map([[digest,{user_id:'user_1234567',expires_at:Date.now()+600000}]]);
 let writes=0;
 const db={
  get writes(){return writes},
  prepare(sql){return {bind(...args){return {
   async first(){
    if(sql.startsWith('SELECT user_id,expires_at'))return sessions.get(args[0])||null;
    if(sql.startsWith('SELECT enabled,revision'))return preferences.get(args[0])||null;
    throw Error('Unexpected query '+sql);
   },
   async run(){
    if(sql.startsWith('INSERT INTO v3_memory_v2_preferences')){if(preferences.has(args[0]))throw Error('duplicate');preferences.set(args[0],{enabled:args[1],revision:1});writes++;return {meta:{changes:1}}}
    if(sql.startsWith('UPDATE v3_memory_v2_preferences')){
     const row=preferences.get(args[2]);
     if(!row||row.revision!==args[3])return {meta:{changes:0}};
     row.enabled=args[0];row.revision++;writes++;return {meta:{changes:1}};
    }
    throw Error('Unexpected update '+sql);
   }
  }}}}
 };
 return {NMH_DB:db,NMH_V3_GOOGLE_CLIENT_ID:google,NMH_MEMORY_V2_MODE:mode,preferences};
}
function req(path,method='GET',body=null,authenticated=true){
 const headers={};
 if(authenticated)headers.cookie='__Host-nmhv3='+raw;
 if(method!=='GET'){headers.origin=origin;headers['content-type']='application/json'}
 return new Request(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});
}
const json=async r=>({status:r.status,data:await r.json()});
test('opt-in API is OFF by default, never writes or reveals existing data',async()=>{
 const e=env();
 const result=await json(await handleV3(req('/api/v3/memory-v2-preference'),e));
 assert.equal(result.status,200);
 assert.deepEqual(result.data,{available:false,mode:'off',enabled:false,revision:0});
 assert.equal(e.NMH_DB.writes,0);
});
test('anonymous user cannot read or change Memory V2 settings',async()=>{
 const e=env('shadow');
 const r=await handleV3(req('/api/v3/memory-v2-preference','GET',null,false),e);
 assert.equal(r.status,401);
 const w=await handleV3(req('/api/v3/memory-v2-preference','PUT',{enabled:true,revision:0},false),e);
 assert.equal(w.status,401);
});
test('shadow requires explicit user opt-in, revision-guarded toggle, and supports disable',async()=>{
 const e=env('shadow');
 const get=await json(await handleV3(req('/api/v3/memory-v2-preference'),e));
 assert.equal(get.data.available,true);assert.equal(get.data.enabled,false);
 const on=await json(await handleV3(req('/api/v3/memory-v2-preference','PUT',{enabled:true,revision:0}),e));
 assert.equal(on.status,200);assert.equal(on.data.enabled,true);assert.equal(on.data.revision,1);
 const stale=await handleV3(req('/api/v3/memory-v2-preference','PUT',{enabled:false,revision:0}),e);
 assert.equal(stale.status,409);
 const off=await json(await handleV3(req('/api/v3/memory-v2-preference','PUT',{enabled:false,revision:1}),e));
 assert.equal(off.data.enabled,false);assert.equal(off.data.revision,2);
 assert.equal(e.NMH_DB.writes,2);
});
test('invalid Origin or invalid payload cannot change consent',async()=>{
 const e=env('active');
 const evil=new Request(origin+'/api/v3/memory-v2-preference',{method:'PUT',headers:{cookie:'__Host-nmhv3='+raw,origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({enabled:true,revision:0})});
 assert.equal((await handleV3(evil,e)).status,403);
 assert.equal((await handleV3(req('/api/v3/memory-v2-preference','PUT',{enabled:'yes',revision:0}),e)).status,400);
 assert.equal(e.NMH_DB.writes,0);
});
