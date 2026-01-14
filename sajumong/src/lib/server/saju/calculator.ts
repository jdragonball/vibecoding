import {
  CHEONGAN,
  JIJI,
  CHEONGAN_OHAENG,
  JIJI_OHAENG,
  CHEONGAN_EUMYANG,
  JIJI_EUMYANG,
  ANIMALS
} from './constants';

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
  cheongan: string;
  jiji: string;
  fullName: string;
  ohaeng: {
    cheongan: string;
    jiji: string;
  };
  eumyang: {
    cheongan: '양' | '음';
    jiji: '양' | '음';
  };
}

export interface SajuResult {
  yearPillar: Pillar;   // 년주
  monthPillar: Pillar;  // 월주
  dayPillar: Pillar;    // 일주
  hourPillar: Pillar;   // 시주
  animal: string;       // 띠
  gender: 'male' | 'female';
  birthInfo: BirthInfo;
  ohaengCount: Record<string, number>;  // 오행 분포
}

// 년주 계산 (입춘 기준)
function calculateYearPillar(year: number, month: number, day: number): Pillar {
  // 입춘(2월 4일경) 이전이면 전년도로 계산
  let adjustedYear = year;
  if (month < 2 || (month === 2 && day < 4)) {
    adjustedYear = year - 1;
  }

  // 갑자년 기준 (1984년이 갑자년)
  const baseYear = 1984;
  let index = (adjustedYear - baseYear) % 60;
  if (index < 0) index += 60;

  const cheonganIndex = index % 10;
  const jijiIndex = index % 12;

  const cheongan = CHEONGAN[cheonganIndex];
  const jiji = JIJI[jijiIndex];

  return createPillar(cheongan, jiji);
}

// 월주 계산
function calculateMonthPillar(year: number, month: number, day: number, yearCheongan: string): Pillar {
  // 절기 기준 월 계산 (간략화된 버전)
  let sajuMonth = month;

  // 각 월의 절기일 (대략적인 값)
  const jeolgiDays = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7];

  if (day < jeolgiDays[month - 1]) {
    sajuMonth = month - 1;
    if (sajuMonth === 0) sajuMonth = 12;
  }

  // 년간에 따른 월간 계산 (년간합오행)
  const yearCheonganIndex = CHEONGAN.indexOf(yearCheongan);
  const monthCheonganBase = (yearCheonganIndex % 5) * 2;
  const monthCheonganIndex = (monthCheonganBase + sajuMonth - 1) % 10;

  // 월지는 인(寅)월부터 시작 (1월=인월, 2월=묘월...)
  const monthJijiIndex = (sajuMonth + 1) % 12;

  const cheongan = CHEONGAN[monthCheonganIndex];
  const jiji = JIJI[monthJijiIndex];

  return createPillar(cheongan, jiji);
}

