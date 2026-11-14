import HTML from './index.html';
import CLIENT from './client-source.txt';
import {createHandler} from './worker-core.mjs';
const handler=createHandler({html:HTML});
export default {fetch(request,env,ctx){if(request.method==='GET'&&new URL(request.url).pathname==='/client.js')return new Response(CLIENT,{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});return handler(request,env,ctx)}};
