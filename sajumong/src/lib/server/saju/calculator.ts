// 사주 계산 엔진 (60saju 로직 기반)

import {
  type StemBranch,
  createStemBranch,
  stemBranchToString,
  stemBranchToKorean,
  getStemElement,
  getBranchElement,
  isYangStem,
  HEAVENLY_STEMS,
  HEAVENLY_STEMS_KO,
  EARTHLY_BRANCHES,
  EARTHLY_BRANCHES_KO,
  ANIMALS,
  ELEMENT_KO,
  type Element
} from './ganji';

import {
  julianDay,
  solarTermSeries,
  findLichunTime,
  normalizeTime,
  type SolarTermEvent
} from './astro';

export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender: 'male' | 'female';
  isLunar?: boolean;
}

export interface Pillar {
  stem: string;        // 천간 (한자)
  branch: string;      // 지지 (한자)
  stemKo: string;      // 천간 (한글)
  branchKo: string;    // 지지 (한글)
  fullName: string;    // 간지 (한자)
  fullNameKo: string;  // 간지 (한글)
  stemElement: Element;
  branchElement: Element;
  stemIndex: number;
  branchIndex: number;
}

export interface SajuResult {
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar;
  animal: string;
  gender: 'male' | 'female';
  birthInfo: BirthInfo;
  ohaengCount: Record<string, number>;
  solarTerms?: SolarTermEvent[];
}

// StemBranch를 Pillar로 변환
function toPillar(sb: StemBranch): Pillar {
  return {
    stem: HEAVENLY_STEMS[sb.stemIndex],
    branch: EARTHLY_BRANCHES[sb.branchIndex],
    stemKo: HEAVENLY_STEMS_KO[sb.stemIndex],
    branchKo: EARTHLY_BRANCHES_KO[sb.branchIndex],
    fullName: stemBranchToString(sb),
    fullNameKo: stemBranchToKorean(sb),
    stemElement: getStemElement(sb.stemIndex),
    branchElement: getBranchElement(sb.branchIndex),
    stemIndex: sb.stemIndex,
    branchIndex: sb.branchIndex
  };
}

// 년주 계산 (입춘 기준)
function computeYearPillar(workingTime: Date, events: SolarTermEvent[]): StemBranch {
  let year = workingTime.getFullYear();

  // 입춘 이전이면 전년도로 계산
  const lichunTime = findLichunTime(events);
  if (lichunTime && workingTime < lichunTime) {
    year = year - 1;
  }

  const stem = ((year - 4) % 10 + 10) % 10;
  const branch = ((year - 4) % 12 + 12) % 12;

  return createStemBranch(stem, branch);
}

// 월간 시작 인덱스 (년간에 따라)
function monthStemStartByYearStem(yearStem: number): number {
  switch (yearStem % 10) {
    case 0: case 5: return 2;  // 甲/己년 -> 丙
    case 1: case 6: return 4;  // 乙/庚년 -> 戊
    case 2: case 7: return 6;  // 丙/辛년 -> 庚
    case 3: case 8: return 8;  // 丁/壬년 -> 壬
    case 4: case 9: return 0;  // 戊/癸년 -> 甲
    default: return 2;
  }
}

// 월주 계산 (절기 기준)
function computeMonthPillar(workingTime: Date, events: SolarTermEvent[], yearStem: number): StemBranch {
  // 節氣만 필터링 (jie)
  const boundaries = events
    .filter(e => e.term.kind === 'jie')
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  if (boundaries.length < 13) {
    throw new Error('Solar term series insufficient');
  }

  // 현재 시간이 속한 월 찾기
  let monthIndex = 12; // 기본값 (첫 절기 이전)
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (workingTime >= boundaries[i].time) {
      monthIndex = boundaries[i].term.monthIndex;
      break;
    }
  }

  // 지지: 월 1 -> 인(寅, index 2)
  const branchIndex = (monthIndex + 1) % 12;

  // 천간: 년간에 따른 월간 계산
  const monthStemStart = monthStemStartByYearStem(yearStem);
  const stemIndex = (monthStemStart + monthIndex - 1 + 10) % 10;

  return createStemBranch(stemIndex, branchIndex);
}

// 일주 계산 (줄리안 날짜 기반)
function computeDayPillar(workingTime: Date): StemBranch {
  const local = new Date(Date.UTC(
    workingTime.getFullYear(),
    workingTime.getMonth(),
    workingTime.getDate(),
    workingTime.getHours(),
    workingTime.getMinutes(),
    workingTime.getSeconds()
  ));

  const jd = julianDay(local);
  const dayNumber = Math.floor(jd + 0.5);
  const cycle = ((dayNumber + 49) % 60 + 60) % 60;

  const stem = cycle % 10;
  const branch = cycle % 12;

  return createStemBranch(stem, branch);
}

// 시간을 지지 인덱스로 변환
function hourBranchIndex(hour: number): number {
  if (hour === 23 || hour < 1) return 0;  // 子
  if (hour < 3) return 1;   // 丑
  if (hour < 5) return 2;   // 寅
  if (hour < 7) return 3;   // 卯
  if (hour < 9) return 4;   // 辰
  if (hour < 11) return 5;  // 巳
  if (hour < 13) return 6;  // 午
  if (hour < 15) return 7;  // 未
  if (hour < 17) return 8;  // 申
  if (hour < 19) return 9;  // 酉
  if (hour < 21) return 10; // 戌
  return 11;                // 亥
}

