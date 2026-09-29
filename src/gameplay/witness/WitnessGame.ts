import { drawTileBoard } from './tileBoard';
import { tracePointer } from './trace';
import data from './puzzles.json';
import originalData from './originalPuzzles.json';
import importReport from '../../../public/witness/ttws/import-report.json';
import { canStep, same, validate, type Puzzle } from './rules';
const puzzles: Puzzle[] = [...data, ...originalData.map(p=>({...p,source:'ttws' as const}))];
const labels: Record<string,string> = { maze:'起点与终点', dots:'必经黑点', square:'色块分区', star:'星星配对', triangle:'三角计数', mixed:'组合挑战' };
const tips: Record<string,string> = { maze:'从大圆点出发，沿网格画到伸出的终点。', dots:'路线必须经过每一个黑点。', square:'用路线分区，每个区域只能有一种颜色的方块。', star:'星星所在区域必须恰好有两个同色符号，方块也计入。', triangle:'格子里的三角形有几个，路线就必须经过它的几条边。', mixed:'同时满足棋盘上所有符号的规则。' };
const NS='http://www.w3.org/2000/svg';
const tileTips: Record<string,string> = { maze:'从起点圆点走到终点圆点，可上下左右连接，不必走满。', dots:'连接相邻圆点，经过圆点上和圆点间的全部黑点。', square:'用连线分区，让提示区里不同颜色的方块分开。', star:'每颗星星所在区域，必须恰好有两个同色符号。', triangle:'三角提示周围的四条连线，经过条数须等于三角数量。', mixed:'连接相邻圆点，同时满足圆点间提示区的全部规则。' };
export class WitnessGame {
  private index=0;
  private path:number[][]=[];
  private completed=new Set<string>();
  private solved=false;
  private pointer:number|null=null;
  private libraryFromLobby=false;
  private librarySource='ttws';
  private readonly board:SVGSVGElement;
  private readonly status:HTMLElement;
  private readonly picker:HTMLElement;
  constructor(private readonly root:HTMLElement, private readonly back:()=>void, private readonly variant:'lines'|'tiles'='lines') {
    try { const saved=JSON.parse(localStorage.getItem(this.storageKey)||'{}'); this.completed=new Set(Array.isArray(saved.completed)?saved.completed.filter((id:unknown)=>typeof id==='string'):[]); this.index=Math.max(0,puzzles.findIndex(p=>p.id===saved.current)); } catch { /* Storage is optional. */ }
    root.innerHTML=`<header class="witness-header"><button data-action="back" aria-label="返回大厅">‹</button><div><small>${this.variant==='tiles'?'WITNESS · 圆点版':'画线解谜'}</small><h1>${this.variant==='tiles'?'圆点解谜':'WITNESS'}</h1></div><button data-action="library">玩法分类</button></header>
      <div class="witness-level"><span></span><strong></strong></div>
      <p class="witness-tip"></p>
      <svg class="witness-board" tabindex="0" role="application" aria-label="画线棋盘：拖动起点画线，或按回车开始，方向键移动，退格撤销"></svg>
      <p class="witness-status" role="status" aria-live="polite"></p>
      <div class="witness-actions"><button data-action="undo">撤销</button><button data-action="reset">重画</button><button data-action="hint">提示一步</button></div>
      <button class="witness-next" data-action="next" hidden>下一题 →</button>
      <details class="witness-help"><summary>玩法与题库来源</summary><p>${this.variant==='tiles'?'从起点圆点连到终点圆点，只能沿显示的路径上下左右连接，不能重复经过圆点。不必走满所有圆点，数字表示连接步序。圆点间的符号是分区提示，不是可连接的圆点。':'从圆点画到终点，路线不能交叉或穿过断口。'}可拖动，也可逐点点击；往回走即可撤销。键盘：回车开始、方向键移动、退格撤销。</p><p>${Object.values(this.variant==='tiles'?tileTips:tips).slice(1,5).join('<br>')}</p><p>题库包含 ttws 社区整理的原版题目和 36 道社区练习题。原版整理不代表官方完整题库。<a href="https://github.com/barrycohen/ttws" target="_blank" rel="noopener">ttws</a> · <a href="${import.meta.env.BASE_URL}witness/ttws/LICENSE.txt" target="_blank" rel="noopener">MIT 授权</a>。社区练习来自 <a href="https://witnesspuzzles.com/" target="_blank" rel="noopener">Witness Puzzles</a> · <a href="${import.meta.env.BASE_URL}witness/LICENSE.txt" target="_blank" rel="noopener">BSD 授权</a></p><a class="witness-source" target="_blank" rel="noopener">查看本题原始来源</a></details>
      <div class="witness-picker" hidden><header><h2>Witness 题库</h2><button data-action="close">关闭</button></header><div class="witness-source-tabs" aria-label="题库来源"><button data-source="ttws">原版整理</button><button data-source="community">社区练习</button></div><p class="witness-library-note"></p><p class="witness-progress"></p><div class="witness-levels"></div></div>`;
    this.board=root.querySelector('svg')!;this.status=root.querySelector('.witness-status')!;this.picker=root.querySelector('.witness-picker')!;
    root.addEventListener('click',event=>{
      const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
      if(button.dataset.level!==undefined){this.index=Number(button.dataset.level);this.closeLibrary();this.load();this.board.focus();return;}
      if(button.dataset.source){this.librarySource=button.dataset.source;this.renderLibrary();return;}
      if(button.dataset.category){this.renderLibrary(button.dataset.category);return;}
      switch(button.dataset.action){
        case 'back': this.pointer=null;back();break;
        case 'library':this.openLibrary();break;
        case 'close':this.exitLibrary();break;
        case 'categories':this.renderLibrary();break;
        case 'reset':this.load();break;
        case 'undo':this.undo();break;
        case 'hint':this.hint();break;
        case 'next':{
          const category=this.categoryPuzzles;
          const current=category.findIndex(p=>p.id===this.puzzle.id);
          const next=[...category.slice(current+1),...category.slice(0,current)].find(p=>!this.completed.has(p.id));
          if(next){this.index=puzzles.indexOf(next);this.load();}
          else this.openLibrary();
          break;
        }
      }
    });
    this.board.addEventListener('pointerdown',e=>{if(e.button!==0 || this.pointer!==null)return;e.preventDefault();this.board.focus();this.pointer=e.pointerId;this.board.setPointerCapture(e.pointerId);this.atPointer(e);});
    this.board.addEventListener('pointermove',e=>{if(this.pointer===e.pointerId)this.atPointer(e);});
    const release=(e:PointerEvent)=>{if(this.pointer===e.pointerId){this.pointer=null;this.drawTrace(this.path);}};
    this.board.addEventListener('pointerup',release);this.board.addEventListener('pointercancel',release);this.board.addEventListener('lostpointercapture',release);
    this.board.addEventListener('keydown',e=>{
      const dirs:Record<string,number[]>={ArrowUp:[0,-2],ArrowDown:[0,2],ArrowLeft:[-2,0],ArrowRight:[2,0]};
      if(e.key==='Enter'){e.preventDefault();this.step(this.puzzle.start);}
      else if(e.key==='Backspace'){e.preventDefault();this.undo();}
      else if(dirs[e.key]){e.preventDefault();const last=this.path.at(-1);if(last)this.step(last.map((v,i)=>v+dirs[e.key][i]));}
    });
    this.picker.addEventListener('keydown',e=>{
      if(e.key==='Escape')this.exitLibrary();
      if(e.key==='Tab'){
        const buttons=[...this.picker.querySelectorAll<HTMLButtonElement>('button')];
        if(e.shiftKey && document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1)!.focus();}
        else if(!e.shiftKey && document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
      }
    });
    this.load();
  }
  private get storageKey():string{return this.variant==='tiles'?'ncshow:witness-tiles:v1':'ncshow:witness:v1';}
  private get ruleTips():Record<string,string>{return this.variant==='tiles'?tileTips:tips;}
  public open():void{this.openLibrary(true);}
  private get categoryPuzzles():Puzzle[]{return puzzles.filter(p=>p.category===this.puzzle.category && p.source===this.puzzle.source);}
  private get puzzle():Puzzle{return puzzles[this.index];}
  private save():void{try{localStorage.setItem(this.storageKey,JSON.stringify({completed:[...this.completed],current:this.puzzle.id}));}catch{/* Keep playing without persistence. */}}
  private load():void{
    this.path=[];this.solved=false;this.pointer=null;
    this.root.querySelector('.witness-level span')!.textContent=`${labels[this.puzzle.category]} · 第 ${this.categoryPuzzles.findIndex(p=>p.id===this.puzzle.id)+1} / ${this.categoryPuzzles.length} 题`;
    this.root.querySelector('.witness-level strong')!.textContent=this.completed.has(this.puzzle.id)?'已通关 ✓':'';
    this.root.querySelector('.witness-tip')!.textContent=this.ruleTips[this.puzzle.category];
    const source=this.root.querySelector<HTMLAnchorElement>('.witness-source')!;source.href=this.puzzle.source==='ttws'?`https://github.com/barrycohen/ttws/blob/master/witness_puzzles#L${this.puzzle.sourceLine}`:`https://witnesspuzzles.com/play/${this.puzzle.id}.html`;
    source.textContent=this.puzzle.source==='ttws'?`本题来源：ttws 第 ${this.puzzle.sourceLine} 条`:'查看本题原始来源';
    this.status.textContent=this.variant==='tiles'?'从标有 1 的圆点开始':'从大圆点开始';this.render();this.save();
  }
  private atPointer(e:PointerEvent):void{
    const matrix=this.board.getScreenCTM();if(!matrix)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    if(this.solved)return;
    const cursor=[(p.x-40)/30,(p.y-40)/30];
    if(!this.path.length){
      if(Math.hypot(cursor[0]-this.puzzle.start[0],cursor[1]-this.puzzle.start[1])<.8)this.step(this.puzzle.start);
      return;
    }
    // Allow dragging back from a rejected endpoint too.
    const result=tracePointer(this.puzzle,this.path,cursor);
    const changed=result.path.length!==this.path.length || result.path.some((point,i)=>!same(point,this.path[i]));
    if(changed){this.path=result.path;this.updateStatus();this.render();}
    this.drawTrace(result.display);
  }
  private drawTrace(points:number[][]):void{
    this.board.querySelector('.witness-trace')?.setAttribute('points',points.map(a=>`${40+a[0]*30},${40+a[1]*30}`).join(' '));
    if(this.variant==='tiles'){
      this.board.querySelectorAll('.witness-node-number').forEach(node=>node.remove());
      this.path.forEach((point,index)=>{
        const label=document.createElementNS(NS,'text');
        const attrs={x:40+point[0]*30,y:40+point[1]*30,'text-anchor':'middle','dominant-baseline':'central',fill:'#fff','font-size':18,'font-weight':800,stroke:'#3780e8','stroke-width':5,'paint-order':'stroke',class:'witness-node-number'};
        for(const [key,value]of Object.entries(attrs))label.setAttribute(key,String(value));
        label.textContent=String(index+1);this.board.append(label);
      });
    }
  }

