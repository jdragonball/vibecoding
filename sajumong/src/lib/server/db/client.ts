import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL, type User, type SajuData, type ChatSession, type ChatMessage, type DailyFortuneRecord, type ChatSummary, type UserMemory } from './schema';
import type { SajuResult } from '../saju/calculator';
import type { DailyFortune } from '../saju/fortune';
import { randomUUID } from 'crypto';

// 데이터베이스 인스턴스
let db: Database.Database | null = null;

// 데이터베이스 초기화
export function initDatabase(dbPath: string = './data/sajumong.db'): Database.Database {
  if (db) return db;

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 테이블 생성
  db.exec(CREATE_TABLES_SQL);

  return db;
}

// 데이터베이스 인스턴스 가져오기
export function getDatabase(): Database.Database {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

// ============ 사용자 관련 함수 ============

// 사용자 생성
export function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, name, birth_year, birth_month, birth_day, birth_hour, gender, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, userData.name, userData.birthYear, userData.birthMonth, userData.birthDay, userData.birthHour, userData.gender, now, now);

  return {
    id,
    ...userData,
    createdAt: now,
    updatedAt: now
  };
}

// 사용자 조회 (ID로)
export function getUserById(id: string): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    birthYear: row.birth_year as number,
    birthMonth: row.birth_month as number,
    birthDay: row.birth_day as number,
    birthHour: row.birth_hour as number,
    gender: row.gender as 'male' | 'female',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// 첫 번째 사용자 가져오기 (단일 사용자 모드용)
export function getFirstUser(): User | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at ASC LIMIT 1');
  const row = stmt.get() as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    birthYear: row.birth_year as number,
    birthMonth: row.birth_month as number,
    birthDay: row.birth_day as number,
    birthHour: row.birth_hour as number,
    gender: row.gender as 'male' | 'female',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// 사용자 업데이트
export function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): User | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (userData.name !== undefined) {
    fields.push('name = ?');
    values.push(userData.name);
  }
  if (userData.birthYear !== undefined) {
    fields.push('birth_year = ?');
    values.push(userData.birthYear);
  }
  if (userData.birthMonth !== undefined) {
    fields.push('birth_month = ?');
    values.push(userData.birthMonth);
  }
  if (userData.birthDay !== undefined) {
    fields.push('birth_day = ?');
    values.push(userData.birthDay);
  }
  if (userData.birthHour !== undefined) {
    fields.push('birth_hour = ?');
    values.push(userData.birthHour);
  }
  if (userData.gender !== undefined) {
    fields.push('gender = ?');
    values.push(userData.gender);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getUserById(id);
}

// ============ 사주 데이터 관련 함수 ============

// 사주 데이터 저장
export function saveSajuData(userId: string, saju: SajuResult): SajuData {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO saju_data (id, user_id, year_pillar, month_pillar, day_pillar, hour_pillar, animal, ohaeng_count, calculated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    userId,
    saju.yearPillar.fullName,
    saju.monthPillar.fullName,
    saju.dayPillar.fullName,
    saju.hourPillar.fullName,
    saju.animal,
    JSON.stringify(saju.ohaengCount),
    now
  );

  return {
    id,
    userId,
    yearPillar: saju.yearPillar.fullName,
    monthPillar: saju.monthPillar.fullName,
    dayPillar: saju.dayPillar.fullName,
    hourPillar: saju.hourPillar.fullName,
    animal: saju.animal,
    ohaengCount: JSON.stringify(saju.ohaengCount),
    calculatedAt: now
  };
}

// 사용자의 사주 데이터 조회
export function getSajuDataByUserId(userId: string): SajuData | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM saju_data WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1');
  const row = stmt.get(userId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    yearPillar: row.year_pillar as string,
    monthPillar: row.month_pillar as string,
    dayPillar: row.day_pillar as string,
    hourPillar: row.hour_pillar as string,
    animal: row.animal as string,
    ohaengCount: row.ohaeng_count as string,
    calculatedAt: row.calculated_at as string
  };
}

// ============ 채팅 세션 관련 함수 ============

