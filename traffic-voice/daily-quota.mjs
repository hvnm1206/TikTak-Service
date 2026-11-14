/** Dedicated SQLite-backed Durable Object for per-day Google Maps request budgets. */
export class TrafficDailyQuota {
 constructor(ctx,env){
  this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS google_usage (day TEXT NOT NULL, kind TEXT NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY(day,kind))');
 }
 async fetch(req){
  if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  let data;try{data=await req.json()}catch{return Response.json({error:'Bad JSON'},{status:400})}
  const kind=data?.kind,limit=kind==='routes'?30:kind==='places'?20:0;
  if(!limit)return Response.json({error:'Invalid kind'},{status:400});
  // Date-of-service is Asia/Bangkok (same offset as Viet Nam).
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  try{
   const rows=this.sql.exec('INSERT INTO google_usage(day,kind,hits) VALUES(?,?,1) ON CONFLICT(day,kind) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits',day,kind,limit).toArray();
   if(!rows.length)return Response.json({ok:false,kind,limit,remaining:0},{status:429});
   return Response.json({ok:true,kind,limit,remaining:limit-Number(rows[0].hits)});
  }catch{return Response.json({ok:false,error:'Quota storage failure'},{status:503})}
 }
}
