"""Import the vendored ttws source without executing upstream Python 2 code.
Run from the repository root: python3 scripts/import-ttws-puzzles.py
"""
import json,pathlib,time,hashlib
import base64,collections

def fields(data):
 def number(i):
  value=0;shift=0
  while True:
   b=data[i];i+=1;value|=(b&127)<<shift;shift+=7
   if b<128:return value,i
 result=collections.defaultdict(list);i=0
 while i<len(data):
  tag,i=number(i);wire=tag&7
  if wire==0:value,i=number(i)
  elif wire==2:
   length,i=number(i);value=data[i:i+length];i+=length
  else:raise ValueError('Unexpected protobuf wire type')
  result[tag>>3].append(value)
 return result

def decode(code):
 code=code.strip().removesuffix('_0');d=fields(base64.b64decode(code.replace('_','/').replace('-','+')+'==='));es=[]
 for raw in d[2]:
  e=fields(raw)
  es.extend([{}]*e[5][0] if e[5] else [{k:v[0] for k,v in e.items() if v}])
 return d[1][0],d[3][0] if d[3] else 0,es


def valid(p,path):
 used=set(path); walls=set()
 for a,b in zip(path,path[1:]): walls.add(((a[0]+b[0])//2,(a[1]+b[1])//2))
 if not set(map(tuple,p['dots'])) <= used|walls:return False
 cells={(x,y) for x in range(1,p['width']*2,2) for y in range(1,p['height']*2,2)}
 for s in p['symbols']:
  if s['type']=='triangle' and sum((s['x']+dx,s['y']+dy) in walls for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)])!=s['count']:return False
 while cells:
  seed=cells.pop(); region={seed}; queue=[seed]
  for x,y in queue:
   for dx,dy in [(2,0),(-2,0),(0,2),(0,-2)]:
    n=(x+dx,y+dy)
    if n in cells and (x+dx//2,y+dy//2) not in walls:cells.remove(n);region.add(n);queue.append(n)
  ss=[s for s in p['symbols'] if (s['x'],s['y']) in region]
  if len({s['color'] for s in ss if s['type']=='square'})>1:return False
  colors=collections.Counter(s.get('color') for s in ss)
  if any(colors[s['color']]!=2 for s in ss if s['type']=='star'):return False
 return True
def solve(p):
 start=tuple(p['start']);end=tuple(p['end']);blocked=set(map(tuple,p['gaps'])); path=[start];vis={start}; ticks=0; deadline=time.monotonic()+3
 def dfs(a):
  nonlocal ticks
  ticks+=1
  if ticks>1500000 or (ticks%1024==0 and time.monotonic()>deadline):return None
  if a==end:return path.copy() if valid(p,path) else None
  if ticks%8==0:
   reachable={a}; queue=[a]
   for v in queue:
    for dx,dy in [(2,0),(-2,0),(0,2),(0,-2)]:
     b=(v[0]+dx,v[1]+dy)
     if b not in reachable and b not in vis and 0<=b[0]<=p['width']*2 and 0<=b[1]<=p['height']*2 and (v[0]+dx//2,v[1]+dy//2) not in blocked:
      reachable.add(b);queue.append(b)
   if end not in reachable:return None
   for dot in p['dots']:
    q=tuple(dot)
    if q[0]%2==0 and q[1]%2==0 and q not in vis and q not in reachable:return None
  for dx,dy in [(2,0),(0,-2),(-2,0),(0,2)]:
   b=(a[0]+dx,a[1]+dy)
   if b in vis or not(0<=b[0]<=p['width']*2 and 0<=b[1]<=p['height']*2) or (a[0]+dx//2,a[1]+dy//2) in blocked:continue
   vis.add(b);path.append(b);r=dfs(b)
   if r:return r
   path.pop();vis.remove(b)
  return None
 return dfs(start)

SOURCE=pathlib.Path('public/witness/ttws/witness_puzzles')
COLORS={1:'black',2:'white',3:'cyan',4:'magenta',5:'yellow',6:'red',7:'green',8:'blue',9:'orange'}
playable=[];report=[];seen=set()
for line,code in enumerate(SOURCE.read_text().splitlines(),1):
 if not code.strip():continue
 entry={'line':line}; report.append(entry)
 try:
  width,symmetry,entities=decode(code)
  if len(entities)%width or width%2!=1:raise ValueError('Invalid dimensions')
  height=len(entities)//width
  if height%2!=1:raise ValueError('Invalid height')
  types={e.get(1,0) for e in entities}
  reasons=[]
  if symmetry>1:reasons.append('symmetry')
  if 9 in types:reasons.append('polyomino')
  if 10 in types:reasons.append('negation')
  if reasons:entry.update(status='unsupported',reasons=reasons);continue
  starts=[];ends=[]
  p={'id':'ttws-'+hashlib.sha256(code.encode()).hexdigest()[:12], 'name':f'The Witness · ttws #{line}', 'width':width//2,'height':height//2,'dots':[],'gaps':[],'symbols':[], 'source':'ttws','sourceLine':line}
  for i,e in enumerate(entities):
   x=i%width;y=i//width;t=e.get(1,0)
   if t in (0,1,2):continue
   if t in (3,4):
    if x%2 or y%2:raise ValueError('Start/end on edge')
    (starts if t==3 else ends).append([x,y])
    if t==4:
     orientation=fields(e[3]) if 3 in e else {}
     horizontal=orientation.get(1,[0])[0];vertical=orientation.get(2,[0])[0]
     p['endDirection']=('left' if horizontal==1 else 'right' if horizontal==2 else 'top' if vertical==1 else 'bottom' if vertical==2 else 'top' if y==0 else 'bottom' if y==height-1 else 'left' if x==0 else 'right')
   elif t==5:
    if (x+y)%2!=1:raise ValueError('Non-edge gap')
    p['gaps'].append([x,y])
   elif t==6:
    if x%2 and y%2:raise ValueError('Cell dot')
    p['dots'].append([x,y])
   elif t in (7,8,11):
    if not(x%2 and y%2):raise ValueError('Non-cell symbol')
    symbol={'x':x,'y':y,'type':{7:'square',8:'star',11:'triangle'}[t],'color':COLORS.get(e.get(2,0),'orange')}
    if t in (7,8) and e.get(2,0) not in COLORS:raise ValueError('Unknown symbol color')
    if t==11:symbol['count']=e.get(6,0)
    p['symbols'].append(symbol)
   else:raise ValueError('Unknown entity type')
  if len(starts)!=1 or len(ends)!=1:entry.update(status='unsupported',reasons=['multiple_start_or_end']);continue
  p['start']=starts[0];p['end']=ends[0]
  kinds={s['type'] for s in p['symbols']}|({'dots'} if p['dots'] else set())
  p['category']=next(iter(kinds)) if len(kinds)==1 else 'mixed' if kinds else 'maze'
  if p['id'] in seen:entry.update(status='duplicate');continue
  solution=solve(p)
  if not solution:entry.update(status='unverified',reasons=['no_solution_within_search_budget']);continue
  p['solution']=solution;playable.append(p);seen.add(p['id']);entry.update(status='imported',id=p['id'],category=p['category'])
  print(f"Imported {line}: {p['category']}",flush=True)
 except (ValueError,IndexError,KeyError) as error:entry.update(status='unsupported',reasons=[str(error)])
pathlib.Path('src/gameplay/witness/originalPuzzles.json').write_text(json.dumps(playable,ensure_ascii=False,indent=2)+'\n')
pathlib.Path('public/witness/ttws/import-report.json').write_text(json.dumps({'total':len(report),'imported':len(playable),'records':report},ensure_ascii=False,indent=2)+'\n')
print('RESULT',len(playable),collections.Counter(e['status'] for e in report),flush=True)
