import test from 'node:test';
import assert from 'node:assert/strict';
import {TrafficDailyQuota} from '../daily-quota.mjs';
function newQuota(){
 const rows=new Map();
 const sql={exec(q,...params){
  if(q.startsWith('CREATE TABLE'))return {toArray:()=>[]};
  assert.match(q,/WHERE hits<\? RETURNING hits/);
  const [day,kind,limit]=params,key=`${day}:${kind}`,current=rows.get(key)||0;
  if(current>=limit)return {toArray:()=>[]};
  rows.set(key,current+1);return {toArray:()=>[{hits:current+1}]};
 }};
 const quota=new TrafficDailyQuota({storage:{sql}},{});
 const consume=kind=>quota.fetch(new Request('https://quota.internal/consume',{method:'POST',body:JSON.stringify({kind})}));
 return {quota,consume,rows};
}
test('SQLite daily quota permits 30 routes then denies 31st with 429',async()=>{
 const q=newQuota();for(let i=0;i<30;i++){let r=await q.consume('routes');assert.equal(r.status,200);assert.equal((await r.json()).remaining,29-i)}
 const r=await q.consume('routes');assert.equal(r.status,429);assert.equal((await r.json()).remaining,0);
});
test('Places quota is independent of Routes, permits 20 then denies 21st',async()=>{
 const q=newQuota();for(let i=0;i<20;i++)assert.equal((await q.consume('places')).status,200);
 assert.equal((await q.consume('places')).status,429);
 assert.equal((await q.consume('routes')).status,200);
});
test('Invalid actions never change daily counters',async()=>{
 const q=newQuota();assert.equal((await q.consume('anything')).status,400);
 const r=await q.quota.fetch(new Request('https://quota.internal/consume',{method:'GET'}));assert.equal(r.status,405);assert.equal(q.rows.size,0);
});
