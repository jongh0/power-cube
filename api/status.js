import iconv from 'iconv-lite';
import { parseDetail } from '../lib/parse.js';

const BASE = 'https://www.ev-line.co.kr';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 함수 인스턴스가 재사용되는 동안 유지되는 세션 쿠키 (name -> value)
let cookieJar = {};

const cookieHeader = () =>
  Object.entries(cookieJar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

function mergeCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) cookieJar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
}

const decode = async (res) => iconv.decode(Buffer.from(await res.arrayBuffer()), 'euc-kr');

async function login(id, pwd) {
  cookieJar = {};
  const first = await fetch(`${BASE}/login/login.asp`, { headers: { 'User-Agent': UA } });
  mergeCookies(first);

  const res = await fetch(`${BASE}/login/login_ok.asp`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${BASE}/login/login.asp`,
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({ user_id: id, user_pwd: pwd }),
  });
  mergeCookies(res);
  const body = await decode(res);

  if (res.status === 302 || body.includes('개체 이동됨')) return true;
  // alert 가 있으면 로그인 실패. 계정 잠금 방지를 위해 재시도하지 않는다.
  return false;
}

async function fetchDetail(stationId) {
  const res = await fetch(`${BASE}/charge/mapdatadetail_202008.asp?id=${encodeURIComponent(stationId)}`, {
    headers: { 'User-Agent': UA, Referer: `${BASE}/charge/serch.asp`, Cookie: cookieHeader() },
  });
  return decode(res);
}

const needsLogin = (text) => text.includes('자산입니다') || text.includes('login') || text.length < 50;

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN;
  if (origin && (origin === allowed || /^http:\/\/localhost(:\d+)?$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { USER_ID, USER_PWD } = process.env;
  const stationId = process.env.STATION_ID || '165170000001';
  if (!USER_ID || !USER_PWD) {
    return res.status(500).json({ error: 'missing_env', message: 'USER_ID/USER_PWD 환경변수를 설정하세요.' });
  }

  try {
    let text = await fetchDetail(stationId);
    if (needsLogin(text)) {
      if (!(await login(USER_ID, USER_PWD))) {
        return res.status(401).json({ error: 'login_failed', message: '로그인에 실패했습니다. 계정 정보를 확인하세요.' });
      }
      text = await fetchDetail(stationId);
      if (needsLogin(text)) {
        return res.status(502).json({ error: 'upstream_blocked', message: '데이터 조회가 거부되었습니다.' });
      }
    }

    let data;
    try {
      data = parseDetail(text);
    } catch (e) {
      return res.status(502).json({ error: e.message, message: '응답을 해석하지 못했습니다.' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ ...data, fetchedAt: new Date().toISOString() });
  } catch (e) {
    console.error('status error:', e.message);
    return res.status(502).json({ error: 'upstream_error', message: '서버 연결에 실패했습니다.' });
  }
}
