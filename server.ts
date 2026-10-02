import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { createRoom, newPlayer, startRound, tick, snapshot, emit, type Room } from './engine.ts';
import { CHARACTERS, MAPS, RULES, DIRECTIONS } from './public/config.js';
const root=fileURLToPath(new URL('.',import.meta.url));
type Session={id:string;token:string;name:string;room:string|null;stream:http.ServerResponse|null;seen:number;disconnected:number;count:number;window:number};
export function makeServer() {
 const rooms=new Map<string,Room>(),sessions=new Map<string,Session>(),ipRates=new Map<string,{at:number;count:number}>();
 const send=(s:Session,type:string,data:any)=>{if(s.stream&&!s.stream.destroyed){if(s.stream.writableLength>300000){s.stream.destroy();return;}s.stream.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);}};
 const publish=(r:Room)=>{const state=snapshot(r);for(const s of sessions.values())if(s.room===r.code)send(s,'state',state);};
 const transfer=(r:Room)=>{if(!r.players.some(p=>p.id===r.host&&p.connected&&!p.bot)){r.host=r.players.find(p=>p.connected&&!p.bot)?.id||'';const p=r.players.find(p=>p.id===r.host);if(p)p.ready=true;}};
 function leave(s:Session) {const r=rooms.get(s.room||'');s.room=null;if(!r)return;r.players=r.players.filter(p=>p.id!==s.id);transfer(r);if(!r.players.some(p=>!p.bot)){rooms.delete(r.code);return;}emit(r,'leave');publish(r);}
 function authenticate(req:http.IncomingMessage) {const token=(req.headers.authorization||'').replace(/^Bearer /,'');const s=sessions.get(token);if(!s)throw new Error('세션이 만료됐어요. 새로고침해 주세요.');s.seen=Date.now();return s;}
 const json=(res:http.ServerResponse,status:number,data:any)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try {
   const url=new URL(req.url||'/', 'http://localhost');
   if(url.pathname==='/health'){json(res,200,{ok:true,game:'BubblePangArena',rooms:rooms.size});return;}
   if(url.pathname==='/events'&&req.method==='GET'){
    const s=sessions.get(url.searchParams.get('token')||'');if(!s){json(res,401,{error:'연결 정보가 만료됐어요.'});return;}
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){json(res,403,{error:'다른 주소에서 연결할 수 없어요.'});return;}
    const old=s.stream;s.stream=res;if(old)old.end();s.seen=Date.now();s.disconnected=0;
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');send(s,'hello',{id:s.id,room:s.room});
    const r=rooms.get(s.room||'');if(r){const p=r.players.find(p=>p.id===s.id);if(p)p.connected=true;transfer(r);publish(r);}
    res.on('close',()=>{if(s.stream!==res)return;s.stream=null;s.disconnected=Date.now();const r=rooms.get(s.room||'');if(r){const p=r.players.find(p=>p.id===s.id);if(p){p.connected=false;p.dir='';p.place=false;}transfer(r);publish(r);}});return;
   }
   if(url.pathname.startsWith('/api/')&&req.method==='POST'){
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){json(res,403,{error:'잘못된 요청 주소예요.'});return;}
    if(!String(req.headers['content-type']).startsWith('application/json')){json(res,415,{error:'JSON 요청만 지원해요.'});return;}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){json(res,413,{error:'요청이 너무 커요.'});return;}}
    const data=JSON.parse(body||'{}');
    if(url.pathname==='/api/session'){
     const ip=req.socket.remoteAddress||'local',now=Date.now();let rate=ipRates.get(ip);if(!rate||now-rate.at>60000){rate={at:now,count:0};ipRates.set(ip,rate);}if(++rate.count>80||sessions.size>=1000){json(res,429,{error:'잠시 후 다시 연결해 주세요.'});return;}
     const existing=sessions.get(String(data.token||''));if(existing){existing.seen=now;json(res,200,{token:existing.token,id:existing.id,room:existing.room});return;}
     const token=randomBytes(24).toString('hex'),s={id:randomBytes(8).toString('hex'),token,name:'',room:null,stream:null,seen:now,disconnected:0,count:0,window:now};sessions.set(token,s);json(res,200,{token,id:s.id,room:null});return;
    }
    const s=authenticate(req),now=Date.now();if(now-s.window>1000){s.window=now;s.count=0;}if(++s.count>45){json(res,429,{error:'입력이 너무 빨라요.'});return;}
    if(url.pathname==='/api/create'||url.pathname==='/api/join'){
     if(s.room)throw new Error('현재 방에서 나온 뒤 다른 방에 들어갈 수 있어요.');
     const name=String(data.name||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,12);if(!name)throw new Error('닉네임을 입력해 주세요.');
     const character=Number.isInteger(data.character)&&CHARACTERS[data.character]?data.character:0;s.name=name;
     const p=newPlayer(s.id,name,character);
     let r:Room;
     if(url.pathname==='/api/create'){
      if(rooms.size>=100)throw new Error('방이 가득 찼어요. 잠시 후 다시 시도해 주세요.');
      let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));
      r=createRoom(code,p,!!data.practice);rooms.set(code,r);
      if(data.practice){const count=[1,3,7].includes(Number(data.bots))?Number(data.bots):3;for(let i=0;i<count;i++){const b=newPlayer('bot-'+i,CHARACTERS[(character+i+1)%8].name+' 봇',(character+i+1)%8,true);b.team=(i+1)%2;r.players.push(b);}}
     }else{
      r=rooms.get(String(data.code||'').trim().toUpperCase())!;if(!r)throw new Error('방을 찾을 수 없어요. 코드를 확인해 주세요.');
      if(r.players.length>=r.max)throw new Error('방의 정원이 가득 찼어요.');
      if(r.practice)throw new Error('혼자 연습하는 방이에요. 친구 대전 방을 만들어 주세요.');
      p.team=r.players.filter(o=>o.team===0).length<=r.players.filter(o=>o.team===1).length?0:1;
      p.state=r.phase==='playing'?'spectator':'waiting';r.players.push(p);
     }
     s.room=r.code;publish(r);json(res,200,{code:r.code});return;
    }
    if(url.pathname==='/api/leave'){leave(s);json(res,200,{ok:true});return;}
    if(url.pathname==='/api/ping'){json(res,200,{now});return;}
    const r=rooms.get(s.room||'');if(!r)throw new Error('참가 중인 방이 없어요.');const p=r.players.find(p=>p.id===s.id)!;
    if(url.pathname==='/api/input'){
     if(r.phase==='playing'&&now>=r.startAt){p.dir=Object.hasOwn(DIRECTIONS,data.dir)?data.dir:'';p.lastInput=now;if(data.place)p.place=true;if(data.needle)p.useNeedle=true;}
     json(res,200,{ok:true});return;
    }
    if(url.pathname==='/api/player'){
     if(r.phase==='playing')throw new Error('캐릭터와 팀은 대기실에서 바꿀 수 있어요.');
     if(Number.isInteger(data.character)&&CHARACTERS[data.character]){p.character=data.character;p.ready=p.id===r.host;}
     if(data.team===0||data.team===1){if(r.players.filter(o=>o.id!==p.id&&o.team===data.team).length>=4)throw new Error('한 팀은 최대 4명이에요.');p.team=data.team;p.ready=p.id===r.host;}
     if(typeof data.ready==='boolean')p.ready=p.id===r.host?true:data.ready;
    }else if(url.pathname==='/api/options'){
     if(r.host!==s.id)throw new Error('방장만 바꿀 수 있어요.');if(r.phase==='playing')throw new Error('대기실에서 바꿀 수 있어요.');
     if(MAPS.some(m=>m.id===data.map))r.map=data.map;
     if(data.mode==='solo'||data.mode==='team')r.mode=data.mode;
     if(Number.isInteger(data.max)&&data.max>=2&&data.max<=8){if(data.max<r.players.length)throw new Error('현재 참가자보다 정원을 줄일 수 없어요.');r.max=data.max;}
     for(const o of r.players)o.ready=o.id===r.host||o.bot;
    }else if(url.pathname==='/api/start'){
     if(r.host!==s.id)throw new Error('방장만 시작할 수 있어요.');if(r.phase==='playing')throw new Error('이미 게임 중이에요.');startRound(r,now);
    }else if(url.pathname==='/api/lobby'){
     if(r.host!==s.id)throw new Error('방장만 대기실로 이동할 수 있어요.');if(r.phase!=='result')throw new Error('경기가 끝나면 이동할 수 있어요.');
     r.phase='lobby';for(const o of r.players){o.state='waiting';o.ready=o.id===r.host||o.bot;}
    }else{json(res,404,{error:'없는 요청이에요.'});return;}
    r.now=now;publish(r);json(res,200,{ok:true});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:'지원하지 않는 요청이에요.'});return;}
   const names=new Set(['/','/index.html','/app.js','/art.js','/config.js','/style.css','/favicon.svg']);
   if(!names.has(url.pathname)){json(res,404,{error:'페이지를 찾을 수 없어요.'});return;}
   const path=resolve(root,'public',url.pathname==='/'?'index.html':url.pathname.slice(1));
   const mime:any={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
   res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(path));
  }catch(e){if(!res.headersSent)json(res,400,{error:e instanceof Error?e.message:'요청을 처리할 수 없어요.'});else res.end();}
 });
 const ticker=setInterval(()=>{const now=Date.now();for(const r of rooms.values()){tick(r,now);publish(r);}},RULES.tickMs);
 const cleanup=setInterval(()=>{
  const now=Date.now();for(const s of sessions.values()){
   if(s.stream)s.stream.write(': heartbeat\n\n');
   if(s.disconnected&&now-s.disconnected>RULES.reconnectMs){leave(s);s.disconnected=0;send(s,'expired',{});}
   if(!s.stream&&now-s.seen>3600000){leave(s);sessions.delete(s.token);}
  }
  for(const [ip,rate] of ipRates)if(now-rate.at>120000)ipRates.delete(ip);
 },1000);
 const close=()=>{clearInterval(ticker);clearInterval(cleanup);for(const s of sessions.values())s.stream?.end();server.close();server.closeAllConnections();};
 return {server,rooms,sessions,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
 const port=Number(process.env.PORT||3210),host=process.env.HOST||'0.0.0.0',app=makeServer();
 app.server.on('error',e=>{console.error('게임 서버를 시작할 수 없습니다:',e.message);app.close();process.exitCode=1;});
 app.server.listen(port,host,()=>{console.log(`\n버블팡 아레나 · http://localhost:${port}\n`);for(const list of Object.values(networkInterfaces()))for(const net of list||[])if(net.family==='IPv4'&&!net.internal)console.log(`같은 공유기 친구: http://${net.address}:${port}`);console.log('\n종료: Ctrl+C | 인터넷 공개는 README.md 참고');});
 process.on('SIGINT',()=>app.close());process.on('SIGTERM',()=>app.close());
}
