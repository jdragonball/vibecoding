// 천문 계산 모듈 (Julian Day, 태양 경도, 24절기)

const JULIAN_CENTURY = 36525.0;
const JULIAN_DATE_J2000 = 2451545.0;
const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

// 줄리안 날짜 계산 (UTC 기준)
export function julianDay(date: Date): number {
  const utc = new Date(date.toISOString());
  let year = utc.getUTCFullYear();
  let month = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();
  const hour = utc.getUTCHours();
  const min = utc.getUTCMinutes();
  const sec = utc.getUTCSeconds();
  const ms = utc.getUTCMilliseconds();

  if (month <= 2) {
    year--;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  const dayFraction = (hour + min / 60.0 + (sec + ms / 1000) / 3600.0) / 24.0;

  return Math.floor(365.25 * (year + 4716)) +
         Math.floor(30.6001 * (month + 1)) +
         day + dayFraction + b - 1524.5;
}

// 각도 정규화 (0-360)
function normalizeAngle(angle: number): number {
  let value = angle % 360.0;
  if (value < 0) value += 360.0;
  return value;
}

// 태양 경도 계산 (NOAA 알고리즘)
export function solarLongitude(jd: number): number {
  const t = (jd - JULIAN_DATE_J2000) / JULIAN_CENTURY;

  const l0 = normalizeAngle(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const m = normalizeAngle(357.52911 + 35999.05029 * t - 0.0001537 * t * t + t * t * t / 24490000.0);
  const mRad = m * DEG2RAD;
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad) +
            (0.019993 - 0.000101 * t) * Math.sin(2 * mRad) +
            0.000289 * Math.sin(3 * mRad);

  const trueLongitude = l0 + c;

  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);

  return normalizeAngle(lambda);
}

// 균시차 (Equation of Time) - 분 단위
export function equationOfTime(jd: number): number {
  const t = (jd - JULIAN_DATE_J2000) / JULIAN_CENTURY;

  const epsilon0 = 23.0 + (26.0 + (21.448 - 46.8150 * t - 0.00059 * t * t + 0.001813 * t * t * t) / 60.0) / 60.0;
  const epsilon = epsilon0 + 0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG2RAD);

  const l0 = normalizeAngle(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const m = normalizeAngle(357.52911 + 35999.05029 * t - 0.0001537 * t * t + t * t * t / 24490000.0);
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;

  const l0Rad = l0 * DEG2RAD;
  const mRad = m * DEG2RAD;
  const epsilonRad = epsilon * DEG2RAD;

  let y = Math.tan(epsilonRad / 2.0);
  y *= y;

  const sin2L0 = Math.sin(2.0 * l0Rad);
  const sinM = Math.sin(mRad);
  const cos2L0 = Math.cos(2.0 * l0Rad);
  const sin4L0 = Math.sin(4.0 * l0Rad);
  const sin2M = Math.sin(2.0 * mRad);

  let eot = y * sin2L0 - 2.0 * e * sinM + 4.0 * e * y * sinM * cos2L0 -
            0.5 * y * y * sin4L0 - 1.25 * e * e * sin2M;
  eot = eot * RAD2DEG * 4.0;

  return eot;
}

// 24절기 정의
export type SolarTermKind = 'jie' | 'zhong';

export interface SolarTerm {
  index: number;
  name: string;
  nameKo: string;
  longitude: number;
  kind: SolarTermKind;
  monthIndex: number; // 1-12 (절기 기준 월)
}

export const SOLAR_TERMS: SolarTerm[] = [
  { index: 0, name: '立春', nameKo: '입춘', longitude: 315, kind: 'jie', monthIndex: 1 },
  { index: 1, name: '雨水', nameKo: '우수', longitude: 330, kind: 'zhong', monthIndex: 1 },
  { index: 2, name: '驚蟄', nameKo: '경칩', longitude: 345, kind: 'jie', monthIndex: 2 },
  { index: 3, name: '春分', nameKo: '춘분', longitude: 0, kind: 'zhong', monthIndex: 2 },
  { index: 4, name: '清明', nameKo: '청명', longitude: 15, kind: 'jie', monthIndex: 3 },
  { index: 5, name: '穀雨', nameKo: '곡우', longitude: 30, kind: 'zhong', monthIndex: 3 },
  { index: 6, name: '立夏', nameKo: '입하', longitude: 45, kind: 'jie', monthIndex: 4 },
  { index: 7, name: '小滿', nameKo: '소만', longitude: 60, kind: 'zhong', monthIndex: 4 },
  { index: 8, name: '芒種', nameKo: '망종', longitude: 75, kind: 'jie', monthIndex: 5 },
  { index: 9, name: '夏至', nameKo: '하지', longitude: 90, kind: 'zhong', monthIndex: 5 },
  { index: 10, name: '小暑', nameKo: '소서', longitude: 105, kind: 'jie', monthIndex: 6 },
  { index: 11, name: '大暑', nameKo: '대서', longitude: 120, kind: 'zhong', monthIndex: 6 },
  { index: 12, name: '立秋', nameKo: '입추', longitude: 135, kind: 'jie', monthIndex: 7 },
  { index: 13, name: '處暑', nameKo: '처서', longitude: 150, kind: 'zhong', monthIndex: 7 },
  { index: 14, name: '白露', nameKo: '백로', longitude: 165, kind: 'jie', monthIndex: 8 },
  { index: 15, name: '秋分', nameKo: '추분', longitude: 180, kind: 'zhong', monthIndex: 8 },
  { index: 16, name: '寒露', nameKo: '한로', longitude: 195, kind: 'jie', monthIndex: 9 },
  { index: 17, name: '霜降', nameKo: '상강', longitude: 210, kind: 'zhong', monthIndex: 9 },
  { index: 18, name: '立冬', nameKo: '입동', longitude: 225, kind: 'jie', monthIndex: 10 },
  { index: 19, name: '小雪', nameKo: '소설', longitude: 240, kind: 'zhong', monthIndex: 10 },
  { index: 20, name: '大雪', nameKo: '대설', longitude: 255, kind: 'jie', monthIndex: 11 },
  { index: 21, name: '冬至', nameKo: '동지', longitude: 270, kind: 'zhong', monthIndex: 11 },
  { index: 22, name: '小寒', nameKo: '소한', longitude: 285, kind: 'jie', monthIndex: 12 },
  { index: 23, name: '大寒', nameKo: '대한', longitude: 300, kind: 'zhong', monthIndex: 12 }
];

