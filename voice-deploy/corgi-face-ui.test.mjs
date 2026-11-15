import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.js';
test('corgi face is an extra theme: old themes kept, engine inside theme script, page compiles',async()=>{
 for(const env of [{},{NMH_FAST_VOICE:'active'}]){
  const html=await (await worker.fetch(new Request('https://voice.example/'),env,{})).text();
  for(const v of ['default','eyes','duck','corgi','corgiface'])assert.ok(html.includes(`<option value="${v}">`),v);
  assert.ok(html.includes("allowed=['default','eyes','duck','corgi','corgiface']"));
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  scripts.forEach(s=>new vm.Script(s));
  const themeScript=scripts.find(s=>s.includes('const setTheme=value=>{'));
  assert.ok(themeScript.includes('function ngoCorgiMount(stage)')&&themeScript.includes('const ease=')&&themeScript.includes('ngoCorgiMount(stage);else'));
  assert.ok(html.includes('#ngoMascotStage[data-theme="corgiface"]{display:flex}'));
  assert.equal((html.match(/id="ngoCf-face"/g)||[]).length,1);
 }
});
