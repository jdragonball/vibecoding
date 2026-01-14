import type { SajuResult } from './calculator';
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  getStemElement,
  getBranchElement,
  ELEMENT_KO,
  ELEMENT_SHENG,
  ELEMENT_KE,
  type Element
} from './ganji';

// 특정 날짜의 일진 계산
export function getPillarForDate(date: Date): { stem: string; branch: string; fullName: string; stemElement: Element; branchElement: Element } {
  // 기준일: 1900년 1월 1일 = 갑자일 (甲子日)
  const baseDate = new Date(1900, 0, 1);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  // 1900-01-01은 갑자(甲子), stemIndex=0, branchIndex=0
  let dayIndex = diffDays % 60;
  if (dayIndex < 0) dayIndex += 60;

  const stemIndex = dayIndex % 10;
  const branchIndex = dayIndex % 12;

  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];

  return {
    stem,
    branch,
    fullName: stem + branch,
    stemElement: getStemElement(stemIndex),
    branchElement: getBranchElement(branchIndex)
  };
}

// 오늘의 일진 계산
export function getTodayPillar(): { stem: string; branch: string; fullName: string; stemElement: Element; branchElement: Element } {
  return getPillarForDate(new Date());
}

// 오행 간의 관계 분석
function analyzeElementRelation(myElement: Element, targetElement: Element): string {
  if (myElement === targetElement) {
    return 'same'; // 비견
  }
  if (ELEMENT_SHENG[targetElement] === myElement) {
    return 'supportMe'; // 나를 생해주는
  }
  if (ELEMENT_SHENG[myElement] === targetElement) {
    return 'iSupport'; // 내가 생해주는
  }
  if (ELEMENT_KE[targetElement] === myElement) {
    return 'restrainMe'; // 나를 극하는
  }
  if (ELEMENT_KE[myElement] === targetElement) {
    return 'iRestrain'; // 내가 극하는
  }
  return 'neutral';
}

// 운세 점수 계산 (0-100)
export function calculateFortuneScore(saju: SajuResult, targetDate: Date = new Date()): number {
  const todayPillar = getPillarForDate(targetDate);

  // 일간(일주의 천간 오행)과 오늘의 관계 분석
  const myDayElement = saju.dayPillar.stemElement;

  const stemRelation = analyzeElementRelation(myDayElement, todayPillar.stemElement);
  const branchRelation = analyzeElementRelation(myDayElement, todayPillar.branchElement);

  let score = 60; // 기본 점수

  // 천간 관계에 따른 점수 조정
  switch (stemRelation) {
    case 'same': score += 10; break;
    case 'supportMe': score += 20; break;
    case 'iSupport': score += 5; break;
    case 'restrainMe': score -= 15; break;
    case 'iRestrain': score += 10; break;
  }

  // 지지 관계에 따른 점수 조정
  switch (branchRelation) {
    case 'same': score += 5; break;
    case 'supportMe': score += 15; break;
    case 'iSupport': score += 3; break;
    case 'restrainMe': score -= 10; break;
    case 'iRestrain': score += 5; break;
  }

  // 범위 제한
  return Math.max(0, Math.min(100, score));
}

// 운세 카테고리
export interface FortuneCategories {
  overall: number;      // 총운
  love: number;         // 애정운
  money: number;        // 금전운
  health: number;       // 건강운
  work: number;         // 직장/학업운
}

// 카테고리별 운세 점수 계산
export function calculateFortuneCategories(saju: SajuResult, targetDate: Date = new Date()): FortuneCategories {
  const baseScore = calculateFortuneScore(saju, targetDate);

  // 약간의 변동을 주어 다양한 점수 생성
  const seed = targetDate.getDate() + targetDate.getMonth() * 31;

  const variation = (index: number) => {
    const v = Math.sin(seed + index * 137.5) * 15;
    return Math.round(v);
  };

  return {
    overall: baseScore,
    love: Math.max(0, Math.min(100, baseScore + variation(1))),
    money: Math.max(0, Math.min(100, baseScore + variation(2))),
    health: Math.max(0, Math.min(100, baseScore + variation(3))),
    work: Math.max(0, Math.min(100, baseScore + variation(4)))
  };
}

// 운세 설명 생성 (기본 템플릿)
export function generateFortuneDescription(saju: SajuResult): string {
  const todayPillar = getTodayPillar();
  const categories = calculateFortuneCategories(saju);

  const getGrade = (score: number) => {
    if (score >= 80) return '매우 좋음';
    if (score >= 65) return '좋음';
    if (score >= 50) return '보통';
    if (score >= 35) return '주의';
    return '조심';
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return `
📅 ${dateStr} 운세
오늘의 일진: ${todayPillar.fullName}

🔮 총운: ${categories.overall}점 (${getGrade(categories.overall)})
💕 애정운: ${categories.love}점 (${getGrade(categories.love)})
💰 금전운: ${categories.money}점 (${getGrade(categories.money)})
🏥 건강운: ${categories.health}점 (${getGrade(categories.health)})
💼 직장/학업운: ${categories.work}점 (${getGrade(categories.work)})
`.trim();
}

// 일일 운세 데이터 구조
export interface DailyFortune {
  date: string;
  todayPillar: string;
  categories: FortuneCategories;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
}

// 완전한 일일 운세 생성
export function generateDailyFortune(saju: SajuResult): DailyFortune {
  const todayPillar = getTodayPillar();
  const categories = calculateFortuneCategories(saju);
  const description = generateFortuneDescription(saju);

  const today = new Date();
  const seed = today.getDate() + today.getMonth() * 31 + today.getFullYear();

  // 행운의 색
  const colors = ['빨강', '주황', '노랑', '초록', '파랑', '남색', '보라', '검정', '흰색', '분홍'];
  const luckyColor = colors[seed % colors.length];

  // 행운의 숫자
  const luckyNumber = (seed % 9) + 1;

  // 행운의 방향
  const directions = ['동', '서', '남', '북', '동북', '동남', '서북', '서남'];
  const luckyDirection = directions[seed % directions.length];

  return {
    date: today.toISOString().split('T')[0],
    todayPillar: todayPillar.fullName,
    categories,
    description,
    advice: '', // Claude AI가 채워줄 부분
    luckyColor,
    luckyNumber,
    luckyDirection
  };
}

// 특정 날짜의 운세 계산 (달력용)
export function calculateDailyFortune(saju: SajuResult, targetDate: Date): DailyFortune {
  const pillar = getPillarForDate(targetDate);
  const categories = calculateFortuneCategories(saju, targetDate);

  const seed = targetDate.getDate() + targetDate.getMonth() * 31 + targetDate.getFullYear();

  // 행운의 색
  const colors = ['빨강', '주황', '노랑', '초록', '파랑', '남색', '보라', '검정', '흰색', '분홍'];
  const luckyColor = colors[seed % colors.length];

  // 행운의 숫자
  const luckyNumber = (seed % 9) + 1;

  // 행운의 방향
  const directions = ['동', '서', '남', '북', '동북', '동남', '서북', '서남'];
  const luckyDirection = directions[seed % directions.length];

  return {
    date: targetDate.toISOString().split('T')[0],
    todayPillar: pillar.fullName,
    categories,
    description: '',
    advice: '',
    luckyColor,
    luckyNumber,
    luckyDirection
  };
}
