// 대운, 세운, 월운 계산 (60saju 로직 기반)

import {
  type StemBranch,
  type Element,
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
  ELEMENT_KO,
  STEM_ELEMENTS,
  BRANCH_HIDDEN_STEMS,
  ELEMENT_SHENG,
  ELEMENT_KE
} from './ganji';

import { type SolarTermEvent, findLichunTime } from './astro';
import { type SajuResult, type Pillar } from './calculator';

// ============ 십성(十神) 계산 ============

export type TenGod = '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';

const TEN_GOD_LABELS: TenGod[] = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

// 오행 관계 계산
function elementRelation(dayElement: Element, targetElement: Element): 'same' | 'sheng' | 'ke' | 'reverse_sheng' | 'reverse_ke' {
  if (dayElement === targetElement) return 'same';
  if (ELEMENT_SHENG[dayElement] === targetElement) return 'sheng';      // 내가 생
  if (ELEMENT_KE[dayElement] === targetElement) return 'ke';            // 내가 극
  if (ELEMENT_SHENG[targetElement] === dayElement) return 'reverse_sheng';  // 나를 생
  if (ELEMENT_KE[targetElement] === dayElement) return 'reverse_ke';        // 나를 극
  return 'same';
}

// 십성 계산 (일간 기준)
export function getTenGod(dayStemIndex: number, targetStemIndex: number): TenGod {
  const dayElement = getStemElement(dayStemIndex);
  const targetElement = getStemElement(targetStemIndex);
  const dayYang = isYangStem(dayStemIndex);
  const targetYang = isYangStem(targetStemIndex);
  const samePolarity = dayYang === targetYang;

  const relation = elementRelation(dayElement, targetElement);

  switch (relation) {
    case 'same':
      return samePolarity ? '비견' : '겁재';
    case 'sheng':  // 내가 생 (식상)
      return samePolarity ? '식신' : '상관';
    case 'ke':     // 내가 극 (재성)
      return samePolarity ? '편재' : '정재';
    case 'reverse_ke':  // 나를 극 (관성)
      return samePolarity ? '편관' : '정관';
    case 'reverse_sheng':  // 나를 생 (인성)
      return samePolarity ? '편인' : '정인';
    default:
      return '비견';
  }
}

// 지지의 주 지장간으로 십성 계산
export function getBranchTenGod(dayStemIndex: number, branchIndex: number): TenGod {
  const hiddenStems = BRANCH_HIDDEN_STEMS[branchIndex];
  // 가장 비중 높은 지장간 선택
  let mainStem = hiddenStems[0];
  for (const stem of hiddenStems) {
    if (stem[1] > mainStem[1]) mainStem = stem;
  }
  return getTenGod(dayStemIndex, mainStem[0]);
}

// ============ 대운(大運) 계산 ============

export interface DaeyunPeriod {
  index: number;          // 대운 순서 (1-12)
  stemIndex: number;
  branchIndex: number;
  pillar: string;         // 간지 (한자)
  pillarKo: string;       // 간지 (한글)
  stemElement: Element;
  branchElement: Element;
  tenGod: TenGod;         // 천간 십성
  branchTenGod: TenGod;   // 지지 십성
  startAge: number;       // 시작 나이
  endAge: number;         // 종료 나이
  direction: 1 | -1;      // 순행(1) / 역행(-1)
}

// 대운 방향 결정 (순행/역행)
function daeyunDirection(gender: 'male' | 'female', yearStemIndex: number): 1 | -1 {
  const yang = isYangStem(yearStemIndex);
  if (gender === 'male') {
    return yang ? 1 : -1;  // 남자: 양간=순행, 음간=역행
  } else {
    return yang ? -1 : 1;  // 여자: 양간=역행, 음간=순행
  }
}