  private step(point:number[]):void{
    if(this.solved)return;
    const last=this.path.at(-1);
    if(!last){if(same(point,this.puzzle.start))this.path=[point];else return;}
    else if(this.path.length>1 && same(point,this.path[this.path.length-2]))this.path.pop();
    else if(canStep(this.puzzle,last,point)&&!this.path.some(p=>same(p,point)))this.path.push(point);
    else return;
    this.updateStatus();
    this.render();
  }
  private updateStatus():void{
    this.status.textContent=this.variant==='tiles'?'连接相邻圆点，往回拖可撤销':'沿网格继续画线，往回走可撤销';
    if(this.path.length && same(this.path.at(-1)!,this.puzzle.end)){
      const error=validate(this.puzzle,this.path);this.status.textContent=(this.variant==='tiles'?error?.replace('该格被路线经过的边数','该提示周围被连接的边数'):error)||'解开了！所有规则均已满足 ✓';
      if(!error){this.solved=true;this.completed.add(this.puzzle.id);this.save();this.root.querySelector('.witness-level strong')!.textContent='已通关 ✓';}
    }
  }
  private undo():void{this.solved=false;this.path.pop();this.status.textContent='已撤销一步';this.render();}
  private hint():void{
    if(this.solved)return;
    const solution=this.puzzle.solution;
    if(this.path.some((p,i)=>!solution[i]||!same(p,solution[i]))){this.status.textContent='当前路线与参考解不同，重画后可逐步提示（也可能有其他解）。';return;}
    this.step(solution[this.path.length]);
  }
  private render():void{
    const p=this.puzzle;this.board.replaceChildren();this.board.setAttribute('viewBox',`0 0 ${80+p.width*60} ${80+p.height*60}`);
    const el=(name:string,attrs:Record<string,string|number>)=>{const node=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));this.board.append(node);return node;};
    const line=(a:number[],b:number[],color:string,width:number)=>el('line',{x1:40+a[0]*30,y1:40+a[1]*30,x2:40+b[0]*30,y2:40+b[1]*30,stroke:color,'stroke-width':width,'stroke-linecap':'round'});
    if(this.variant==='tiles')drawTileBoard(this.board,p,this.path);
    else for(let x=0;x<=p.width*2;x+=2)for(let y=0;y<=p.height*2;y+=2)for(const d of [[2,0],[0,2]]){
      const b=[x+d[0],y+d[1]];if(b[0]>p.width*2||b[1]>p.height*2)continue;
      if(canStep(p,[x,y],b))line([x,y],b,'#567f79',9);
      else {line([x,y],[x+d[0]*.32,y+d[1]*.32],'#567f79',9);line([x+d[0]*.68,y+d[1]*.68],b,'#567f79',9);}
    }
    const direction:Record<string,number[]>={top:[0,-.6],bottom:[0,.6],left:[-.6,0],right:[.6,0]};const d=direction[p.endDirection]||[0,-.6];
    if(this.variant==='lines')line(p.end,p.end.map((v,i)=>v+d[i]),this.solved?'#ffe19a':'#567f79',9);
    if(this.variant==='lines')el('circle',{cx:40+p.start[0]*30,cy:40+p.start[1]*30,r:13,fill:'#779b90'});
    for(const s of p.symbols){const x=40+s.x*30,y=40+s.y*30;
      if(s.type==='square')el('rect',{x:x-10,y:y-10,width:20,height:20,rx:3,fill:s.color,stroke:'#96afa5','stroke-width':1});
      if(s.type==='star'){const points=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,r=i%2?6:12;return `${x+Math.sin(a)*r},${y+Math.cos(a)*r}`;}).join(' ');el('polygon',{points,fill:s.color,stroke:'#96afa5','stroke-width':.7});}
      if(s.type==='triangle')for(let i=0;i<(s.count||1);i++){const cx=x+(i-((s.count||1)-1)/2)*13;el('polygon',{points:`${cx},${y-6} ${cx-5},${y+4} ${cx+5},${y+4}`,fill:s.color});}
    }
    for(const dot of p.dots)el('circle',{cx:40+dot[0]*30,cy:40+dot[1]*30,r:5,fill:'#0a211e'});
    if(this.path.length){el('polyline',{class:'witness-trace',points:this.path.map(a=>`${40+a[0]*30},${40+a[1]*30}`).join(' '),fill:'none',stroke:this.variant==='tiles'?'#3780e8':'#ffe19a','stroke-width':9,'stroke-linecap':'round','stroke-linejoin':'round'});el('circle',{cx:40+p.start[0]*30,cy:40+p.start[1]*30,r:this.variant==='tiles'?6:13,fill:this.variant==='tiles'?'#3780e8':'#ffe19a'});}
    if(this.variant==='tiles'){
      for(const [point,label]of [[p.start,'1'],[p.end,'终']] as [number[],string][]){
        if(this.path.some(p=>same(p,point)))continue;
        const text=el('text',{x:40+point[0]*30,y:40+point[1]*30,'text-anchor':'middle','dominant-baseline':'central',fill:label==='1'?'#205caa':'#916712','font-size':15,'font-weight':700,stroke:label==='1'?'#ffffff':'#fff1ce','stroke-width':4,'paint-order':'stroke'});text.textContent=label;
      }
    }
    const nextButton=this.root.querySelector<HTMLElement>('[data-action="next"]')!;
    nextButton.hidden=!this.solved;
    nextButton.textContent=this.categoryPuzzles.every(p=>this.completed.has(p.id))?'本类已完成 · 选择其他玩法':'本类下一题 →';
    if(this.variant==='tiles')this.drawTrace(this.path);
    this.root.querySelector<HTMLButtonElement>('[data-action="undo"]')!.disabled=!this.path.length;
    this.root.querySelector<HTMLButtonElement>('[data-action="hint"]')!.disabled=this.solved;
  }
  private closeLibrary():void{
    this.picker.hidden=true;
    for(const child of this.root.children)child.removeAttribute('inert');
  }
  private exitLibrary():void{
    this.closeLibrary();
    if(this.libraryFromLobby)this.back();
    else this.root.querySelector<HTMLButtonElement>('[data-action="library"]')!.focus();
  }
  private openLibrary(fromLobby=false):void{
    this.libraryFromLobby=fromLobby;
    this.librarySource=fromLobby?'ttws':this.puzzle.source||'community';
    this.pointer=null;
    this.root.scrollTop=0;
    for(const child of this.root.children)if(child!==this.picker)child.setAttribute('inert','');
    this.picker.hidden=false;
    this.renderLibrary();
  }
  private renderLibrary(category?:string):void{
    this.picker.scrollTop=0;
    this.picker.querySelector('h2')!.textContent=category?labels[category]:'选择玩法';
    const close=this.picker.querySelector<HTMLButtonElement>('[data-action="close"], [data-action="categories"]')!;
    close.dataset.action=category?'categories':'close';
    close.textContent=category?'返回分类':this.libraryFromLobby?'返回大厅':'继续解题';
    const sourcePuzzles=puzzles.filter(p=>(p.source||'community')===this.librarySource);
    for(const button of this.picker.querySelectorAll<HTMLButtonElement>('[data-source]'))button.setAttribute('aria-pressed',String(button.dataset.source===this.librarySource));
    this.picker.querySelector('.witness-library-note')!.textContent=this.librarySource==='ttws'
      ? `ttws 原版整理 · 已验证 ${originalData.length} / ${importReport.total} 条。其余题目需补充规则或继续验证，暂未开放。`
      : '36 道社区创作练习题，通关进度独立保存。';
    const selected=category?sourcePuzzles.filter(p=>p.category===category):sourcePuzzles;
    this.root.querySelector('.witness-progress')!.textContent=category
      ? `${this.ruleTips[category]} 已完成 ${selected.filter(p=>this.completed.has(p.id)).length} / ${selected.length} 题`
      : '按规则自由选择，每种玩法单独记录进度';
    const list=this.root.querySelector<HTMLElement>('.witness-levels')!;list.replaceChildren();
    list.className=category?'witness-levels witness-category-levels':'witness-levels witness-categories';
    if(category){
      selected.forEach((p,i)=>{
        const b=document.createElement('button');b.dataset.level=String(puzzles.indexOf(p));
        b.textContent=`第 ${i+1} 题${this.completed.has(p.id)?' ✓':''}`;
        b.setAttribute('aria-label',`${labels[category]}，${b.textContent}`);
        b.setAttribute('aria-current',String(p.id===this.puzzle.id));list.append(b);
      });
    } else {
      const icons:Record<string,string>={maze:'↗',dots:'●',square:'■ □',star:'✦ ✦',triangle:'▲',mixed:'✦ ▪ ▲'};
      const descriptions:Record<string,string>={maze:'沿网格找到出口',dots:'经过全部黑点',square:'分隔不同颜色',star:'同色符号成对',triangle:'按数量经过边线',mixed:'多种规则一起解'};
      for(const [type,label]of Object.entries(labels)){
        const levels=sourcePuzzles.filter(p=>p.category===type);
        if(!levels.length)continue;
        const done=levels.filter(p=>this.completed.has(p.id)).length;
        const button=document.createElement('button');button.dataset.category=type;
        const icon=document.createElement('span');icon.className='witness-category-icon';icon.textContent=icons[type];icon.setAttribute('aria-hidden','true');
        const title=document.createElement('strong');title.textContent=label;
        const description=document.createElement('span');description.textContent=descriptions[type];
        const progress=document.createElement('small');progress.textContent=`${done} / ${levels.length} 已完成${done===levels.length?' ✓':''}`;
        button.append(icon,title,description,progress);list.append(button);
      }
    }
    close.focus();
  }
}
