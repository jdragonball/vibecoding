# 사주몽 (Sajumong) - 프로젝트 개요

## 프로젝트 목적
사주를 기반으로 사용자와 채팅하고, 일일 운세를 제공하는 AI 에이전트

## 주요 기능
1. **채팅 상담**: Claude AI를 활용한 사주 기반 대화형 상담
2. **사주 정보 저장**: 사용자의 생년월일시 정보를 기반으로 사주 계산 및 저장
3. **일일 운세**: 매일 사용자의 사주를 기반으로 한 맞춤형 운세 제공
4. **메모리 기능**: 사용자와의 대화 이력 및 사주 정보 기억

## 기술 스택
- **프론트엔드**: SvelteKit 5, TypeScript
- **백엔드**: SvelteKit API Routes (+server.ts)
- **AI**: Anthropic Claude API (claude-3-5-sonnet)
- **데이터베이스**: SQLite (초기), 추후 PostgreSQL 전환 가능
- **스타일링**: TailwindCSS (예정)

## 프로젝트 구조

```
sajumong/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/           # 데이터베이스 관련
│   │   │   │   ├── schema.ts # DB 스키마
│   │   │   │   └── client.ts # DB 클라이언트
│   │   │   ├── ai/           # AI 관련
│   │   │   │   └── claude.ts # Claude API 연동
│   │   │   └── saju/         # 사주 계산 로직
│   │   │       ├── calculator.ts  # 사주 계산
│   │   │       └── fortune.ts     # 운세 생성
│   │   └── components/       # Svelte 컴포넌트
│   │       ├── Chat.svelte   # 채팅 UI
│   │       └── SajuInput.svelte # 사주 입력 폼
│   ├── routes/
│   │   ├── +page.svelte      # 메인 페이지 (채팅 UI)
│   │   └── api/
│   │       ├── chat/
│   │       │   └── +server.ts # 채팅 API
│   │       ├── saju/
│   │       │   └── +server.ts # 사주 저장/조회 API
│   │       └── fortune/
│   │           └── +server.ts # 일일 운세 API
│   └── app.html
├── static/                   # 정적 파일
├── .env                      # 환경 변수 (CLAUDE_API_KEY)
├── package.json
└── svelte.config.js

```

## 환경 변수
- `CLAUDE_API_KEY`: Anthropic Claude API 키

## 개발 워크플로우
1. `npm run dev` - 개발 서버 실행
2. `npm run build` - 프로덕션 빌드
3. `npm run preview` - 빌드된 앱 미리보기

## 데이터베이스 스키마 (예정)

### users 테이블
- id (primary key)
- name (varchar)
- birth_year (int)
- birth_month (int)
- birth_day (int)
- birth_hour (int)
- gender (varchar)
- created_at (timestamp)

### saju_data 테이블
- id (primary key)
- user_id (foreign key)
- year_pillar (varchar) - 년주
- month_pillar (varchar) - 월주
- day_pillar (varchar) - 일주
- hour_pillar (varchar) - 시주
- calculated_at (timestamp)

### chat_history 테이블
- id (primary key)
- user_id (foreign key)
- role (varchar) - 'user' or 'assistant'
- message (text)
- created_at (timestamp)

### daily_fortune 테이블
- id (primary key)
- user_id (foreign key)
- fortune_date (date)
- fortune_text (text)
- created_at (timestamp)

## 구현 단계
1. ✅ SvelteKit 프로젝트 초기화
2. ⏳ 프로젝트 문서 작성
3. ⬜ 필요한 패키지 설치
4. ⬜ 환경 변수 설정
5. ⬜ 기본 구조 생성
6. ⬜ 사주 계산 로직 구현
7. ⬜ 데이터베이스 설정
8. ⬜ Claude AI 채팅 API 구현
9. ⬜ 채팅 UI 구현
10. ⬜ 사주 입력 및 저장 기능
11. ⬜ 일일 운세 기능
12. ⬜ 테스트 및 배포

## 참고사항
- 사주 계산은 한국 표준 만세력 기준
- 시간대는 한국 표준시(KST, UTC+9) 사용
- 사용자 데이터는 로컬 스토리지 및 DB에 안전하게 저장
- Claude AI 프롬프트에 사주 전문 지식 주입 필요

## Claude AI 프롬프트 전략
1. 시스템 프롬프트에 사주 전문가 페르소나 부여
2. 사용자의 사주 정보를 컨텍스트로 제공
3. 대화 히스토리를 통한 연속적인 상담 경험
4. 사주 용어 및 해석 방법을 프롬프트에 포함

## 향후 개선 사항
- WebSocket을 통한 실시간 채팅
- 이미지 생성 (사주 차트 시각화)
- 음력/양력 변환 자동화
- 복잡한 사주 해석 (대운, 세운 등)
- 모바일 앱 버전