// 일주 계산 (복잡한 만세력 계산 - 간략화된 버전)
function calculateDayPillar(year: number, month: number, day: number): Pillar {
  // 기준일: 1900년 1월 1일 = 갑진일
  const baseDate = new Date(1900, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  // 1900년 1월 1일이 갑진일이므로 인덱스 조정
  // 갑 = 0, 진 = 4
  const baseDayIndex = 0 + 4 * 10; // 60갑자에서의 갑진 위치
  let dayIndex = (baseDayIndex + diffDays) % 60;
  if (dayIndex < 0) dayIndex += 60;

  const cheonganIndex = dayIndex % 10;
  const jijiIndex = dayIndex % 12;

  const cheongan = CHEONGAN[cheonganIndex];
  const jiji = JIJI[jijiIndex];

  return createPillar(cheongan, jiji);
}

// 시주 계산
function calculateHourPillar(hour: number, dayCheongan: string): Pillar {
  // 시간을 지지로 변환
  let hourJijiIndex: number;

  if (hour >= 23 || hour < 1) hourJijiIndex = 0;      // 자시
  else if (hour < 3) hourJijiIndex = 1;               // 축시
  else if (hour < 5) hourJijiIndex = 2;               // 인시
  else if (hour < 7) hourJijiIndex = 3;               // 묘시
  else if (hour < 9) hourJijiIndex = 4;               // 진시
  else if (hour < 11) hourJijiIndex = 5;              // 사시
  else if (hour < 13) hourJijiIndex = 6;              // 오시
  else if (hour < 15) hourJijiIndex = 7;              // 미시
  else if (hour < 17) hourJijiIndex = 8;              // 신시
  else if (hour < 19) hourJijiIndex = 9;              // 유시
  else if (hour < 21) hourJijiIndex = 10;             // 술시
  else hourJijiIndex = 11;                            // 해시

  // 일간에 따른 시간 계산 (일간합오행)
  const dayCheonganIndex = CHEONGAN.indexOf(dayCheongan);
  const hourCheonganBase = (dayCheonganIndex % 5) * 2;
  const hourCheonganIndex = (hourCheonganBase + hourJijiIndex) % 10;

  const cheongan = CHEONGAN[hourCheonganIndex];
  const jiji = JIJI[hourJijiIndex];

  return createPillar(cheongan, jiji);
}

// 기둥(주) 생성 헬퍼
function createPillar(cheongan: string, jiji: string): Pillar {
  return {
    cheongan,
    jiji,
    fullName: cheongan + jiji,
    ohaeng: {
      cheongan: CHEONGAN_OHAENG[cheongan],
      jiji: JIJI_OHAENG[jiji]
    },
    eumyang: {
      cheongan: CHEONGAN_EUMYANG[cheongan],
      jiji: JIJI_EUMYANG[jiji]
    }
  };
}

// 띠 계산
function calculateAnimal(year: number, month: number, day: number): string {
  let adjustedYear = year;
  if (month < 2 || (month === 2 && day < 4)) {
    adjustedYear = year - 1;
  }
  const animalIndex = (adjustedYear - 4) % 12;
  return ANIMALS[animalIndex >= 0 ? animalIndex : animalIndex + 12];
}

// 오행 분포 계산
function calculateOhaengCount(pillars: Pillar[]): Record<string, number> {
  const count: Record<string, number> = {
    '목': 0, '화': 0, '토': 0, '금': 0, '수': 0
  };

  for (const pillar of pillars) {
    count[pillar.ohaeng.cheongan]++;
    count[pillar.ohaeng.jiji]++;
  }

  return count;
}

// 메인 사주 계산 함수
export function calculateSaju(birthInfo: BirthInfo): SajuResult {
  const { year, month, day, hour, gender } = birthInfo;

  // 4주 계산
  const yearPillar = calculateYearPillar(year, month, day);
  const monthPillar = calculateMonthPillar(year, month, day, yearPillar.cheongan);
  const dayPillar = calculateDayPillar(year, month, day);
  const hourPillar = calculateHourPillar(hour, dayPillar.cheongan);

  // 띠 계산
  const animal = calculateAnimal(year, month, day);

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
    ohaengCount
  };
}

// 사주를 문자열로 변환
export function sajuToString(saju: SajuResult): string {
  return `${saju.yearPillar.fullName} ${saju.monthPillar.fullName} ${saju.dayPillar.fullName} ${saju.hourPillar.fullName}`;
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
년주(年柱): ${yearPillar.fullName} (${yearPillar.ohaeng.cheongan}${yearPillar.ohaeng.jiji})
월주(月柱): ${monthPillar.fullName} (${monthPillar.ohaeng.cheongan}${monthPillar.ohaeng.jiji})
일주(日柱): ${dayPillar.fullName} (${dayPillar.ohaeng.cheongan}${dayPillar.ohaeng.jiji}) - 일간: ${dayPillar.cheongan}
시주(時柱): ${hourPillar.fullName} (${hourPillar.ohaeng.cheongan}${hourPillar.ohaeng.jiji})

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
