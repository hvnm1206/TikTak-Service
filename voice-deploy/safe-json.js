// 22/11/2026 owner screenshot "OpenAI HTTP 400: invalid_json · failed to parse JSON value". Root cause: text cut with
// .slice(0,N) can split an emoji (UTF-16 surrogate pair); JSON.stringify then writes a lone "\ud83d", which strict JSON
// parsers (OpenAI, Google) reject. Two layers: cut on code-point boundaries, and every outgoing body is made well-formed.
export const wellFormed=s=>typeof s.toWellFormed==="function"?s.toWellFormed():s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,"�");
export const cutText=(value,max)=>{let s=String(value??"");if(s.length<=max)return wellFormed(s);s=s.slice(0,max);const c=s.charCodeAt(s.length-1);if(c>=0xD800&&c<=0xDBFF)s=s.slice(0,-1);return wellFormed(s)};
export const safeJSON=value=>JSON.stringify(value,(k,v)=>typeof v==="string"?wellFormed(v):v);
