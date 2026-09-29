import { canStep, same, type Puzzle } from './rules';
const NS='http://www.w3.org/2000/svg';
/** A grid vertex becomes a numbered circular node; edge barriers and face clues keep their topology. */
export function drawTileBoard(board:SVGSVGElement,puzzle:Puzzle,path:number[][]):void {
  const visited=new Set(path.map(p=>p.join(',')));
  // Draw valid connections underneath the circles so clues and the active line stay clear.
  for(let x=0;x<=puzzle.width*2;x+=2)for(let y=0;y<=puzzle.height*2;y+=2){
    for(const [dx,dy]of [[2,0],[0,2]]){
      const next=[x+dx,y+dy];
      if(!canStep(puzzle,[x,y],next))continue;
      const track=document.createElementNS(NS,'line');
      const attrs={x1:40+x*30,y1:40+y*30,x2:40+next[0]*30,y2:40+next[1]*30,stroke:'#aec8e8','stroke-width':5,'stroke-linecap':'round',class:'witness-node-track'};
      for(const [key,value]of Object.entries(attrs))track.setAttribute(key,String(value));
      board.append(track);
    }
  }
  for(let x=0;x<=puzzle.width*2;x+=2)for(let y=0;y<=puzzle.height*2;y+=2){
    const rect=document.createElementNS(NS,'circle');
    const start=same([x,y],puzzle.start),end=same([x,y],puzzle.end);
    const attrs={cx:40+x*30,cy:40+y*30,r:20,fill:visited.has(`${x},${y}`)?'#3780e8':end?'#fff1ce':'#ffffff',stroke:start?'#3780e8':end?'#d4a446':'#bbcee5','stroke-width':start||end?2.5:1.5,'data-tile':`${x},${y}`};
    for(const [key,value]of Object.entries(attrs))rect.setAttribute(key,String(value));
    board.append(rect);
  }
  for(const [x,y]of puzzle.gaps){
    const barrier=document.createElementNS(NS,'line');
    const horizontal=x%2===1;
    const cx=40+x*30,cy=40+y*30;
    const attrs={x1:cx-(horizontal?0:15),y1:cy-(horizontal?15:0),x2:cx+(horizontal?0:15),y2:cy+(horizontal?15:0),stroke:'#d76664','stroke-width':5,'stroke-linecap':'round'};
    for(const [key,value]of Object.entries(attrs))barrier.setAttribute(key,String(value));
    board.append(barrier);
  }
}
