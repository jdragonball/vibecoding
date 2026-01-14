# 사주몽 (Sajumong)

사주 기반 AI 채팅 상담 에이전트

## 소개

사주몽은 사용자의 사주 정보를 기반으로 일일 운세를 제공하고, Claude AI와 채팅 상담을 할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- 🔮 **사주 계산**: 생년월일시 기반 사주팔자 자동 계산
- 💬 **AI 채팅 상담**: Claude AI를 활용한 사주 기반 대화형 상담
- 🌟 **일일 운세**: 매일 개인 맞춤형 운세 제공
- 💾 **메모리 기능**: 사용자 정보 및 대화 이력 저장

## 기술 스택

- SvelteKit 5
- TypeScript
- Claude AI (Anthropic)
- SQLite / Better-SQLite3

## 설치 및 실행

### 1. 의존성 설치
```sh
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 Claude API 키를 추가합니다:
```
CLAUDE_API_KEY=your_api_key_here
```

### 3. 개발 서버 실행

```sh
npm run dev

# 또는 브라우저에서 자동으로 열기
npm run dev -- --open
```

## 프로덕션 빌드

```sh
npm run build
```

빌드된 앱 미리보기:
```sh
npm run preview
```

## 프로젝트 구조

```
sajumong/
├── src/
│   ├── lib/
│   │   ├── server/         # 서버 사이드 로직
│   │   │   ├── db/         # 데이터베이스
│   │   │   ├── ai/         # Claude AI 연동
│   │   │   └── saju/       # 사주 계산 로직
│   │   └── components/     # Svelte 컴포넌트
│   └── routes/             # SvelteKit 라우트
│       ├── +page.svelte    # 메인 페이지
│       └── api/            # API 엔드포인트
└── static/                 # 정적 파일
```

## 문서

더 자세한 정보는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

## 라이선스

MIT
