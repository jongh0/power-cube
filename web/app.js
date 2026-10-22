// Vercel 배포 후 실제 주소로 교체 (예: https://power-cube-xxxx.vercel.app)
const API_URL = 'https://power-cube-ten.vercel.app/api/status';
const MIN_INTERVAL_MS = 30_000;

const $ = (id) => document.getElementById(id);
let lastFetch = 0;
let lastData = null;
let loading = false;

function render(data, stale) {
  $('name').textContent = data.stationName || '충전 상태';
  $('addr').textContent = data.address || '';

  const s = data.summary;
  $('summary').hidden = false;
  $('summary').textContent = `충전가능 ${s.available} / 전체 ${s.total}  (충전중 ${s.charging})`;

  const list = $('list');
  list.replaceChildren();
  for (const g of data.groups) {
    const li = document.createElement('li');
    li.className = `row ${g.code}`;
    const gs = document.createElement('span');
    gs.className = 'g';
    gs.textContent = g.group;
    const ss = document.createElement('span');
    ss.className = 's';
    ss.textContent = g.status;
    li.append(gs, ss);
    list.append(li);
  }

  const t = new Date(data.fetchedAt).toLocaleTimeString('ko-KR');
  $('updated').textContent = `마지막 갱신 ${t}${stale ? ' (오래된 데이터)' : ''}`;
}

function showMsg(text) {
  $('msg').hidden = !text;
  $('msg').textContent = text || '';
}

async function load() {
  if (loading) return;
  loading = true;
  $('refresh').disabled = true;
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '불러오지 못했어요');
    lastData = data;
    lastFetch = Date.now();
    showMsg('');
    render(data, false);
  } catch (e) {
    showMsg(`불러오지 못했어요. ${e.message || ''}`.trim());
    if (lastData) render(lastData, true);
    else $('updated').textContent = '불러오기 실패';
  } finally {
    loading = false;
    $('refresh').disabled = false;
  }
}

$('refresh').addEventListener('click', load);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastFetch > MIN_INTERVAL_MS) load();
});
load();
