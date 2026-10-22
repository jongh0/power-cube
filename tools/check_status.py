#!/usr/bin/env python3
"""파워큐브 충전소 상태 조회. 사용: python3 check_status.py [eboxmno] [lat lng]"""
import json, subprocess, sys, time
BASE = 'https://www.powercube.co.kr'
def curl(args):
    return subprocess.run(['curl', '-sL', '-m', '30'] + args, capture_output=True, text=True).stdout
def auth():
    ch = str(int(time.time() * 1000)) + '000'
    return json.loads(curl(['-X', 'POST', BASE + '/INC/get_authkey.php', '-d', f'authval=user&chkey={ch}']))
def markers(a, lat, lng, meter=100, chger='12'):
    p = dict(current_lat=lat, current_lng=lng, current_meter=meter, filter_operation_group='powercube',
             filterchgerType=chger, filter_status='', filterkw='',
             authval=a['authval'], authkey=a['authkey'], chkey=a['chkey'])
    args = ['-G', BASE + '/api/map/getmarker.php']
    for k, v in p.items(): args += ['--data-urlencode', f'{k}={v}']
    return json.loads(curl(args)).get('results') or []
if __name__ == '__main__':
    eid = sys.argv[1] if len(sys.argv) > 1 else '165170000001'
    lat, lng = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (37.2839417579058, 127.056777997528)
    for x in markers(auth(), lat, lng):
        if x['eboxmno'] == eid:
            print(json.dumps({k: x[k] for k in ('eboxmno', 'scspotname', 'scaddr1', 'status', 'count_detail', 'busiCall')}, ensure_ascii=False, indent=1))
            break
    else:
        print('not found')
