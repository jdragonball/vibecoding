import type { SajuInfo } from './models/types';

// 사주 계산 유틸리티
export function calculateSaju(birthdate: string, birthHour: string | null, gender: string): SajuInfo {
	const year = parseInt(birthdate.slice(0, 4));
	const month = parseInt(birthdate.slice(4, 6));
	const day = parseInt(birthdate.slice(6, 8));

	const heavenlyStems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
	const earthlyBranches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
	const fiveElements: Record<string, string> = {
		갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
		기: '토', 경: '금', 신: '금', 임: '수', 계: '수'
	};
	const elementMeaning: Record<string, string> = {
		목: '성장과 창의성',
		화: '열정과 표현',
		토: '안정과 신뢰',
		금: '결단과 정의',
		수: '지혜와 유연함'
	};

	// 연주
	const yearStemIndex = (year - 4) % 10;
	const yearBranchIndex = (year - 4) % 12;
	const yearStem = heavenlyStems[yearStemIndex >= 0 ? yearStemIndex : yearStemIndex + 10];
	const yearBranch = earthlyBranches[yearBranchIndex >= 0 ? yearBranchIndex : yearBranchIndex + 12];

	// 월주
	const monthStemIndex = ((year % 10) * 2 + month) % 10;
	const monthBranchIndex = (month + 1) % 12;
	const monthStem = heavenlyStems[monthStemIndex];
	const monthBranch = earthlyBranches[monthBranchIndex];

	// 일주
	const baseDate = new Date(1900, 0, 1);
	const targetDate = new Date(year, month - 1, day);
	const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
	const dayStemIndex = (diffDays + 10) % 10;
	const dayBranchIndex = (diffDays + 10) % 12;
	const dayStem = heavenlyStems[dayStemIndex];
	const dayBranch = earthlyBranches[dayBranchIndex];

	// 시주
	let hourStem = '';
	let hourBranch = '';
	if (birthHour) {
		const hourMap: Record<string, number> = {
			'23-01': 0, '01-03': 1, '03-05': 2, '05-07': 3,
			'07-09': 4, '09-11': 5, '11-13': 6, '13-15': 7,
			'15-17': 8, '17-19': 9, '19-21': 10, '21-23': 11
		};
		const hourBranchIdx = hourMap[birthHour];
		hourBranch = earthlyBranches[hourBranchIdx];
		const hourStemIdx = (dayStemIndex * 2 + hourBranchIdx) % 10;
		hourStem = heavenlyStems[hourStemIdx];
	}

	const dayMaster = dayStem;
	const dayMasterElement = fiveElements[dayMaster];
	const dayMasterMeaning = elementMeaning[dayMasterElement];

	// 오행 분포
	const allStems = [yearStem, monthStem, dayStem];
	const allBranches = [yearBranch, monthBranch, dayBranch];
	if (hourStem) allStems.push(hourStem);
	if (hourBranch) allBranches.push(hourBranch);

	const elementCount: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
	allStems.forEach(stem => elementCount[fiveElements[stem]]++);

	const branchElements: Record<string, string> = {
		자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화',
		오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수'
	};
	allBranches.forEach(branch => elementCount[branchElements[branch]]++);

	// 강한/약한 오행 분석
	const sortedElements = Object.entries(elementCount).sort((a, b) => b[1] - a[1]);
	const strongElement = sortedElements[0][0];
	const weakElement = sortedElements[sortedElements.length - 1][0];

	return {
		yearPillar: `${yearStem}${yearBranch}`,
		monthPillar: `${monthStem}${monthBranch}`,
		dayPillar: `${dayStem}${dayBranch}`,
		hourPillar: hourStem ? `${hourStem}${hourBranch}` : '시간 미상',
		dayMaster,
		dayMasterElement,
		dayMasterMeaning,
		strongElement,
		weakElement,
		elementCount
	};
}
