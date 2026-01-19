// 사주 정보 타입
export interface SajuInfo {
	yearPillar: string;
	monthPillar: string;
	dayPillar: string;
	hourPillar: string;
	dayMaster: string;
	dayMasterElement: string;
	dayMasterMeaning: string;
	strongElement: string;
	weakElement: string;
	elementCount: Record<string, number>;
}

// 리포트 생성 요청 파라미터
export interface ReportParams {
	name: string;
	gender: string;
	mbti: string;
	saju: SajuInfo;
	concern: string;
}

// 강점/약점 항목
export interface TraitItem {
	title: string;
	description: string;
}

// 무료 티저 결과
export interface FreeReportResult {
	oneLiner: string;
	typeName: string;
	keywords: string[];
	description: string;  // 3-4문단 상세 설명
	strengths: TraitItem[];  // 강점 6개 (제목 + 설명)
	weaknesses: TraitItem[];  // 약점 6개 (제목 + 설명)
	preview: {
		sectionTitles: string[];  // 유료 섹션 제목 미리보기 (블러용)
		teaserText: string;
	};
}

// 유료 전체 리포트 결과
export interface PaidReportResult {
	oneLiner: string;
	sections: Array<{
		slot: number;
		title: string;
		content: string;
	}>;
}

// LLM 프로바이더 인터페이스
export interface LLMProvider {
	generateFreeReport(params: ReportParams): Promise<FreeReportResult>;
	generatePaidReport(params: ReportParams, freeContext: FreeReportResult): Promise<PaidReportResult>;
}