// 시주 계산
function computeHourPillar(workingTime: Date, dayPillar: StemBranch): StemBranch {
  const hour = workingTime.getHours();
  const hb = hourBranchIndex(hour);
  const stem = (dayPillar.stemIndex * 2 + hb) % 10;
  return createStemBranch(stem, hb);
}

// 띠 계산
function computeAnimal(year: number, events: SolarTermEvent[]): string {
  const lichunTime = findLichunTime(events);
  let adjustedYear = year;

  // 입춘 기준 년도 조정 (간략화)
  const now = new Date(year, 1, 1);
  if (lichunTime && now < lichunTime) {
    adjustedYear = year - 1;
  }

  const animalIndex = ((adjustedYear - 4) % 12 + 12) % 12;
  return ANIMALS[animalIndex];
}

// 오행 분포 계산
function calculateOhaengCount(pillars: Pillar[]): Record<string, number> {
  const count: Record<string, number> = {
    '목': 0, '화': 0, '토': 0, '금': 0, '수': 0
  };

  for (const pillar of pillars) {
    count[ELEMENT_KO[pillar.stemElement]]++;
    count[ELEMENT_KO[pillar.branchElement]]++;
  }

  return count;
}

// 메인 사주 계산 함수
export function calculateSaju(birthInfo: BirthInfo): SajuResult {
  const { year, month, day, hour, gender } = birthInfo;

  // 생년월일시를 Date 객체로 변환
  const civilTime = new Date(year, month - 1, day, hour, birthInfo.minute || 0);

  // 시간 정규화 (경도 보정 - 한국 기준)
  const normalized = normalizeTime(civilTime, 127.0);
  const workingTime = normalized.localMeanSolar;

  // 절기 시리즈 계산
  const events = solarTermSeries(year);

  // 사주 계산
  const yearPillarSB = computeYearPillar(workingTime, events);
  const monthPillarSB = computeMonthPillar(workingTime, events, yearPillarSB.stemIndex);
  const dayPillarSB = computeDayPillar(workingTime);
  const hourPillarSB = computeHourPillar(workingTime, dayPillarSB);

  // Pillar로 변환
  const yearPillar = toPillar(yearPillarSB);
  const monthPillar = toPillar(monthPillarSB);
  const dayPillar = toPillar(dayPillarSB);
  const hourPillar = toPillar(hourPillarSB);

  // 띠 계산 (년주의 지지에서 가져옴)
  const animal = ANIMALS[yearPillarSB.branchIndex];

  // 오행 분포
  const ohaengCount = calculateOhaengCount([yearPillar, monthPillar, dayPillar, hourPillar]);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    animal,
    gender,
    birthInfo,
    ohaengCount,
    solarTerms: events
  };
}

// 사주를 문자열로 변환 (한자)
export function sajuToString(saju: SajuResult): string {
  return `${saju.yearPillar.fullName} ${saju.monthPillar.fullName} ${saju.dayPillar.fullName} ${saju.hourPillar.fullName}`;
}

// 사주를 문자열로 변환 (한글)
export function sajuToKorean(saju: SajuResult): string {
  return `${saju.yearPillar.fullNameKo} ${saju.monthPillar.fullNameKo} ${saju.dayPillar.fullNameKo} ${saju.hourPillar.fullNameKo}`;
}

// 사주 요약 정보 생성
export function generateSajuSummary(saju: SajuResult): string {
  const { yearPillar, monthPillar, dayPillar, hourPillar, animal, ohaengCount, birthInfo } = saju;

  const dominantOhaeng = Object.entries(ohaengCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([ohaeng]) => ohaeng)
    .join(', ');

  const weakOhaeng = Object.entries(ohaengCount)
    .filter(([, count]) => count === 0)
    .map(([ohaeng]) => ohaeng);

  return `
사주팔자: ${sajuToString(saju)}
생년월일시: ${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${birthInfo.hour}시
성별: ${birthInfo.gender === 'male' ? '남' : '여'}
띠: ${animal}띠

[사주 구성]
년주(年柱): ${yearPillar.fullName} (${ELEMENT_KO[yearPillar.stemElement]}${ELEMENT_KO[yearPillar.branchElement]})
월주(月柱): ${monthPillar.fullName} (${ELEMENT_KO[monthPillar.stemElement]}${ELEMENT_KO[monthPillar.branchElement]})
일주(日柱): ${dayPillar.fullName} (${ELEMENT_KO[dayPillar.stemElement]}${ELEMENT_KO[dayPillar.branchElement]}) - 일간: ${dayPillar.stem}
시주(時柱): ${hourPillar.fullName} (${ELEMENT_KO[hourPillar.stemElement]}${ELEMENT_KO[hourPillar.branchElement]})

[오행 분포]
목(木): ${ohaengCount['목']}개
화(火): ${ohaengCount['화']}개
토(土): ${ohaengCount['토']}개
금(金): ${ohaengCount['금']}개
수(水): ${ohaengCount['수']}개

강한 오행: ${dominantOhaeng}
${weakOhaeng.length > 0 ? `부족한 오행: ${weakOhaeng.join(', ')}` : '모든 오행이 균형있게 분포'}
`.trim();
}
