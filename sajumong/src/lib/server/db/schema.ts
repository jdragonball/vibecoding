// 데이터베이스 스키마 정의

export interface User {
  id: string;
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  gender: 'male' | 'female';
  createdAt: string;
  updatedAt: string;
}

export interface SajuData {
  id: string;
  userId: string;
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  animal: string;
  ohaengCount: string; // JSON string
  calculatedAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface DailyFortuneRecord {
  id: string;
  userId: string;
  fortuneDate: string;
  todayPillar: string;
  overallScore: number;
  loveScore: number;
  moneyScore: number;
  healthScore: number;
  workScore: number;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
  createdAt: string;
}

// 테이블 생성 SQL
export const CREATE_TABLES_SQL = `
-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_year INTEGER NOT NULL,
  birth_month INTEGER NOT NULL,
  birth_day INTEGER NOT NULL,
  birth_hour INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 사주 데이터 테이블
CREATE TABLE IF NOT EXISTS saju_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year_pillar TEXT NOT NULL,
  month_pillar TEXT NOT NULL,
  day_pillar TEXT NOT NULL,
  hour_pillar TEXT NOT NULL,
  animal TEXT NOT NULL,
  ohaeng_count TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '새 대화',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 채팅 기록 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 일일 운세 테이블
CREATE TABLE IF NOT EXISTS daily_fortunes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fortune_date TEXT NOT NULL,
  today_pillar TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  love_score INTEGER NOT NULL,
  money_score INTEGER NOT NULL,
  health_score INTEGER NOT NULL,
  work_score INTEGER NOT NULL,
  advice TEXT,
  lucky_color TEXT,
  lucky_number INTEGER,
  lucky_direction TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, fortune_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_fortunes_user_date ON daily_fortunes(user_id, fortune_date);
`;
