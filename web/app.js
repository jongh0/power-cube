// Vercel 배포 주소
const API_URL = 'https://power-cube-ten.vercel.app/api/status';
const AUTO_REFRESH_MIN_MS = 10_000; // 탭 복귀 시 최소 10초 지난 경우 자동 갱신
const MANUAL_THROTTLE_MS = 2_000;   // 새로고침 버튼 연타 방지 (2초)

const $ = (id) => document.getElementById(id);
let lastFetchTime = 0;
let lastData = null;
let isLoading = false;

function render(data, stale = false) {
  $('name').textContent = data.stationName || '충전 상태';
  $('addr').textContent = data.address || '';

  const s = data.summary || { available: 0, charging: 0, total: 0 };
  $('summary-card').hidden = false;
  $('stat-available').textContent = s.available;
  $('stat-charging').textContent = s.charging;
  $('stat-total').textContent = s.total;

  const list = $('list');
  list.replaceChildren();

  const groups = data.groups || [];
  for (const g of groups) {
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

  const dateObj = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
  const timeStr = dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('updated').textContent = `마지막 갱신: ${timeStr}${stale ? ' (오래된 데이터)' : ''}`;
}

function showMsg(text) {
  const el = $('msg');
  el.hidden = !text;
  el.textContent = text || '';
}

async function loadData(isManual = false) {
  const now = Date.now();
  if (isLoading) return;
  if (isManual && now - lastFetchTime < MANUAL_THROTTLE_MS) return;

  isLoading = true;
  const btn = $('fab-refresh');
  const btnText = btn.querySelector('.fab-text');
  btn.classList.add('loading');
  btn.disabled = true;
  if (btnText) btnText.textContent = '조회 중…';

  try {
    // 캐시 방지를 위해 타임스탬프 쿼리 및 no-cache 헤더 전송
    const url = `${API_URL}?_t=${now}`;
    const res = await fetch(url, {
      cache: 'no-cache',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `서버 응답 오류 (${res.status})`);
    }

    const data = await res.json();
    lastData = data;
    lastFetchTime = Date.now();
    showMsg('');
    render(data, false);
  } catch (e) {
    console.error('데이터 조회 실패:', e);
    showMsg(`불러오지 못했습니다: ${e.message}`);
    if (lastData) {
      render(lastData, true);
    } else {
      $('updated').textContent = '데이터를 가져올 수 없습니다.';
    }
  } finally {
    isLoading = false;
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btnText) btnText.textContent = '새로고침';
  }
}

// 이벤트 리스너 설정
$('fab-refresh').addEventListener('click', () => loadData(true));

// 화면으로 돌아왔을 때 10초 이상 지났으면 자동 새로고침
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastFetchTime > AUTO_REFRESH_MIN_MS) {
    loadData(false);
  }
});

// 첫 실행
loadData(false);