// 새 채팅 세션 생성
export function createChatSession(userId: string, title: string = '새 대화'): ChatSession {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, title, now, now);

  return {
    id,
    userId,
    title,
    createdAt: now,
    updatedAt: now
  };
}

// 사용자의 모든 채팅 세션 조회
export function getChatSessions(userId: string): ChatSession[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM chat_sessions
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all(userId) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }));
}

// 채팅 세션 조회 (ID로)
export function getChatSessionById(sessionId: string): ChatSession | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
  const row = stmt.get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// 채팅 세션 제목 업데이트
export function updateChatSessionTitle(sessionId: string, title: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?');
  stmt.run(title, now, sessionId);
}

// 채팅 세션 삭제
export function deleteChatSession(sessionId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM chat_sessions WHERE id = ?');
  stmt.run(sessionId);
}

// 사용자의 현재 세션 가져오기 (없으면 생성)
export function getOrCreateCurrentSession(userId: string): ChatSession {
  const sessions = getChatSessions(userId);
  if (sessions.length > 0) {
    return sessions[0]; // 가장 최근 세션
  }
  return createChatSession(userId);
}

// ============ 채팅 메시지 관련 함수 ============

// 채팅 메시지 저장
export function saveChatMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string): ChatMessage {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO chat_messages (id, session_id, user_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, sessionId, userId, role, content, now);

  // 세션 업데이트 시간 갱신
  const updateStmt = db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?');
  updateStmt.run(now, sessionId);

  return {
    id,
    sessionId,
    userId,
    role,
    content,
    createdAt: now
  };
}

// 세션의 채팅 기록 조회
export function getChatHistory(sessionId: string, limit: number = 50): ChatMessage[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM chat_messages
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(sessionId, limit) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string
  })).reverse();
}

// 마지막 메시지 삭제 (다시 생성용)
export function deleteLastAssistantMessage(sessionId: string): ChatMessage | null {
  const db = getDatabase();

  // 마지막 assistant 메시지 찾기
  const findStmt = db.prepare(`
    SELECT * FROM chat_messages
    WHERE session_id = ? AND role = 'assistant'
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const row = findStmt.get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  // 삭제
  const deleteStmt = db.prepare('DELETE FROM chat_messages WHERE id = ?');
  deleteStmt.run(row.id);

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string
  };
}

// 마지막 사용자 메시지 가져오기
export function getLastUserMessage(sessionId: string): ChatMessage | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM chat_messages
    WHERE session_id = ? AND role = 'user'
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const row = stmt.get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string
  };
}

// 세션의 채팅 기록 전체 삭제
export function clearChatHistory(sessionId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM chat_messages WHERE session_id = ?');
  stmt.run(sessionId);
}

// ============ 일일 운세 관련 함수 ============

// 일일 운세 저장
export function saveDailyFortune(userId: string, fortune: DailyFortune): DailyFortuneRecord {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  // 기존 오늘 운세가 있으면 업데이트, 없으면 삽입
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO daily_fortunes
    (id, user_id, fortune_date, today_pillar, overall_score, love_score, money_score, health_score, work_score, advice, lucky_color, lucky_number, lucky_direction, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    userId,
    fortune.date,
    fortune.todayPillar,
    fortune.categories.overall,
    fortune.categories.love,
    fortune.categories.money,
    fortune.categories.health,
    fortune.categories.work,
    fortune.advice,
    fortune.luckyColor,
    fortune.luckyNumber,
    fortune.luckyDirection,
    now
  );

  return {
    id,
    userId,
    fortuneDate: fortune.date,
    todayPillar: fortune.todayPillar,
    overallScore: fortune.categories.overall,
    loveScore: fortune.categories.love,
    moneyScore: fortune.categories.money,
    healthScore: fortune.categories.health,
    workScore: fortune.categories.work,
    advice: fortune.advice,
    luckyColor: fortune.luckyColor,
    luckyNumber: fortune.luckyNumber,
    luckyDirection: fortune.luckyDirection,
    createdAt: now
  };
}

// 오늘의 운세 조회
export function getTodayFortune(userId: string): DailyFortuneRecord | null {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    SELECT * FROM daily_fortunes
    WHERE user_id = ? AND fortune_date = ?
  `);

  const row = stmt.get(userId, today) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    fortuneDate: row.fortune_date as string,
    todayPillar: row.today_pillar as string,
    overallScore: row.overall_score as number,
    loveScore: row.love_score as number,
    moneyScore: row.money_score as number,
    healthScore: row.health_score as number,
    workScore: row.work_score as number,
    advice: row.advice as string,
    luckyColor: row.lucky_color as string,
    luckyNumber: row.lucky_number as number,
    luckyDirection: row.lucky_direction as string,
    createdAt: row.created_at as string
  };
}

