import { CHARACTERS, MAPS, RULES, DIRECTIONS, stepMs } from './public/config.js';
export type Player = {
 id:string; name:string; character:number; team:number; bot:boolean; connected:boolean; ready:boolean;
 x:number; y:number; state:string; speed:number; bombs:number; range:number; needle:number;
 bubbleUntil:number; immuneUntil:number; nextMove:number; lastInput:number; dir:string;
 place:boolean; useNeedle:boolean; plantedAt:number; facing:string; joinedAt:number;
};
type Bomb = {id:number;x:number;y:number;owner:string;range:number;at:number;pass:string[]};
type Blast = {x:number;y:number;until:number};
export type Room = {
 code:string;host:string;map:string;mode:string;max:number;practice:boolean;phase:string;
 players:Player[]; grid:number[][];items:Record<string,string>;bombs:Bomb[];blasts:Blast[];
 events:any[]; seq:number; bombSeq:number; round:number; startAt:number; endAt:number; now:number;
 result:any; rng:()=>number; createdAt:number;
};
const spawns = [[1,1],[15,11],[15,1],[1,11],[7,1],[9,11],[1,5],[15,7]];
export function seeded(seed:number) {return () => {seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function newPlayer(id:string,name:string,character=0,bot=false):Player {
 const c=CHARACTERS[character]||CHARACTERS[0];
 return {id,name,character:c.id,team:0,bot,connected:true,ready:bot,x:1,y:1,state:'waiting',speed:c.speed,bombs:c.bombs,range:c.range,needle:0,bubbleUntil:0,immuneUntil:0,nextMove:0,lastInput:0,dir:'',place:false,useNeedle:false,plantedAt:0,facing:'down',joinedAt:Date.now()};
}
export function createRoom(code:string,host:Player,practice=false):Room {
 host.ready=true;
 return {code,host:host.id,map:'garden',mode:'solo',max:8,practice,phase:'lobby',players:[host],grid:[],items:{},bombs:[],blasts:[],events:[],seq:0,bombSeq:0,round:0,startAt:0,endAt:0,now:Date.now(),result:null,rng:seeded(Date.now()),createdAt:Date.now()};
}
export function generateMap(kind:string, rng= Math.random):number[][] {
 const g=Array.from({length:RULES.height},(_,y)=>Array.from({length:RULES.width},(_,x)=> x===0||y===0||x===16||y===12||(x%2===0&&y%2===0)?1:0));
 // 180-degree symmetric obstacles and clear spawn exits keep all starting corners viable.
 for(let y=1;y<12;y++)for(let x=1;x<16;x++){
  if(y*17+x>(12-y)*17+(16-x)||g[y][x])continue;
  const chance=kind==='candy'?.72:kind==='harbor'?.48:.62;
  const openLane=kind==='harbor'&&(y===5||y===7);
  const v=!openLane&&rng()<chance?2:0;g[y][x]=v;g[12-y][16-x]=v;
 }
 for(const [sx,sy] of spawns)for(let y=sy-1;y<=sy+1;y++)for(let x=sx-1;x<=sx+1;x++)if(g[y]?.[x]===2)g[y][x]=0;
 return g;
}
export function emit(r:Room,type:string,data:any={}) {r.events.push({id:++r.seq,type,...data});if(r.events.length>40)r.events.shift();}
export function startRound(r:Room,now=Date.now()) {
 const active=r.players.filter(p=>p.connected||p.bot);
 if(active.length<2)throw new Error('2명 이상 모이면 시작할 수 있어요. 혼자 연습은 봇을 추가해 주세요.');
 if(active.some(p=>!p.ready&&!p.bot&&p.id!==r.host))throw new Error('모든 친구가 준비를 눌러야 해요.');
 if(r.mode==='team') {
  const a=active.filter(p=>p.team===0).length,b=active.length-a;
  if(!a||!b||a>4||b>4)throw new Error('팀마다 1~4명씩 배치해 주세요.');
 }
 r.round++;r.phase='playing';r.grid=generateMap(r.map,r.rng);r.items={};r.bombs=[];r.blasts=[];r.result=null;
 r.startAt=now+RULES.countdownMs;r.endAt=r.startAt+RULES.roundMs;r.now=now;
 r.players.forEach((p,i)=>{const c=CHARACTERS[p.character];Object.assign(p,{x:spawns[i][0],y:spawns[i][1],state:p.connected?'alive':'spectator',speed:c.speed,bombs:c.bombs,range:c.range,needle:0,bubbleUntil:0,immuneUntil:r.startAt+500,nextMove:r.startAt,lastInput:now,dir:'',place:false,useNeedle:false,plantedAt:0});});
 emit(r,'start');
}
const key=(x:number,y:number)=>`${x},${y}`;
export function canStep(r:Room,p:Player,x:number,y:number) {return r.grid[y]?.[x]===0&&!r.bombs.some(b=>b.x===x&&b.y===y&&!b.pass.includes(p.id));}
export function plant(r:Room,p:Player,now:number) {
 if(p.state!=='alive'||r.bombs.some(b=>b.x===p.x&&b.y===p.y)||r.bombs.filter(b=>b.owner===p.id).length>=p.bombs)return false;
 r.bombs.push({id:++r.bombSeq,x:p.x,y:p.y,owner:p.id,range:p.range,at:now+RULES.fuseMs,pass:r.players.filter(o=>o.x===p.x&&o.y===p.y&&o.state==='alive').map(o=>o.id)});
 p.plantedAt=now;emit(r,'plant',{x:p.x,y:p.y});return true;
}
function drop(r:Room,x:number,y:number) {
 let n=r.rng();for(const [type,chance] of Object.entries(RULES.drops)){n-=Number(chance);if(n<0){r.items[key(x,y)]=type;return;}}
}
export function explode(r:Room,initial:Bomb[],now:number) {
 const queue=[...initial],seen=new Set<number>(),destroyed=new Set<string>();
 while(queue.length){const b=queue.shift()!;if(seen.has(b.id))continue;seen.add(b.id);
  const hit=(x:number,y:number)=>{delete r.items[key(x,y)];r.blasts.push({x,y,until:now+RULES.blastMs});const next=r.bombs.find(o=>o.x===x&&o.y===y&&!seen.has(o.id));if(next)queue.push(next);};
  hit(b.x,b.y);
  for(const [dx,dy] of Object.values(DIRECTIONS) as number[][])for(let d=1;d<=b.range;d++){
   const x=b.x+dx*d,y=b.y+dy*d,cell=r.grid[y]?.[x];if(cell===undefined||cell===1)break;
   hit(x,y);if(cell===2){destroyed.add(key(x,y));break;}
  }
  emit(r,'explode',{x:b.x,y:b.y});
 }
 r.bombs=r.bombs.filter(b=>!seen.has(b.id));
 for(const cell of destroyed){const [x,y]=cell.split(',').map(Number);r.grid[y][x]=0;drop(r,x,y);}
}
function collect(r:Room,p:Player) {
 const k=key(p.x,p.y),item=r.items[k];if(!item||r.blasts.some(b=>b.x===p.x&&b.y===p.y))return;
 if(item==='speed')p.speed=Math.min(RULES.maxSpeed,p.speed+1);
 if(item==='bombs')p.bombs=Math.min(RULES.maxBombs,p.bombs+1);
 if(item==='range')p.range=Math.min(RULES.maxRange,p.range+1);
 if(item==='needle')p.needle=1;
 delete r.items[k];emit(r,'item',{player:p.id,item});
}
function dangerCells(r:Room):Set<string> {
 const d=new Set(r.blasts.map(b=>key(b.x,b.y)));
 for(const b of r.bombs){d.add(key(b.x,b.y));for(const [dx,dy] of Object.values(DIRECTIONS) as number[][])for(let n=1;n<=b.range;n++){const x=b.x+dx*n,y=b.y+dy*n;if(r.grid[y]?.[x]!==0)break;d.add(key(x,y));}}
 return d;
}
function botInput(r:Room,p:Player,now:number) {
 if(p.state==='bubble'){p.useNeedle=!!p.needle;return;}
 if(now<p.nextMove)return;
 const danger=dangerCells(r),dirs=Object.entries(DIRECTIONS) as [string,number[]][];
 const safeRoute=(avoid:Set<string>):string=>{const q=[{x:p.x,y:p.y,first:'',depth:0}],seen=new Set([key(p.x,p.y)]);while(q.length){const t=q.shift()!;if(t.depth>0&&!avoid.has(key(t.x,t.y)))return t.first;if(t.depth>=6)continue;for(const [dir,[dx,dy]] of dirs){const x=t.x+dx,y=t.y+dy,k=key(x,y);if(!seen.has(k)&&canStep(r,p,x,y)){seen.add(k);q.push({x,y,first:t.first||dir,depth:t.depth+1});}}}return '';};
 if(danger.has(key(p.x,p.y))){p.dir=safeRoute(danger);p.lastInput=now;return;}
 const options=dirs.filter(([, [dx,dy]])=>canStep(r,p,p.x+dx,p.y+dy)&&!danger.has(key(p.x+dx,p.y+dy)));
 const target=r.players.find(o=>o.id!==p.id&&o.state==='alive'&&(r.mode!=='team'||o.team!==p.team));
 const nearCrate=dirs.some(([, [dx,dy]])=>r.grid[p.y+dy]?.[p.x+dx]===2);
 const nearEnemy=target&&Math.abs(target.x-p.x)+Math.abs(target.y-p.y)<4;
 if((nearCrate||nearEnemy)&&r.rng()<.35&&!r.bombs.some(b=>b.x===p.x&&b.y===p.y)){
  // Only place when a reachable tile is outside the prospective cross.
  const risk=new Set(danger);risk.add(key(p.x,p.y));for(const [, [dx,dy]] of dirs)for(let n=1;n<=p.range;n++){if(r.grid[p.y+dy*n]?.[p.x+dx*n]!==0)break;risk.add(key(p.x+dx*n,p.y+dy*n));}
  const escape=safeRoute(risk);if(escape){p.place=true;p.dir=escape;p.lastInput=now;return;}
 }
 if(options.length){const items=Object.keys(r.items).map(k=>k.split(',').map(Number));const t=items[0]||(target?[target.x,target.y]:[8,6]);options.sort((a,b)=>Math.abs(p.x+a[1][0]-t[0])+Math.abs(p.y+a[1][1]-t[1])-Math.abs(p.x+b[1][0]-t[0])-Math.abs(p.y+b[1][1]-t[1]));p.dir=options[r.rng()<.65?0:Math.floor(r.rng()*options.length)][0];}else p.dir='';p.lastInput=now;
}
export function tick(r:Room,now=Date.now()) {
 r.now=now;if(r.phase!=='playing'||now<r.startAt)return;
 r.blasts=r.blasts.filter(b=>b.until>now);
 // Expiry wins over late rescue; every elimination is processed before evaluating victory.
 for(const p of r.players)if(p.state==='bubble'&&p.bubbleUntil<=now){p.state='dead';emit(r,'out',{player:p.id});}
 for(const p of r.players){
  if(p.bot)botInput(r,p,now);
  if(p.useNeedle&&p.state==='bubble'&&p.needle){p.needle=0;p.state='alive';p.immuneUntil=now+1200;emit(r,'rescue',{player:p.id});}p.useNeedle=false;
  if(p.state!=='alive'){p.place=false;continue;}
  if(p.place)plant(r,p,now);p.place=false;
  const vector=DIRECTIONS[p.dir as keyof typeof DIRECTIONS];
  if(vector&&p.connected&&now>=p.nextMove&&now-p.lastInput<700){p.facing=p.dir;const [dx,dy]=vector;if(canStep(r,p,p.x+dx,p.y+dy)){p.x+=dx;p.y+=dy;p.nextMove=now+stepMs(p.speed);}else p.nextMove=now+50;}
 }
 for(const b of r.bombs)b.pass=b.pass.filter(id=>r.players.some(p=>p.id===id&&p.x===b.x&&p.y===b.y&&p.state==='alive'));
 explode(r,r.bombs.filter(b=>b.at<=now),now);
 for(const p of r.players)if(p.state==='alive'&&now>=p.immuneUntil&&r.blasts.some(b=>b.x===p.x&&b.y===p.y)){p.state='bubble';p.bubbleUntil=now+RULES.bubbleMs;emit(r,'trap',{player:p.id});}
 for(const p of r.players.filter(p=>p.state==='bubble')){
  const contact=r.players.filter(o=>o.id!==p.id&&o.state==='alive'&&o.x===p.x&&o.y===p.y);
  if(contact.some(o=>r.mode!=='team'||o.team!==p.team)){p.state='dead';emit(r,'out',{player:p.id});}
  else if(contact.length){p.state='alive';p.immuneUntil=now+1200;emit(r,'rescue',{player:p.id});}
 }
 for(const p of r.players)if(p.state==='alive')collect(r,p);
 const remaining=r.players.filter(p=>p.state==='alive'||p.state==='bubble');
 let winner:any=null,finished=false;
 if(now>=r.endAt){finished=true;}
 else if(remaining.length===0){finished=true;}
 else if(r.mode==='solo'&&remaining.length===1){finished=true;winner={name:remaining[0].name,player:remaining[0].id,character:remaining[0].character};}
 else if(r.mode==='team'&&new Set(remaining.map(p=>p.team)).size===1){finished=true;winner={name:remaining[0].team===0?'블루 팀':'코랄 팀',team:remaining[0].team};}
 if(finished){r.phase='result';r.result={winner,reason:now>=r.endAt?'시간이 종료되었어요':winner?'마지막까지 살아남았어요':'모두 함께 탈락했어요'};emit(r,'finish');}
}
export function snapshot(r:Room) {
 return {code:r.code,host:r.host,map:r.map,mode:r.mode,max:r.max,practice:r.practice,phase:r.phase,round:r.round,now:r.now,startAt:r.startAt,endAt:r.endAt,result:r.result,players:r.players.map(({lastInput,place,useNeedle,dir,nextMove,...p})=>p),grid:r.grid,items:r.items,bombs:r.bombs.map(({pass,...b})=>b),blasts:r.blasts,events:r.events};
}
