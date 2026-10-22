import * as cheerio from 'cheerio';

export const STATUS_CODE = {
  '충전가능': 'available',
  '충전중': 'charging',
  '공사중': 'maintenance',
  '충전불가': 'unavailable',
};

/**
 * ev-line mapdatadetail 응답(JSON 문자열)을 파싱한다.
 * 응답 형태: [{ "id": "<div class=\"station_state_wrap\">...<table>...</table></div>" }]
 * 실패 시 Error 를 던진다.
 */
export function parseDetail(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('invalid_json');
  }
  const html = json?.[0]?.id;
  if (!html) throw new Error('station_not_found');

  const $ = cheerio.load(html);
  const groups = [];
  $('.station_state_wrap table tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length !== 2) return;
    const group = $(cells[0]).text().trim();
    const status = $(cells[1]).text().trim();
    if (!group || !status || group === '그룹' || status === '상태') return;
    groups.push({ group, status, code: STATUS_CODE[status] ?? 'unknown' });
  });

  let stationName = '';
  let address = '';
  $('tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length !== 2) return;
    const label = $(cells[0]).text().trim();
    const val = $(cells[1]).text().trim();
    if (label === '충전소명') stationName = val;
    if (label === '주소') address = val;
  });

  return { stationName, address, groups, summary: summarize(groups) };
}

export function summarize(groups) {
  const count = (c) => groups.filter((g) => g.code === c).length;
  const available = count('available');
  const charging = count('charging');
  return { total: groups.length, available, charging, other: groups.length - available - charging };
}
