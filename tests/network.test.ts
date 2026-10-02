import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {makeServer} from '../server.ts';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('8 real HTTP/SSE clients: join, ready, authority, synchronization, reconnect, host transfer, rematch',async t=>{
 const app=makeServer();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address() as any,base=`http://127.0.0.1:${address.port}`;
 const clients:any[]=[];t.after(()=>{clients.forEach(c=>c.abort?.abort());app.close();});
 async function request(path:string,data:any={},token=''){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data)});return {status:r.status,...await r.json()};}
 async function attach(c:any){c.abort=new AbortController();const res=await fetch(base+'/events?token='+c.token,{signal:c.abort.signal});const reader=res.body!.getReader(),decoder=new TextDecoder();c.frames=[];c.history=[];c.reader=(async()=>{let text='';try{while(true){const {done,value}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});let idx;while((idx=text.indexOf('\n\n'))>=0){const chunk=text.slice(0,idx);text=text.slice(idx+2);if(chunk.startsWith('event: state')){const frame=JSON.parse(chunk.split('\ndata: ')[1]);c.state=frame;c.frames.push(frame);c.history.push(JSON.stringify(frame));if(c.frames.length>100)c.frames.shift();if(c.history.length>100)c.history.shift();}}}}catch(e){if(!c.abort.signal.aborted)throw e;}})();}
 async function client(){const c=await request('session');clients.push(c);await attach(c);return c;}
 async function until(fn:()=>boolean,timeout=4000){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await sleep(20);}assert.fail('Timed out awaiting synchronized state');}
 const host=await client();const created=await request('create',{name:'방장',character:0},host.token);assert.equal(created.status,200);const code=created.code;
 for(let i=1;i<8;i++){const c=await client();assert.equal((await request('join',{name:'친구'+i,character:i,code},c.token)).status,200);await request('player',{ready:true},c.token);}
 await until(()=>clients.slice(0,8).every(c=>c.state?.players.length===8));
 const ninth=await client();assert.match((await request('join',{name:'초과',code},ninth.token)).error,/정원/);
 assert.match((await request('start',{},clients[1].token)).error,/방장/);
 assert.equal((await request('start',{},host.token)).status,200);await until(()=>clients.slice(0,8).every(c=>c.state?.phase==='playing'));
 const r=app.rooms.get(code)!;r.startAt=Date.now()-100;r.players.forEach(p=>p.immuneUntil=0);
 const p=r.players[0];r.grid[p.y][p.x+1]=0;
 await request('input',{place:true,dir:'right'},host.token);await until(()=>r.bombs.length===1);assert.equal(r.bombs[0].owner,host.id);
 const b=r.bombs[0];b.at=Date.now()+100;await until(()=>clients.slice(0,8).every(c=>c.frames.some((s:any)=>s.events.some((e:any)=>e.type==='explode'))));
 // All clients must receive a byte-equivalent complete state from the same authoritative tick.
 await until(()=>clients[0].history.some((s:string)=>clients.slice(1,8).every(c=>c.history.includes(s))));
 assert.ok(clients[0].history.some((s:string)=>s.includes('explode')&&clients.slice(1,8).every(c=>c.history.includes(s))));
 const reconnect=clients[3];reconnect.abort.abort();await until(()=>r.players.find(p=>p.id===reconnect.id)!.connected===false);await attach(reconnect);await until(()=>r.players.find(p=>p.id===reconnect.id)!.connected);assert.equal(reconnect.state.players.filter((p:any)=>p.id===reconnect.id).length,1);
 await request('leave',{},clients[7].token);assert.equal((await request('join',{name:'관전자',code},ninth.token)).status,200);await until(()=>ninth.state?.players.some((p:any)=>p.id===ninth.id&&p.state==='spectator'));
 r.players.filter(p=>p.id!==host.id&&p.state!=='spectator').forEach(p=>p.state='dead');p.state='alive';r.blasts=[];await until(()=>r.phase==='result');assert.equal(r.result.winner.player,host.id);
 await until(()=>ninth.state.phase==='result');
 // Mid-round spectators must explicitly ready before participating in the next round.
 assert.match((await request('start',{},host.token)).error,/준비/);await request('player',{ready:true},ninth.token);assert.equal((await request('start',{},host.token)).status,200);await until(()=>r.round===2);assert.equal(r.players.find(p=>p.id===ninth.id)!.state,'alive');
 await request('leave',{},host.token);await until(()=>r.host===clients[1].id);assert.equal(r.players.length,7);
 const invalid=await fetch(base+'/engine.ts');assert.equal(invalid.status,404);
 const cross=await fetch(base+'/api/options',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://evil.example',Authorization:'Bearer '+clients[1].token},body:'{}'});assert.equal(cross.status,403);
 const malformed=await fetch(base+'/api/input',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
});
test('practice room and disconnected grace expiry cleanup',async t=>{
 const app=makeServer();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(app.close);const base='http://127.0.0.1:'+(app.server.address() as any).port;
 const post=async(path:string,data:any={},token='')=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data)});return r.json();};
 const c=await post('session'),other=await post('session'),room=await post('create',{name:'연습',practice:true,bots:7},c.token);const r=app.rooms.get(room.code)!;assert.equal(r.players.length,8);assert.equal(r.players.filter(p=>p.bot).length,7);assert.ok((await post('join',{name:'외부',code:room.code},other.token)).error);assert.equal((await post('start',{},c.token)).ok,true);app.sessions.get(c.token)!.disconnected=Date.now()-21000;await sleep(1200);assert.equal(app.rooms.has(room.code),false);
});