// 대운 시작 나이 계산 (3일 = 1년)
function calculateDaeyunStartAge(
  birthTime: Date,
  events: SolarTermEvent[],
  direction: 1 | -1
): number {
  // 절기(節氣)만 필터링
  const jieEvents = events
    .filter(e => e.term.kind === 'jie')
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  let targetEvent: SolarTermEvent | null = null;

  if (direction === 1) {
    // 순행: 다음 절기
    for (const event of jieEvents) {
      if (event.time > birthTime) {
        targetEvent = event;
        break;
      }
    }
  } else {
    // 역행: 이전 절기
    for (let i = jieEvents.length - 1; i >= 0; i--) {
      if (jieEvents[i].time <= birthTime) {
        targetEvent = jieEvents[i];
        break;
      }
    }
  }

  if (!targetEvent) {
    return 3; // 기본값
  }

  // 일수 차이 계산
  const diffMs = Math.abs(targetEvent.time.getTime() - birthTime.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 3일 = 1년
  const startAge = Math.round(diffDays / 3);
  return Math.max(1, startAge);
}

// 대운 계산
export function calculateDaeyun(
  saju: SajuResult,
  events: SolarTermEvent[]
): DaeyunPeriod[] {
  const { monthPillar, yearPillar, dayPillar, gender, birthInfo } = saju;
  const direction = daeyunDirection(gender, yearPillar.stemIndex);

  const birthTime = new Date(
    birthInfo.year,
    birthInfo.month - 1,
    birthInfo.day,
    birthInfo.hour,
    birthInfo.minute || 0
  );

  const startAge = calculateDaeyunStartAge(birthTime, events, direction);

  const daeyunList: DaeyunPeriod[] = [];

  for (let i = 0; i < 12; i++) {
    // 월주에서 방향에 따라 이동
    const stemIndex = ((monthPillar.stemIndex + direction * (i + 1)) % 10 + 10) % 10;
    const branchIndex = ((monthPillar.branchIndex + direction * (i + 1)) % 12 + 12) % 12;

    const sb = createStemBranch(stemIndex, branchIndex);

    daeyunList.push({
      index: i + 1,
      stemIndex,
      branchIndex,
      pillar: stemBranchToString(sb),
      pillarKo: stemBranchToKorean(sb),
      stemElement: getStemElement(stemIndex),
      branchElement: getBranchElement(branchIndex),
      tenGod: getTenGod(dayPillar.stemIndex, stemIndex),
      branchTenGod: getBranchTenGod(dayPillar.stemIndex, branchIndex),
      startAge: startAge + i * 10,
      endAge: startAge + (i + 1) * 10,
      direction
    });
  }

  return daeyunList;
}

// 현재 대운 찾기
export function getCurrentDaeyun(daeyunList: DaeyunPeriod[], age: number): DaeyunPeriod | null {
  for (const daeyun of daeyunList) {
    if (age >= daeyun.startAge && age < daeyun.endAge) {
      return daeyun;
    }
  }
  return daeyunList[0] || null;
}

// ============ 세운(歲運) 계산 ============

export interface YearLuck {
  year: number;
  age: number;
  stemIndex: number;
  branchIndex: number;
  pillar: string;
  pillarKo: string;
  stemElement: Element;
  branchElement: Element;
  tenGod: TenGod;
  branchTenGod: TenGod;
}

// 특정 연도의 간지 계산
function getYearStemBranch(year: number): StemBranch {
  const stem = ((year - 4) % 10 + 10) % 10;
  const branch = ((year - 4) % 12 + 12) % 12;
  return createStemBranch(stem, branch);
}

// 세운 계산
export function calculateYearLuck(
  year: number,
  age: number,
  dayStemIndex: number
): YearLuck {
  const sb = getYearStemBranch(year);

  return {
    year,
    age,
    stemIndex: sb.stemIndex,
    branchIndex: sb.branchIndex,
    pillar: stemBranchToString(sb),
    pillarKo: stemBranchToKorean(sb),
    stemElement: getStemElement(sb.stemIndex),
    branchElement: getBranchElement(sb.branchIndex),
    tenGod: getTenGod(dayStemIndex, sb.stemIndex),
    branchTenGod: getBranchTenGod(dayStemIndex, sb.branchIndex)
  };
}

// ============ 월운(月運) 계산 ============

export interface MonthLuck {
  month: number;
  stemIndex: number;
  branchIndex: number;
  pillar: string;
  pillarKo: string;
  stemElement: Element;
  branchElement: Element;
  tenGod: TenGod;
  branchTenGod: TenGod;
}

// 연간에 따른 월간 시작점
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

// 월운 계산
export function calculateMonthLuck(
  year: number,
  month: number,  // 1-12
  dayStemIndex: number
): MonthLuck {
  const yearSb = getYearStemBranch(year);
  const monthStemStart = monthStemStartByYearStem(yearSb.stemIndex);

  // 월지: 1월->인(2), 2월->묘(3), ... 12월->축(1)
  const branchIndex = (month + 1) % 12;
  // 월간: 시작점 + 월 오프셋
  const stemIndex = (monthStemStart + month - 1) % 10;

  const sb = createStemBranch(stemIndex, branchIndex);

  return {
    month,
    stemIndex: sb.stemIndex,
    branchIndex: sb.branchIndex,
    pillar: stemBranchToString(sb),
    pillarKo: stemBranchToKorean(sb),
    stemElement: getStemElement(sb.stemIndex),
    branchElement: getBranchElement(sb.branchIndex),
    tenGod: getTenGod(dayStemIndex, sb.stemIndex),
    branchTenGod: getBranchTenGod(dayStemIndex, sb.branchIndex)
  };
}

// ============ 현재 운세 종합 ============

export interface CurrentLuck {
  daeyun: DaeyunPeriod | null;
  yearLuck: YearLuck;
  monthLuck: MonthLuck;
  age: number;
  summary: string;
}

// 나이 계산 (만 나이)
function calculateAge(birthYear: number, birthMonth: number, birthDay: number): number {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() + 1 - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return Math.max(0, age);
}

// 현재 운세 종합 계산
export function calculateCurrentLuck(
  saju: SajuResult,
  events: SolarTermEvent[]
): CurrentLuck {
  const { dayPillar, birthInfo } = saju;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 나이 계산
  const age = calculateAge(birthInfo.year, birthInfo.month, birthInfo.day);

  // 대운 계산
  const daeyunList = calculateDaeyun(saju, events);
  const currentDaeyun = getCurrentDaeyun(daeyunList, age);

  // 세운 계산
  const yearLuck = calculateYearLuck(currentYear, age, dayPillar.stemIndex);

  // 월운 계산
  const monthLuck = calculateMonthLuck(currentYear, currentMonth, dayPillar.stemIndex);

  // 요약 생성
  const summary = generateLuckSummary(currentDaeyun, yearLuck, monthLuck, age);

  return {
    daeyun: currentDaeyun,
    yearLuck,
    monthLuck,
    age,
    summary
  };
}

// 운세 요약 문자열 생성
function generateLuckSummary(
  daeyun: DaeyunPeriod | null,
  yearLuck: YearLuck,
  monthLuck: MonthLuck,
  age: number
): string {
  const parts: string[] = [];

  if (daeyun) {
    parts.push(`현재 대운 (${daeyun.startAge}~${daeyun.endAge}세): ${daeyun.pillar} - ${daeyun.tenGod}운`);
  }

  parts.push(`올해 세운 (${yearLuck.year}): ${yearLuck.pillar} - ${yearLuck.tenGod}의 해`);
  parts.push(`이번 달 (${monthLuck.month}월): ${monthLuck.pillar} - ${monthLuck.tenGod}월`);
  parts.push(`현재 나이: 만 ${age}세`);

  return parts.join('\n');
}

// ============ 용신 관계 분석 ============

export interface LuckAnalysis {
  currentLuck: CurrentLuck;
  yongshinSupport: {
    daeyun: 'support' | 'neutral' | 'harm';
    yearLuck: 'support' | 'neutral' | 'harm';
    monthLuck: 'support' | 'neutral' | 'harm';
  };
  dominantElement: Element;
  weakElement: Element;
  recommendation: string;
}

// 용신/기신 관계 판단
function analyzeElementSupport(
  targetElement: Element,
  yongshinElement: Element | null,
  kishinElement: Element | null
): 'support' | 'neutral' | 'harm' {
  if (yongshinElement && targetElement === yongshinElement) return 'support';
  if (yongshinElement && ELEMENT_SHENG[targetElement] === yongshinElement) return 'support';
  if (kishinElement && targetElement === kishinElement) return 'harm';
  if (kishinElement && ELEMENT_SHENG[targetElement] === kishinElement) return 'harm';
  return 'neutral';
}

// 오행별 추천 정보
const ELEMENT_RECOMMENDATIONS: Record<Element, { food: string; direction: string; color: string }> = {
  wood: { food: '푸른 채소, 나물, 신맛 음식', direction: '동쪽', color: '초록색' },
  fire: { food: '쓴맛 음식, 붉은 채소', direction: '남쪽', color: '빨간색' },
  earth: { food: '단맛 음식, 곡류, 황색 식품', direction: '중앙', color: '노란색' },
  metal: { food: '매운 음식, 흰 채소, 무/배', direction: '서쪽', color: '흰색' },
  water: { food: '짠맛 음식, 해산물, 검정콩', direction: '북쪽', color: '검정색' }
};

// 현재 운의 종합 분석
export function analyzeLuck(
  saju: SajuResult,
  events: SolarTermEvent[],
  yongshinElement: Element | null,
  kishinElement: Element | null
): LuckAnalysis {
  const currentLuck = calculateCurrentLuck(saju, events);
  const { daeyun, yearLuck, monthLuck } = currentLuck;

  // 용신 관계 분석
  const yongshinSupport = {
    daeyun: daeyun
      ? analyzeElementSupport(daeyun.stemElement, yongshinElement, kishinElement)
      : 'neutral' as const,
    yearLuck: analyzeElementSupport(yearLuck.stemElement, yongshinElement, kishinElement),
    monthLuck: analyzeElementSupport(monthLuck.stemElement, yongshinElement, kishinElement)
  };

  // 현재 강한 오행 파악
  const elementCount: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  if (daeyun) {
    elementCount[daeyun.stemElement]++;
    elementCount[daeyun.branchElement]++;
  }
  elementCount[yearLuck.stemElement]++;
  elementCount[yearLuck.branchElement]++;
  elementCount[monthLuck.stemElement]++;
  elementCount[monthLuck.branchElement]++;

  const sortedElements = Object.entries(elementCount)
    .sort(([, a], [, b]) => b - a) as [Element, number][];

  const dominantElement = sortedElements[0][0];
  const weakElement = sortedElements[sortedElements.length - 1][0];

  // 추천 생성
  let recommendation = '';
  if (yongshinElement) {
    const rec = ELEMENT_RECOMMENDATIONS[yongshinElement];
    recommendation = `용신(${ELEMENT_KO[yongshinElement]}) 보강 추천: ${rec.food} / ${rec.direction} 방향 / ${rec.color}`;
  } else {
    const rec = ELEMENT_RECOMMENDATIONS[weakElement];
    recommendation = `부족한 기운(${ELEMENT_KO[weakElement]}) 보강: ${rec.food} / ${rec.direction} 방향`;
  }

  return {
    currentLuck,
    yongshinSupport,
    dominantElement,
    weakElement,
    recommendation
  };
}

// AI 컨텍스트용 간략 요약 생성
export function generateLuckContextForAI(
  analysis: LuckAnalysis,
  yongshinElement: Element | null
): string {
  const { currentLuck, yongshinSupport, dominantElement, weakElement, recommendation } = analysis;
  const { daeyun, yearLuck, monthLuck, age } = currentLuck;

  const lines: string[] = [];
  lines.push(`[현재 운세 흐름] (만 ${age}세)`);

  if (daeyun) {
    const support = yongshinSupport.daeyun === 'support' ? '좋음' :
                    yongshinSupport.daeyun === 'harm' ? '주의' : '보통';
    lines.push(`- 대운 (${daeyun.startAge}~${daeyun.endAge}세): ${daeyun.pillar}(${ELEMENT_KO[daeyun.stemElement]}) - ${daeyun.tenGod}운 [${support}]`);
  }

  const yearSupport = yongshinSupport.yearLuck === 'support' ? '좋음' :
                      yongshinSupport.yearLuck === 'harm' ? '주의' : '보통';
  lines.push(`- 세운 (${yearLuck.year}년): ${yearLuck.pillar}(${ELEMENT_KO[yearLuck.stemElement]}) - ${yearLuck.tenGod}의 해 [${yearSupport}]`);

  const monthSupport = yongshinSupport.monthLuck === 'support' ? '좋음' :
                       yongshinSupport.monthLuck === 'harm' ? '주의' : '보통';
  lines.push(`- 월운 (${monthLuck.month}월): ${monthLuck.pillar}(${ELEMENT_KO[monthLuck.stemElement]}) - ${monthLuck.tenGod}월 [${monthSupport}]`);

  lines.push(`- 현재 강한 기운: ${ELEMENT_KO[dominantElement]} / 약한 기운: ${ELEMENT_KO[weakElement]}`);
  lines.push(`- ${recommendation}`);

  return lines.join('\n');
}
