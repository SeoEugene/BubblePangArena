export const CHARACTERS = [
  {id:0,name:'토리',animal:'토끼',job:'탐험가',color:'#61e2bf',speed:4,bombs:2,range:2,style:'기동형',desc:'새로운 길이라면 누구보다 먼저!'},
  {id:1,name:'모코',animal:'너구리',job:'정비사',color:'#ffab65',speed:3,bombs:3,range:2,style:'설치형',desc:'꼼꼼한 준비가 승리를 만든다.'},
  {id:2,name:'루미',animal:'고양이',job:'마법사',color:'#b49bff',speed:3,bombs:2,range:3,style:'견제형',desc:'별빛처럼 멀리 퍼지는 물방울.'},
  {id:3,name:'피코',animal:'병아리',job:'배달원',color:'#ffe078',speed:5,bombs:1,range:2,style:'속도형',desc:'늦지 않게, 누구보다 빠르게!'},
  {id:4,name:'부루',animal:'곰',job:'수호자',color:'#78b4ff',speed:2,bombs:4,range:2,style:'봉쇄형',desc:'친구들의 길은 내가 지킨다.'},
  {id:5,name:'코랄',animal:'해달',job:'항해사',color:'#ff9cbc',speed:2,bombs:2,range:4,style:'원거리형',desc:'파도를 읽으면 기회가 보여.'},
  {id:6,name:'제트',animal:'늑대',job:'스케이터',color:'#aebed7',speed:4,bombs:1,range:3,style:'기습형',desc:'찰나의 틈을 타고 질주!'},
  {id:7,name:'누리',animal:'여우',job:'정원사',color:'#b7e77d',speed:2,bombs:3,range:3,style:'전략형',desc:'차근차근 승리를 심어요.'}
];
export const MAPS = [
 {id:'garden',name:'버블 가든',tag:'처음이라면 추천',desc:'초록 정원에서 펼쳐지는 균형 잡힌 대전',floor:['#397964','#36715f'],wall:'#aecdb2',crate:'#d5a56d',accent:'#69e8b7'},
 {id:'candy',name:'캔디 팩토리',tag:'갈림길의 묘미',desc:'달콤한 공장, 예측할 수 없는 갈림길',floor:['#73578d','#6d5187'],wall:'#d5bcf5',crate:'#f3a3be',accent:'#d9adff'},
 {id:'harbor',name:'아쿠아 항구',tag:'넓게 보고 빠르게',desc:'시원한 부두의 넓은 길과 좁은 통로',floor:['#3c7b96','#36738f'],wall:'#aacde3',crate:'#cdad7d',accent:'#76d5ff'}
];
export const RULES = {
 width:17,height:13,tickMs:50,fuseMs:2500,blastMs:450,bubbleMs:5000,roundMs:180000,
 countdownMs:3000,reconnectMs:20000,maxSpeed:6,maxBombs:5,maxRange:5,
 drops:{speed:0.12,bombs:0.12,range:0.12,needle:0.035}
};
export const DIRECTIONS = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export const stepMs = speed => 230 - Math.min(RULES.maxSpeed, speed) * 23;
