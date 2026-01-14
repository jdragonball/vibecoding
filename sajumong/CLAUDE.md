# 사주몽 (Sajumong) - 프로젝트 개요

## 프로젝트 목적
사주를 기반으로 사용자와 채팅하고, 일일 운세를 제공하는 AI 에이전트

## 주요 기능
1. **채팅 상담**: Claude AI를 활용한 사주 기반 대화형 상담
2. **사주 정보 저장**: 사용자의 생년월일시 정보를 기반으로 사주 계산 및 저장
3. **일일 운세**: 매일 사용자의 사주를 기반으로 한 맞춤형 운세 제공
4. **대시보드**: 오늘의 기운, 운세 점수, 사주몽 캐릭터
5. **달력**: 월별 운세 조회
6. **메모리 시스템**: 대화 요약, 사용자 메모리 추출, Prompt Caching

## 기술 스택
- **프론트엔드**: SvelteKit 5, TypeScript
- **백엔드**: SvelteKit API Routes (+server.ts)
- **AI**: Anthropic Claude API (claude-sonnet-4, claude-haiku-4)
- **데이터베이스**: SQLite (better-sqlite3)
- **사주 계산**: 60saju 기반 TypeScript 포팅

## 프로젝트 구조

```
sajumong/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts     # DB 스키마 정의
│   │   │   │   └── client.ts     # DB 클라이언트 함수
│   │   │   ├── ai/
│   │   │   │   └── claude.ts     # Claude API 연동 (캐싱, 요약, 메모리)
│   │   │   └── saju/
│   │   │       ├── ganji.ts      # 간지(干支) 상수 및 유틸
│   │   │       ├── astro.ts      # 천문 계산 (절기, 줄리안 날짜)
│   │   │       ├── calculator.ts # 사주팔자 계산
│   │   │       ├── analysis.ts   # 사주 분석 (신강/신약, 용신)
│   │   │       └── fortune.ts    # 운세 계산
│   │   └── components/
│   ├── routes/
│   │   ├── +page.svelte          # 메인 페이지 (채팅, 대시보드, 달력)
│   │   └── api/
│   │       ├── chat/+server.ts   # 채팅 API
│   │       ├── saju/+server.ts   # 사주 저장/조회 API
│   │       ├── dashboard/+server.ts  # 대시보드 API
│   │       └── calendar/+server.ts   # 달력 API
│   └── app.html
├── data/                         # SQLite DB 파일 위치
├── .env                          # 환경 변수 (CLAUDE_API_KEY)
└── package.json
```

## 환경 변수
- `CLAUDE_API_KEY`: Anthropic Claude API 키

## 개발 워크플로우
```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 빌드된 앱 미리보기
npm run check    # TypeScript 타입 체크
```

## 데이터베이스 스키마

### users
사용자 정보
- id, name, birth_year, birth_month, birth_day, birth_hour, gender

### saju_data
계산된 사주팔자 정보
- id, user_id, year_pillar, month_pillar, day_pillar, hour_pillar, animal, ohaeng_count

### chat_sessions
채팅 세션
- id, user_id, title, created_at, updated_at

### chat_messages
채팅 메시지
- id, session_id, user_id, role, content, created_at

### chat_summaries
대화 요약 (Summarization)
- id, session_id, message_count, summary, created_at

### user_memories
사용자 메모리 (Memory Formation)
- id, user_id, category, content, source_session_id, created_at
- category: 'preference' | 'concern' | 'personal' | 'context'

### daily_fortunes
일일 운세 캐시
- id, user_id, fortune_date, today_pillar, overall_score, ...

## 메모리 아키텍처

### 1. Prompt Caching
- 정적 시스템 프롬프트 (페르소나, 가이드라인) 캐싱
- `cache_control: { type: 'ephemeral' }` 적용
- 예상 효과: 입력 토큰 60% 절감, 비용 50% 감소

### 2. Summarization (대화 요약)
- 15개 메시지 초과 시 자동 요약 트리거
- 최근 10개 메시지는 원본 유지
- Haiku 모델로 저렴하게 요약 생성
- 요약은 시스템 프롬프트의 `[이전 대화 요약]`에 포함

### 3. Memory Formation (메모리 추출)
- 10개 메시지마다 백그라운드 추출
- 추출 카테고리:
  - preference: 사용자 선호도
  - concern: 현재 고민/걱정
  - personal: 개인 상황/정보
  - context: 대화 맥락
- 메모리는 시스템 프롬프트의 `[사용자에 대해 기억하는 것들]`에 포함

### 메모리 흐름
```
사용자 메시지 → API 호출
     ↓
1. 기존 요약 조회 (getChatSummary)
2. 사용자 메모리 조회 (getUserMemories)
     ↓
3. Claude API 호출
   - 정적 프롬프트 (캐시됨)
   - 동적 컨텍스트 (사주 + 요약 + 메모리)
   - 최근 대화 기록
     ↓
4. 응답 저장
     ↓
5. 백그라운드 작업 (비동기)
   - 메시지 15개 초과 → 요약 생성
   - 메시지 10개마다 → 메모리 추출
```

## 사주 계산 로직

### 주요 파일
- `ganji.ts`: 천간(天干), 지지(地支), 오행(五行) 상수
- `astro.ts`: 절기 계산, 줄리안 날짜 변환
- `calculator.ts`: 사주팔자 계산 (년주, 월주, 일주, 시주)
- `analysis.ts`: 신강/신약, 용신 분석
- `fortune.ts`: 일일 운세 점수 계산

### 계산 기준
- 년주: 입춘(立春) 기준
- 월주: 절기(節氣) 기준
- 일주: 줄리안 날짜 기반
- 시주: 일간(日干)에 따른 시간 배치

## 구현 완료 항목
- ✅ SvelteKit 프로젝트 초기화
- ✅ 사주 계산 로직 (60saju 포팅)
- ✅ 데이터베이스 설정 (SQLite)
- ✅ Claude AI 채팅 API
- ✅ 채팅 UI (세션 관리, 다시 생성)
- ✅ 사주 입력 및 저장
- ✅ 대시보드 (오늘의 운세, 사주몽 캐릭터)
- ✅ 달력 (월별 운세)
- ✅ Prompt Caching
- ✅ Summarization (대화 요약)
- ✅ Memory Formation (메모리 추출)

## 향후 개선 사항
- WebSocket을 통한 실시간 채팅
- 대운(大運), 세운(歲運) 분석
- 사주 차트 시각화
- 모바일 앱 버전

## Claude AI 프롬프트 전략
1. 정적 시스템 프롬프트 (캐싱)
   - 사주몽 페르소나
   - 사주 해석 가이드라인
   - 십성 해석
   - 대화 스타일
   - 주의사항

2. 동적 컨텍스트
   - 사용자 사주 정보
   - 사주 분석 결과 (신강/신약, 용신)
   - 이전 대화 요약
   - 사용자 메모리
   - 오늘 날짜

## 참고사항
- 사주 계산은 한국 표준 만세력 기준
- 시간대는 한국 표준시(KST, UTC+9) 사용
- 경도 보정 적용 (127.0° 기준)
