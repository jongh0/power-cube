import json,subprocess,math,sys
from concurrent.futures import ThreadPoolExecutor
A=json.load(open('/tmp/auth.json'))
T=sys.argv[1]
def get(lat,lng,m):
    p=dict(current_lat=lat,current_lng=lng,current_meter=m,filter_operation_group='powercube',filterchgerType=T,filter_status='',filterkw='',authval=A['authval'],authkey=A['authkey'],chkey=A['chkey'])
    a=['curl','-sL','-m','40','-G','https://www.powercube.co.kr/api/map/getmarker.php']
    for k,v in p.items(): a+=['--data-urlencode',f'{k}={v}']
    try: return json.loads(subprocess.run(a,capture_output=True,text=True).stdout)['results']
    except Exception: return []
seen={}
def cell(lat,lng,m):
    r=get(lat,lng,m) or []
    for x in r: seen[x['eboxmno']]=x
    if len(r)>=300 and m>200:
        d=m/111000
        for dl in(-1,1):
            for dg in(-1,1): cell(lat+dl*d*0.7,lng+dg*d*0.9,m/2)
cells=[(la/10,lg/10,20000) for la in range(330,390,1) for lg in range(1255,1300,1) if False]
cells=[(la/10,lg/10,25000) for la in range(332,388,2) for lg in range(1258,1300,2)]
with ThreadPoolExecutor(16) as ex: list(ex.map(lambda c:cell(*c),cells))
json.dump(list(seen.values()),open(f'stations_{T or "all"}.json','w'),ensure_ascii=False)
print(len(seen),seen.get('165170000001'))
