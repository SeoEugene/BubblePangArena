import { CHARACTERS, MAPS } from './config.js';
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,fill,stroke=null,lw=2){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke();}}
function poly(c,points,fill,stroke=null,lw=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function rect(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=2;c.strokeStyle=stroke;c.stroke();}}
export function drawCharacter(c,id,x,y,size,opt={}) {
 const ch=CHARACTERS[id]||CHARACTERS[0],ink='#24324b',t=opt.t||0,walk=opt.walk?Math.sin(t/65)*2:Math.sin(t/600)*.6;
 c.save();c.translate(x,y);c.scale(size/64,size/64);
 if(opt.dead){c.globalAlpha=.28;c.translate(0,-6-Math.sin(t/300)*4);}
 ellipse(c,0,23,22,7,'#10223855');
 if(opt.me){c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.ellipse(0,23,24,9,0,0,TAU);c.stroke();poly(c,[[-4,-48],[4,-48],[0,-42]],'#fff');}
 if(opt.team!==undefined){c.strokeStyle=opt.team===0?'#59c4ff':'#ff938c';c.lineWidth=3;c.beginPath();c.ellipse(0,23,23,8,0,0,TAU);c.stroke();}
 if(opt.immune)c.globalAlpha=.55+Math.sin(t/60)*.3;
 c.translate(0,walk);if(opt.placing)c.rotate(Math.sin(t/40)*.08);
 // Tails, feet and jackets are intentionally different for each original character.
 if(id===1||id===6||id===7){c.save();c.rotate(-.5);ellipse(c,19,12,9,17,ch.color,ink);if(id===1)rect(c,14,8,11,5,2,ink);if(id===7)ellipse(c,20,0,6,7,'#fff6e5');c.restore();}
 ellipse(c,-10,22+walk,8,5,ink);ellipse(c,10,22-walk,8,5,ink);
 if(id===6){rect(c,-20,25,40,4,2,'#e593ff');ellipse(c,-13,30,4,4,ink);ellipse(c,13,30,4,4,ink);}
 ellipse(c,0,10,18,18,ch.color,ink);
 rect(c,-13,9,26,12,5,id===0?'#f5c973':id===1?'#516383':id===2?'#6752a1':id===3?'#f4926b':id===4?'#506bce':id===5?'#36547d':id===6?'#394667':'#697e4b');
 ellipse(c,-19,10-walk,6,9,ch.color,ink);ellipse(c,19,10+walk,6,9,ch.color,ink);
 if(id===0){ellipse(c,-12,-29,7,20,ch.color,ink);ellipse(c,12,-29,7,20,ch.color,ink);ellipse(c,-12,-30,3,13,'#fff0ec');ellipse(c,12,-30,3,13,'#fff0ec');}
 else if([2,6,7].includes(id)){poly(c,[[-22,-11],[-20,-36],[-5,-23]],ch.color,ink);poly(c,[[22,-11],[20,-36],[5,-23]],ch.color,ink);poly(c,[[-18,-19],[-18,-29],[-10,-23]],'#ffe8e0');poly(c,[[18,-19],[18,-29],[10,-23]],'#ffe8e0');}
 else if(id===3){poly(c,[[-9,-22],[-8,-35],[0,-27],[7,-36],[10,-20]],ch.color,ink);}
 else{ellipse(c,-18,-22,id===4?10:8,id===4?10:8,ch.color,ink);ellipse(c,18,-22,id===4?10:8,id===4?10:8,ch.color,ink);ellipse(c,-18,-23,4,4,'#ffe6dc');ellipse(c,18,-23,4,4,'#ffe6dc');}
 ellipse(c,0,-8,24,22,ch.color,ink);
 if(id===1){ellipse(c,-10,-10,10,8,'#635167');ellipse(c,10,-10,10,8,'#635167');}
 if(id===4||id===5||id===7)ellipse(c,0,1,16,10,'#fff2de');
 const fx=opt.face==='left'?-2:opt.face==='right'?2:0;
 ellipse(c,-8+fx,-9,3,4.5,ink);ellipse(c,8+fx,-9,3,4.5,ink);
 ellipse(c,-9+fx,-11,1,1.3,'white');ellipse(c,7+fx,-11,1,1.3,'white');
 ellipse(c,-15,0,4,2.5,'#ef798c66');ellipse(c,15,0,4,2.5,'#ef798c66');
 if(id===3)poly(c,[[-5,-1],[5,-1],[0,5]],'#f58b4f',ink,1);
 else{ellipse(c,0,-1,2.8,2,ink);c.beginPath();c.arc(0,2,4,0,Math.PI);c.strokeStyle=ink;c.lineWidth=1.5;c.stroke();}
 if(id===0){rect(c,-25,-25,50,6,3,'#ddb268',ink);ellipse(c,0,-28,18,8,'#f2d08d',ink);rect(c,-9,7,18,5,2,'#f07b69');}
 if(id===1){rect(c,-22,-29,44,8,4,'#53617c',ink);ellipse(c,-9,-26,7,6,'#afebf1',ink);ellipse(c,9,-26,7,6,'#afebf1',ink);rect(c,11,9,4,12,1,'#cedfea');}
 if(id===2){poly(c,[[-22,-25],[5,-55],[20,-25]],'#6254ab',ink);rect(c,-26,-27,52,6,3,'#7865c7',ink);c.fillStyle='#ffe58e';c.font='16px sans-serif';c.fillText('✦',-3,-31);}
 if(id===3){rect(c,2,-30,22,8,3,'#ec8b5c',ink);rect(c,13,5,15,17,3,'#a77756',ink);}
 if(id===4){poly(c,[[-9,8],[9,8],[8,19],[0,24],[-8,19]],'#ffdf78',ink);c.fillStyle='#739bc4';c.font='13px sans-serif';c.fillText('✦',-5,19);}
 if(id===5){poly(c,[[-20,-23],[-14,-35],[15,-35],[21,-23]],'#f9f3df',ink);rect(c,-21,-26,42,5,2,'#5273a1');poly(c,[[-11,8],[0,15],[11,8],[8,22],[-8,22]],'#fff3df');}
 if(id===6){rect(c,-23,-25,46,8,3,'#e18abd',ink);poly(c,[[20,-21],[32,-16],[24,-11]],'#e18abd',ink);}
 if(id===7){rect(c,-26,-25,52,6,3,'#dcbd78',ink);ellipse(c,0,-28,18,8,'#ead49b',ink);ellipse(c,12,-28,7,3,'#66ac69');rect(c,-9,10,18,12,3,'#d9c992');}
 if(opt.bubble){const g=c.createRadialGradient(-12,-15,0,0,-5,38);g.addColorStop(0,'#dbffff33');g.addColorStop(.8,'#6fd9ff44');g.addColorStop(1,'#a2efffae');ellipse(c,0,-6,34+Math.sin(t/160),36,g,'#c8faff',2);ellipse(c,-19,-24,6,10,'#ffffff99');}
 c.restore();
}
export function drawBomb(c,x,y,size,time=0) {
 c.save();c.translate(x,y);const pulse=1+Math.sin(time/110)*.05;c.scale(size/50*pulse,size/50*pulse);
 ellipse(c,0,15,17,5,'#152e4860');const g=c.createRadialGradient(-6,-8,2,0,0,20);g.addColorStop(0,'#8eecff');g.addColorStop(1,'#1c98db');ellipse(c,0,0,18,19,g,'#10629a');ellipse(c,-7,-7,4,6,'#d3fcff');poly(c,[[-5,-17],[0,-25],[5,-17]],'#75e0f5','#10629a');ellipse(c,5,5,2,3,'#195987');ellipse(c,-4,5,2,3,'#195987');c.restore();
}
export function drawBoard(c,state,time,positions=new Map(),selfId='') {
 const map=MAPS.find(m=>m.id===state.map)||MAPS[0],s=c.canvas.width/17;
 c.clearRect(0,0,c.canvas.width,c.canvas.height);
 for(let y=0;y<13;y++)for(let x=0;x<17;x++){
  const px=x*s,py=y*s,cell=state.grid[y]?.[x]||0;
  c.fillStyle=map.floor[(x+y)%2];c.fillRect(px,py,s+.5,s+.5);
  if(cell===1){rect(c,px+2,py+5,s-4,s-6,8,'#203e5266');rect(c,px+2,py+1,s-4,s-8,8,map.wall);rect(c,px+5,py+3,s-10,5,3,'#ffffff44');if(state.map==='garden'){ellipse(c,px+s*.4,py+s*.46,s*.24,s*.23,'#69967e');ellipse(c,px+s*.64,py+s*.55,s*.17,s*.16,'#81aa8b');}else if(state.map==='candy'){poly(c,[[px+8,py+8],[px+20,py+8],[px+s-8,py+s-15],[px+s-20,py+s-15]],'#efdaff');}else{rect(c,px+8,py+12,s-16,s-25,4,'#739eaf');}}
  if(cell===2){rect(c,px+3,py+7,s-6,s-9,6,'#182f4a66');rect(c,px+3,py+2,s-6,s-10,6,map.crate,'#614f6644');rect(c,px+7,py+6,s-14,s-19,4,'#ffffff15');c.strokeStyle='#72533e66';c.lineWidth=2;c.beginPath();c.moveTo(px+8,py+9);c.lineTo(px+s-8,py+s-15);c.moveTo(px+s-8,py+9);c.lineTo(px+8,py+s-15);c.stroke();rect(c,px+4,py+s*.45,s-8,5,1,'#ffffff30');}
  if(!cell&&state.map==='garden'&&(x*7+y*11)%13===0){c.fillStyle='#a0d79b55';c.font=`${s*.23}px sans-serif`;c.fillText('✧',px+s*.35,py+s*.6);}
 }
 const symbols={speed:'»',bombs:'●',range:'✦',needle:'↗'},colors={speed:'#ffe186',bombs:'#78d8ff',range:'#bda1ff',needle:'#ffadc6'};
 for(const [k,type] of Object.entries(state.items||{})){const [x,y]=k.split(',').map(Number);const yy=(y+.5)*s+Math.sin(time/250+x)*2;ellipse(c,(x+.5)*s,yy,s*.29,s*.29,'#142e44aa');ellipse(c,(x+.5)*s,yy-3,s*.29,s*.29,colors[type]);c.fillStyle='#25314b';c.textAlign='center';c.font=`bold ${s*.43}px sans-serif`;c.fillText(symbols[type],(x+.5)*s,yy+4);}
 for(const b of state.bombs||[])drawBomb(c,(b.x+.5)*s,(b.y+.5)*s,s*.84,time+b.id*37);
 for(const b of state.blasts||[]){c.fillStyle='#a0f6ffbb';c.fillRect(b.x*s+1,b.y*s+1,s-2,s-2);rect(c,b.x*s+s*.15,b.y*s+s*.15,s*.7,s*.7,12,'#e0ffffbb');ellipse(c,(b.x+.25)*s,(b.y+.22)*s,s*.09,s*.12,'white');}
 for(const p of [...state.players].filter(p=>!['spectator','waiting'].includes(p.state)).sort((a,b)=>a.y-b.y)){
  let v=positions.get(p.id);if(!v){v={x:p.x,y:p.y};positions.set(p.id,v);}const walking=Math.abs(v.x-p.x)+Math.abs(v.y-p.y)>.04;
  v.x+=(p.x-v.x)*.32;v.y+=(p.y-v.y)*.32;
  drawCharacter(c,p.character,(v.x+.5)*s,(v.y+.5)*s,s*.73,{t:time,walk:walking,face:p.facing,bubble:p.state==='bubble',dead:p.state==='dead',placing:state.now-p.plantedAt<230,team:state.mode==='team'?p.team:undefined,me:p.id===selfId,immune:p.immuneUntil>state.now});
  if(p.state!=='dead'){c.textAlign='center';c.font=`600 ${Math.max(10,s*.20)}px "Malgun Gothic",sans-serif`;c.lineWidth=3;c.strokeStyle='#163344';c.fillStyle='white';const label=p.name+(p.connected===false?' · 끊김':'');c.strokeText(label,(v.x+.5)*s,(v.y-.15)*s);c.fillText(label,(v.x+.5)*s,(v.y-.15)*s);}
  if(p.state==='bubble'){c.fillStyle='#173957';c.textAlign='center';c.font=`bold ${s*.3}px sans-serif`;c.fillText(Math.max(1,Math.ceil((p.bubbleUntil-state.now)/1000)),(v.x+.5)*s,(v.y+1.01)*s);}
 }
}
export function demoState(){
 const grid=Array.from({length:13},(_,y)=>Array.from({length:17},(_,x)=>!x||!y||x===16||y===12||(x%2===0&&y%2===0)?1:((x*17+y*11)%7<2?2:0)));
 const players=[[3,3],[13,3],[7,5],[11,9],[3,9],[13,7],[7,9],[9,3]].map(([x,y],i)=>{grid[y][x]=0;return {id:'demo'+i,name:CHARACTERS[i].name,character:i,x,y,state:'alive',facing:'down',connected:true};});
 return {map:'garden',grid,players,items:{'5,3':'range','11,5':'needle','5,9':'speed'},bombs:[{id:1,x:5,y:5},{id:2,x:9,y:9}],blasts:[],now:0,mode:'solo'};
}