export interface SolarTermEvent {
  term: SolarTerm;
  time: Date;
}

// 각도 차이 계산 (-180 ~ 180)
function angleDifference(lambda: number, target: number): number {
  let diff = ((lambda - target + 540.0) % 360.0) - 180.0;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
}

// 순방향 각도 차이 (0 ~ 360)
function forwardLongitudeDelta(from: number, to: number): number {
  let diff = (to - from + 360.0) % 360.0;
  if (diff < 0) diff += 360.0;
  return diff;
}

// 다음 절기 인덱스 찾기
function nextTermIndex(lambda: number): number {
  let minDiff = Number.MAX_VALUE;
  let selected = 0;
  for (let i = 0; i < SOLAR_TERMS.length; i++) {
    const diff = forwardLongitudeDelta(lambda, SOLAR_TERMS[i].longitude);
    if (diff < minDiff) {
      minDiff = diff;
      selected = i;
    }
  }
  return selected;
}

// 특정 태양 경도에 도달하는 시간 찾기
function findNextLongitude(start: Date, target: number): Date {
  const jdStart = julianDay(start);
  let diff = angleDifference(solarLongitude(jdStart), target);

  // 뒤로 탐색하여 시작점 찾기
  let backward = new Date(start);
  let attempts = 0;
  while (diff > 0) {
    backward = new Date(backward.getTime() - 6 * 60 * 60 * 1000);
    diff = angleDifference(solarLongitude(julianDay(backward)), target);
    attempts++;
    if (attempts > 2000) throw new Error('Failed to bracket solar term (backward)');
  }

  // 앞으로 탐색하여 끝점 찾기
  let low = backward;
  let high = new Date(backward);
  diff = angleDifference(solarLongitude(julianDay(high)), target);
  while (diff <= 0) {
    high = new Date(high.getTime() + 6 * 60 * 60 * 1000);
    diff = angleDifference(solarLongitude(julianDay(high)), target);
    attempts++;
    if (attempts > 2000) throw new Error('Failed to bracket solar term (forward)');
  }

  // 이분 탐색
  while (high.getTime() - low.getTime() > 1000) {
    const mid = new Date(low.getTime() + (high.getTime() - low.getTime()) / 2);
    const diffMid = angleDifference(solarLongitude(julianDay(mid)), target);
    if (diffMid === 0) return mid;
    if (diffMid > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return new Date(low.getTime() + (high.getTime() - low.getTime()) / 2);
}

// 특정 연도의 절기 시리즈 계산
export function solarTermSeries(year: number): SolarTermEvent[] {
  const start = new Date(Date.UTC(year - 1, 10, 20)); // 전년 11월 20일부터

  const lambda = solarLongitude(julianDay(start));
  const startIndex = nextTermIndex(lambda);

  const events: SolarTermEvent[] = [];
  let currentStart = start;
  let idx = startIndex;

  while (events.length < 30) {
    const eventTime = findNextLongitude(currentStart, SOLAR_TERMS[idx].longitude);
    events.push({ term: SOLAR_TERMS[idx], time: eventTime });
    currentStart = new Date(eventTime.getTime() + 60000);
    idx = (idx + 1) % SOLAR_TERMS.length;
    if (eventTime.getUTCFullYear() > year + 1) break;
  }

  return events;
}

// 입춘 시간 찾기
export function findLichunTime(events: SolarTermEvent[]): Date | null {
  const lichun = events.find(e => e.term.name === '立春');
  return lichun?.time || null;
}

// 시간 정규화 (경도 보정)
export interface NormalizedTime {
  civil: Date;
  utc: Date;
  trueSolar: Date;
  localMeanSolar: Date;
  equationOfTimeMinutes: number;
  longitudeOffsetMinutes: number;
}

// 한국 표준시 경도 (동경 135도 기준이지만, 실제 서울 경도는 약 127도)
const KOREA_LONGITUDE = 127.0;
const KOREA_TZ_MERIDIAN = 135.0; // KST 기준 경도

export function normalizeTime(civil: Date, longitude: number = KOREA_LONGITUDE): NormalizedTime {
  const utc = new Date(civil.toISOString());
  const tzOffsetSeconds = civil.getTimezoneOffset() * -60;
  const tzMeridian = tzOffsetSeconds / 3600 * 15;

  const jd = julianDay(utc);
  const eot = equationOfTime(jd);

  const longitudeOffset = 4.0 * (longitude - tzMeridian); // 분 단위

  const localMeanSolar = new Date(civil.getTime() + longitudeOffset * 60 * 1000);
  const trueSolar = new Date(civil.getTime() + (longitudeOffset + eot) * 60 * 1000);

  return {
    civil,
    utc,
    trueSolar,
    localMeanSolar,
    equationOfTimeMinutes: eot,
    longitudeOffsetMinutes: longitudeOffset
  };
}
