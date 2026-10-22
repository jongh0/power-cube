import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDetail } from '../lib/parse.js';

const html = `<table><tr><td>충전소명</td><td>광교중흥s클래스아파트</td></tr>
<tr><td>주소</td><td>경기 수원시 영통구 광교호수공원로 277</td></tr></table>
<div class="station_state_wrap"><table>
<tr><td>그룹</td><td>상태</td></tr>
<tr><td>A</td><td>충전중</td></tr>
<tr><td>B</td><td>충전가능</td></tr>
<tr><td>C</td><td>공사중</td></tr>
<tr><td>D</td><td>이상한값</td></tr>
</table></div>`;

test('그룹/상태/요약 파싱', () => {
  const r = parseDetail(JSON.stringify([{ id: html }]));
  assert.equal(r.stationName, '광교중흥s클래스아파트');
  assert.deepEqual(r.groups.map((g) => g.group), ['A', 'B', 'C', 'D']);
  assert.deepEqual(r.groups.map((g) => g.code), ['charging', 'available', 'maintenance', 'unknown']);
  assert.deepEqual(r.summary, { total: 4, available: 1, charging: 1, other: 2 });
});

test('잘못된 응답은 에러', () => {
  assert.throws(() => parseDetail('<script>alert(1)</script>'), /invalid_json/);
  assert.throws(() => parseDetail('[]'), /station_not_found/);
});
