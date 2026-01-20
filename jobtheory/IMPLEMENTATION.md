# 나 사용설명서 - 구현 현황

> 사주 × MBTI 기반 맞춤형 인생 가이드 서비스

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | SvelteKit (Svelte 5) |
| 언어 | TypeScript |
| 스타일 | CSS Variables, Custom Design System |
| AI (무료) | Google Gemini 2.0 Flash |
| AI (유료) | Claude Sonnet 4.5 |
| 상태관리 | Svelte 5 Runes ($state, $derived) |
| 저장 | localStorage (클라이언트) |

---

## 프로젝트 구조

```
src/
├── lib/
│   ├── models/
│   │   ├── types.ts      # 타입 정의 (SajuInfo, ReportParams, etc.)
│   │   ├── gemini.ts     # Gemini 프로바이더 (무료)
│   │   ├── claude.ts     # Claude 프로바이더 (유료, 병렬생성)
│   │   └── index.ts      # 프로바이더 export
│   ├── saju.ts           # 사주 계산 로직
│   └── prompts.ts        # (레거시) 프롬프트 빌더
├── routes/
│   ├── +page.svelte      # 메인 폼 페이지
│   ├── +layout.svelte    # 공통 레이아웃
│   ├── report/
│   │   └── +page.svelte  # 리포트 결과 페이지
│   ├── history/
│   │   └── +page.svelte  # 저장된 리포트 목록
│   └── api/
│       └── generate/
│           ├── free/+server.ts   # 무료 리포트 API
│           └── paid/+server.ts   # 유료 리포트 API
└── app.css               # 글로벌 스타일
```

---

## 핵심 기능

### 1. 사주 계산 (`src/lib/saju.ts`)
- 생년월일시 → 사주팔자 변환
- 천간/지지 계산 (연주, 월주, 일주, 시주)
- 오행 분포 분석 (목, 화, 토, 금, 수)
- 강한/약한 오행 도출

### 2. 무료 리포트 (Gemini)
**엔드포인트:** `POST /api/generate/free`

**생성 내용:**
- `oneLiner`: 한 줄 표현
- `typeName`: 유형 이름 (예: "몽상가적 조율사")
- `keywords`: 키워드 3개
- `description`: 3-4문단 상세 설명
- `strengths`: 강점 6개 (제목 + 설명)
- `weaknesses`: 약점 6개 (제목 + 설명)
- `preview`: 유료 섹션 제목 미리보기

### 3. 유료 리포트 (Claude) - 병렬 생성
**엔드포인트:** `POST /api/generate/paid`

**병렬 처리 구조:**
```typescript
Promise.all([
  Part 1: slots 1-5 (나를 알기) - max 4096 tokens
  Part 2: slots 6-9 (고민 분석) - max 4096 tokens
  Part 3: slot 10 + oneLiner (마무리) - max 2048 tokens
])
```

**10개 섹션:**
| Slot | Part | 제목 |
|------|------|------|
| 1 | 나를 알기 | {이름}님은 이런 사람이에요 |
| 2 | 나를 알기 | 사주로 본 나의 기본 에너지 |
| 3 | 나를 알기 | MBTI로 본 나의 행동 방식 |
| 4 | 나를 알기 | 타고난 재능과 잘하는 것 |
| 5 | 나를 알기 | 주의해야 할 부분 |
| 6 | 고민 분석 | (동적) 고민의 근본 원인 |
| 7 | 고민 분석 | (동적) 현재 시기의 의미 |
| 8 | 고민 분석 | (동적) 고민에 대한 답변 |
| 9 | 앞으로 | (동적) 구체적 행동 가이드 |
| 10 | 앞으로 | {이름}님에게 전하는 말 |

### 4. 리포트 저장 (localStorage)
- 무료/유료 리포트 자동 저장
- 최대 20개 저장 (최신순)
- history 페이지에서 조회/삭제 가능

---

## UI 페이지

### 메인 페이지 (`/`)
- 이름, 생년월일, 출생시간(선택), 성별, MBTI 입력
- 고민 입력 (선택, 미입력시 AI가 추론)
- 유효성 검증 후 리포트 페이지로 이동

### 리포트 페이지 (`/report`)
- **사주 원국표**: 시주-일주-월주-연주 테이블
- **무료 영역**: 유형명, 한줄소개, 키워드, 상세설명, 강점/약점 그리드
- **유료 유도**: 블러된 섹션 미리보기, 가격 표시, 잠금해제 버튼
- **유료 콘텐츠**: Part별 그룹핑된 10개 섹션

### 히스토리 페이지 (`/history`)
- 저장된 리포트 목록
- 클릭시 해당 리포트 보기
- 개별/전체 삭제 기능

---

## 데이터 흐름

```
[메인 폼]
    ↓ sessionStorage에 요청 저장
[리포트 페이지]
    ↓ /api/generate/free 호출 (Gemini)
[무료 리포트 표시]
    ↓ localStorage에 저장
[잠금해제 버튼 클릭]
    ↓ /api/generate/paid 호출 (Claude 병렬)
[유료 리포트 표시]
    ↓ localStorage 업데이트
```

---

## 환경 변수 (`.env`)

```
ANTHROPIC_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIzaSy...
```

---

## 주요 타입 정의

```typescript
// 사주 정보
interface SajuInfo {
  yearPillar: string;    // 연주 (예: "임신")
  monthPillar: string;   // 월주
  dayPillar: string;     // 일주
  hourPillar: string;    // 시주 또는 "시간 미상"
  dayMaster: string;     // 일간 (예: "신")
  dayMasterElement: string;  // 오행 (예: "금")
  dayMasterMeaning: string;  // 의미 (예: "결단과 정의")
  strongElement: string;     // 강한 오행
  weakElement: string;       // 약한 오행
  elementCount: Record<string, number>;  // 오행 분포
}

// 무료 리포트 결과
interface FreeReportResult {
  oneLiner: string;
  typeName: string;
  keywords: string[];
  description: string;
  strengths: TraitItem[];
  weaknesses: TraitItem[];
  preview: {
    sectionTitles: string[];
    teaserText: string;
  };
}

// 유료 리포트 결과
interface PaidReportResult {
  oneLiner: string;
  sections: Array<{
    slot: number;
    title: string;
    content: string;
  }>;
}
```

---

## 성능 최적화

1. **병렬 API 호출**: 유료 리포트 3개 파트 동시 생성
2. **토큰 분산**: 16384 → 4096+4096+2048 (잘림 방지)
3. **로컬 저장**: 서버 부하 없이 리포트 재조회

---

## 미구현 / TODO

- [ ] 결제 연동 (실제 유료화)
- [ ] 사용자 인증/로그인
- [ ] 서버 DB 저장 (현재 localStorage만)
- [ ] 리포트 공유 기능
- [ ] PDF 내보내기
- [ ] 더 상세한 사주 해석 (대운, 세운 등)

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

---

*마지막 업데이트: 2026-01-20*
