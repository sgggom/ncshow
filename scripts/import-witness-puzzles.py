import re,json,pathlib,collections,sys
root=pathlib.Path(sys.argv[1]); out=[]; counts=collections.Counter(); seen=set()
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
 start=tuple(p['start']);end=tuple(p['end']);blocked=set(map(tuple,p['gaps'])); path=[start];vis={start}; ticks=0
 def dfs(a):
  nonlocal ticks
  ticks+=1
  if ticks>60000:return None
  if a==end:return path.copy() if valid(p,path) else None
  for dx,dy in [(2,0),(0,-2),(-2,0),(0,2)]:
   b=(a[0]+dx,a[1]+dy)
   if b in vis or not(0<=b[0]<=p['width']*2 and 0<=b[1]<=p['height']*2) or (a[0]+dx//2,a[1]+dy//2) in blocked:continue
   vis.add(b);path.append(b);r=dfs(b)
   if r:return r
   path.pop();vis.remove(b)
  return None
 return dfs(start)
for f in sorted((root/'play').glob('*.html')):
 try:
  m=re.search(r'Puzzle\.deserialize\(("(?:\\.|[^"\\])*")\)',f.read_text()); d=json.loads(json.loads(m[1]))
  if d.get('pillar') or d.get('symmetry') or d['width']>9 or d['height']>9 or d['width']<5 or d['height']<5:continue
  p=dict(id=f.stem,name=d.get('name',''),width=(d['width']-1)//2,height=(d['height']-1)//2,start=[],end=[],dots=[],gaps=[],symbols=[]); starts=[];ends=[]; bad=False
  for x,col in enumerate(d['grid']):
   for y,c in enumerate(col):
    if not c:continue
    t=c.get('type')
    if t not in ['line','nonce','square','star','triangle',None]:bad=True
    if c.get('start'):starts.append([x,y])
    if c.get('end'):ends.append([x,y]);p['endDirection']=c['end']
    if c.get('dot'):
     if c['dot']!=1:bad=True
     p['dots'].append([x,y])
    if c.get('gap'):
     if c['gap']!=1 or (x+y)%2!=1:bad=True
     p['gaps'].append([x,y])
    if t in ['square','star','triangle']:
     s=dict(x=x,y=y,type=t,color=c.get('color','orange'))
     if t=='triangle':s['count']=c.get('count',1)
     p['symbols'].append(s)
  if bad or len(starts)!=1 or len(ends)!=1 or any(v%2 for v in starts[0]+ends[0]):continue
  p['start']=starts[0];p['end']=ends[0]
  kinds={s['type'] for s in p['symbols']}|({'dots'} if p['dots'] else set())
  cat=next(iter(kinds)) if len(kinds)==1 else 'mixed' if kinds else 'maze'
  if counts[cat]>=6:continue
  sig=json.dumps([p[k] for k in ['width','height','start','end','dots','gaps','symbols']])
  if sig in seen:continue
  sol=solve(p)
  if not sol:continue
  seen.add(sig);p['category']=cat;p['solution']=sol;out.append(p);counts[cat]+=1
  print(counts,flush=True)
  if len(out)==36:break
 except (ValueError,KeyError,TypeError,IndexError):continue
order=['maze','dots','square','star','triangle','mixed'];out.sort(key=lambda p:(order.index(p['category']),p['width']*p['height']))
pathlib.Path('src/gameplay/witness/puzzles.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('DONE',len(out),counts)