// ============ 대화 요약 관련 함수 (Summarization) ============

// 대화 요약 저장
export function saveChatSummary(sessionId: string, messageCount: number, summary: string): ChatSummary {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  // 기존 요약이 있으면 업데이트, 없으면 삽입
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO chat_summaries (id, session_id, message_count, summary, created_at)
    VALUES (
      COALESCE((SELECT id FROM chat_summaries WHERE session_id = ?), ?),
      ?, ?, ?, ?
    )
  `);

  stmt.run(sessionId, id, sessionId, messageCount, summary, now);

  return {
    id,
    sessionId,
    messageCount,
    summary,
    createdAt: now
  };
}

// 세션의 대화 요약 조회
export function getChatSummary(sessionId: string): ChatSummary | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chat_summaries WHERE session_id = ?');
  const row = stmt.get(sessionId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    messageCount: row.message_count as number,
    summary: row.summary as string,
    createdAt: row.created_at as string
  };
}

// 세션의 메시지 수 조회
export function getMessageCount(sessionId: string): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE session_id = ?');
  const row = stmt.get(sessionId) as { count: number };
  return row.count;
}

// ============ 사용자 메모리 관련 함수 (Memory Formation) ============

// 사용자 메모리 저장
export function saveUserMemory(
  userId: string,
  category: 'preference' | 'concern' | 'personal' | 'context',
  content: string,
  sourceSessionId: string | null = null
): UserMemory {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  // 중복 방지: 같은 내용이 이미 있으면 저장하지 않음
  const existingStmt = db.prepare(`
    SELECT id FROM user_memories
    WHERE user_id = ? AND content = ?
  `);
  const existing = existingStmt.get(userId, content);

  if (existing) {
    // 이미 있으면 기존 것 반환
    return getUserMemoryById((existing as { id: string }).id)!;
  }

  const stmt = db.prepare(`
    INSERT INTO user_memories (id, user_id, category, content, source_session_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, category, content, sourceSessionId, now);

  return {
    id,
    userId,
    category,
    content,
    sourceSessionId,
    createdAt: now
  };
}

// 메모리 ID로 조회
function getUserMemoryById(id: string): UserMemory | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM user_memories WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as 'preference' | 'concern' | 'personal' | 'context',
    content: row.content as string,
    sourceSessionId: row.source_session_id as string | null,
    createdAt: row.created_at as string
  };
}

// 사용자의 모든 메모리 조회
export function getUserMemories(userId: string, limit: number = 20): UserMemory[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM user_memories
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(userId, limit) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as 'preference' | 'concern' | 'personal' | 'context',
    content: row.content as string,
    sourceSessionId: row.source_session_id as string | null,
    createdAt: row.created_at as string
  }));
}

// 카테고리별 메모리 조회
export function getUserMemoriesByCategory(
  userId: string,
  category: 'preference' | 'concern' | 'personal' | 'context'
): UserMemory[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM user_memories
    WHERE user_id = ? AND category = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(userId, category) as Record<string, unknown>[];

  return rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as 'preference' | 'concern' | 'personal' | 'context',
    content: row.content as string,
    sourceSessionId: row.source_session_id as string | null,
    createdAt: row.created_at as string
  }));
}

// 메모리 삭제
export function deleteUserMemory(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM user_memories WHERE id = ?');
  stmt.run(id);
}

// 사용자의 모든 메모리 삭제
export function clearUserMemories(userId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM user_memories WHERE user_id = ?');
  stmt.run(userId);
}

// 데이터베이스 닫기
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
