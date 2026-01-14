import { CHEONGAN, JIJI, CHEONGAN_OHAENG, JIJI_OHAENG } from './constants';
import type { SajuResult } from './calculator';

// 오늘의 일진 계산
export function getTodayPillar(): { cheongan: string; jiji: string; fullName: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 기준일: 1900년 1월 1일 = 갑진일
  const baseDate = new Date(1900, 0, 1);
  const diffDays = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  const baseDayIndex = 0 + 4 * 10;
  let dayIndex = (baseDayIndex + diffDays) % 60;
  if (dayIndex < 0) dayIndex += 60;

  const cheonganIndex = dayIndex % 10;
  const jijiIndex = dayIndex % 12;

  const cheongan = CHEONGAN[cheonganIndex];
  const jiji = JIJI[jijiIndex];

  return {
    cheongan,
    jiji,
    fullName: cheongan + jiji
  };
}

// 오행 상생상극 관계
const OHAENG_RELATIONS = {
  // 상생 (나를 생하는)
  generate: {
    '목': '수', '화': '목', '토': '화', '금': '토', '수': '금'
  },
  // 상생 (내가 생하는)
  generated: {
    '목': '화', '화': '토', '토': '금', '금': '수', '수': '목'
  },
  // 상극 (나를 극하는)
  restrain: {
    '목': '금', '화': '수', '토': '목', '금': '화', '수': '토'
  },
  // 상극 (내가 극하는)
  restrained: {
    '목': '토', '화': '금', '토': '수', '금': '목', '수': '화'
  }
} as const;

// 오행 간의 관계 분석
function analyzeOhaengRelation(myOhaeng: string, todayOhaeng: string): string {
  if (myOhaeng === todayOhaeng) {
    return 'same'; // 비견
  }
  if (OHAENG_RELATIONS.generate[myOhaeng as keyof typeof OHAENG_RELATIONS.generate] === todayOhaeng) {
    return 'supportMe'; // 나를 생해주는
  }
  if (OHAENG_RELATIONS.generated[myOhaeng as keyof typeof OHAENG_RELATIONS.generated] === todayOhaeng) {
    return 'iSupport'; // 내가 생해주는
  }
  if (OHAENG_RELATIONS.restrain[myOhaeng as keyof typeof OHAENG_RELATIONS.restrain] === todayOhaeng) {
    return 'restrainMe'; // 나를 극하는
  }
  if (OHAENG_RELATIONS.restrained[myOhaeng as keyof typeof OHAENG_RELATIONS.restrained] === todayOhaeng) {
    return 'iRestrain'; // 내가 극하는
  }
  return 'neutral';
}

// 운세 점수 계산 (0-100)
export function calculateFortuneScore(saju: SajuResult): number {
  const todayPillar = getTodayPillar();
  const todayCheonganOhaeng = CHEONGAN_OHAENG[todayPillar.cheongan];
  const todayJijiOhaeng = JIJI_OHAENG[todayPillar.jiji];

  // 일간(일주의 천간)과 오늘의 관계 분석
  const myDayCheonganOhaeng = saju.dayPillar.ohaeng.cheongan;

  const cheonganRelation = analyzeOhaengRelation(myDayCheonganOhaeng, todayCheonganOhaeng);
  const jijiRelation = analyzeOhaengRelation(myDayCheonganOhaeng, todayJijiOhaeng);

  let score = 60; // 기본 점수

  // 천간 관계에 따른 점수 조정
  switch (cheonganRelation) {
    case 'same': score += 10; break;
    case 'supportMe': score += 20; break;
    case 'iSupport': score += 5; break;
    case 'restrainMe': score -= 15; break;
    case 'iRestrain': score += 10; break;
  }

  // 지지 관계에 따른 점수 조정
  switch (jijiRelation) {
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
export function calculateFortuneCategories(saju: SajuResult): FortuneCategories {
  const baseScore = calculateFortuneScore(saju);

  // 약간의 변동을 주어 다양한 점수 생성
  const today = new Date();
  const seed = today.getDate() + today.getMonth() * 31;

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
