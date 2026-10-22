// Vercel 배포 주소
const API_URL = 'https://power-cube-ten.vercel.app/api/status';
const AUTO_REFRESH_MIN_MS = 10_000; // 탭 복귀 시 최소 10초 지난 경우 자동 갱신
const MANUAL_THROTTLE_MS = 2_000;   // 새로고침 버튼 연타 방지 (2초)

// ⭐ 사용자가 자주 사용하는 충전기 그룹 목록
const FAVORITE_GROUPS = ['AG', 'AH', 'AN', 'AO', 'AQ', 'AR', 'AT'];
const FAVORITE_SET = new Set(FAVORITE_GROUPS);

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

  const groups = data.groups || [];
  const groupMap = new Map(groups.map((g) => [g.group, g]));

  // 1. ⭐ 자주 쓰는 충전기 섹션 렌더링
  const favGrid = $('fav-grid');
  favGrid.replaceChildren();
  let favAvailableCount = 0;

  for (const favName of FAVORITE_GROUPS) {
    const item = groupMap.get(favName) || { group: favName, status: '알 수 없음', code: 'unknown' };
    if (item.code === 'available') {
      favAvailableCount++;
    }

    const card = document.createElement('div');
    const isAvail = item.code === 'available';
    const isCharge = item.code === 'charging';
    card.className = `fav-card ${isAvail ? 'available' : isCharge ? 'charging' : 'other'}`;

    const topDiv = document.createElement('div');
    topDiv.className = 'fav-top';

    const gSpan = document.createElement('span');
    gSpan.className = 'fav-group';
    gSpan.textContent = item.group;

    const starSpan = document.createElement('span');
    starSpan.className = 'mini-star';
    starSpan.textContent = '★';

    topDiv.append(gSpan, starSpan);

    const statusDiv = document.createElement('div');
    statusDiv.className = 'fav-status';

    const dot = document.createElement('span');
    dot.className = 'status-dot';

    const sSpan = document.createElement('span');
    sSpan.textContent = item.status;

    statusDiv.append(dot, sSpan);
    card.append(topDiv, statusDiv);
    favGrid.append(card);
  }

  $('fav-section').hidden = false;
  $('fav-summary').textContent = `${favAvailableCount} / ${FAVORITE_GROUPS.length} 가능`;

  // 2. 전체 목록 렌더링
  const list = $('list');
  list.replaceChildren();
  $('total-count-badge').textContent = `${groups.length}개`;

  for (const g of groups) {
    const isFav = FAVORITE_SET.has(g.group);
    const li = document.createElement('li');
    li.className = `row ${g.code} ${isFav ? 'is-fav' : ''}`;

    const gWrap = document.createElement('span');
    gWrap.className = 'g-wrap';

    const gs = document.createElement('span');
    gs.className = 'g';
    gs.textContent = g.group;
    gWrap.append(gs);

    if (isFav) {
      const star = document.createElement('span');
      star.className = 'star-badge';
      star.textContent = '★';
      gWrap.append(star);
    }

    const ss = document.createElement('span');
    ss.className = 's';
    ss.textContent = g.status;

    li.append(gWrap, ss);
    list.append(li);
  }

  const dateObj = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
  const timeStr = dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('updated').textContent = `갱신: ${timeStr}${stale ? ' (지연)' : ''}`;
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
    // 타임스탬프 쿼리로 브라우저 캐시를 무효화 (Simple Request로 Preflight 없이 즉시 호출)
    const url = `${API_URL}?_t=${now}`;
    const res = await fetch(url);

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
