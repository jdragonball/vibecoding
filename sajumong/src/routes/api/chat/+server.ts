import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateChatResponse, summarizeMessages, extractMemories } from '$lib/server/ai/claude';
import {
  getFirstUser,
  getChatHistory,
  saveChatMessage,
  getSajuDataByUserId,
  getOrCreateCurrentSession,
  getChatSessions,
  createChatSession,
  deleteChatSession,
  deleteLastAssistantMessage,
  getLastUserMessage,
  updateChatSessionTitle,
  // Summarization
  getChatSummary,
  saveChatSummary,
  getMessageCount,
  // Memory
  getUserMemories,
  saveUserMemory
} from '$lib/server/db/client';

// 요약 트리거 메시지 수 (이 수를 초과하면 요약 생성)
const SUMMARY_TRIGGER_COUNT = 15;
// 최근 유지할 메시지 수 (요약 후에도 원본 유지)
const RECENT_MESSAGES_COUNT = 10;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, sessionId, action } = body;

    // 사용자 조회
    const user = getFirstUser();
    if (!user) {
      throw error(404, '사용자 정보가 없습니다. 먼저 사주를 등록해주세요.');
    }

    // 세션 가져오기
    let session;
    if (sessionId) {
      session = { id: sessionId, userId: user.id };
    } else {
      session = getOrCreateCurrentSession(user.id);
    }

    // 다시 생성 액션
    if (action === 'regenerate') {
      // 마지막 assistant 메시지 삭제
      deleteLastAssistantMessage(session.id);

      // 마지막 user 메시지 가져오기
      const lastUserMsg = getLastUserMessage(session.id);
      if (!lastUserMsg) {
        throw error(400, '다시 생성할 메시지가 없습니다.');
      }

      // 사주 데이터 조회
      const sajuData = getSajuDataByUserId(user.id);

      // 채팅 기록 조회 (마지막 user 메시지 제외)
      const chatHistory = getChatHistory(session.id, 10);
      const historyWithoutLast = chatHistory.slice(0, -1);

      // Claude 응답 재생성
      const response = await generateChatResponse(
        lastUserMsg.content,
        historyWithoutLast,
        sajuData,
        user
      );

      // 응답 저장
      saveChatMessage(session.id, user.id, 'assistant', response);

      return json({
        success: true,
        response: response,
        sessionId: session.id
      });
    }

    // 일반 메시지 전송
    if (!message || typeof message !== 'string') {
      throw error(400, '메시지가 필요합니다.');
    }

    // 사주 데이터 조회
    const sajuData = getSajuDataByUserId(user.id);

    // 채팅 기록 조회 (최근 메시지)
    const chatHistory = getChatHistory(session.id, RECENT_MESSAGES_COUNT);

    // 기존 요약 조회
    const existingSummary = getChatSummary(session.id);

    // 사용자 메모리 조회
    const userMemories = getUserMemories(user.id, 10);
    const memoryContents = userMemories.map(m => m.content);

    // 사용자 메시지 저장
    saveChatMessage(session.id, user.id, 'user', message);

    // Claude 응답 생성 (요약과 메모리 포함)
    const response = await generateChatResponse(
      message,
      chatHistory,
      sajuData,
      user,
      {
        summary: existingSummary?.summary || null,
        memories: memoryContents
      }
    );

    // 응답 저장
    saveChatMessage(session.id, user.id, 'assistant', response);

    // 첫 메시지면 세션 제목 자동 설정
    if (chatHistory.length === 0) {
      const title = message.length > 20 ? message.substring(0, 20) + '...' : message;
      updateChatSessionTitle(session.id, title);
    }

    // 백그라운드 작업: 메시지 수가 임계값 초과 시 요약 생성
    const totalMessageCount = getMessageCount(session.id);
    if (totalMessageCount > SUMMARY_TRIGGER_COUNT) {
      // 비동기로 요약 생성 (응답 속도에 영향 없음)
      triggerSummarization(session.id, totalMessageCount).catch(err => {
        console.error('요약 생성 실패:', err);
      });
    }

    // 백그라운드 작업: 10개 메시지마다 메모리 추출
    if (totalMessageCount > 0 && totalMessageCount % 10 === 0) {
      triggerMemoryExtraction(user.id, session.id, chatHistory).catch(err => {
        console.error('메모리 추출 실패:', err);
      });
    }

    return json({
      success: true,
      response: response,
      sessionId: session.id
    });
  } catch (err) {
    console.error('채팅 API 오류:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    throw error(500, '서버 오류가 발생했습니다.');
  }
};

// 채팅 기록 및 세션 목록 조회
export const GET: RequestHandler = async ({ url }) => {
  try {
    const user = getFirstUser();
    if (!user) {
      return json({
        success: true,
        sessions: [],
        messages: [],
        currentSessionId: null
      });
    }

    const sessionId = url.searchParams.get('sessionId');

    // 세션 목록 조회
    const sessions = getChatSessions(user.id);

    // 특정 세션의 메시지 조회
    if (sessionId) {
      const chatHistory = getChatHistory(sessionId, 50);
      return json({
        success: true,
        sessions: sessions,
        messages: chatHistory,
        currentSessionId: sessionId
      });
    }

    // 현재 세션 (가장 최근)
    if (sessions.length > 0) {
      const currentSession = sessions[0];
      const chatHistory = getChatHistory(currentSession.id, 50);
      return json({
        success: true,
        sessions: sessions,
        messages: chatHistory,
        currentSessionId: currentSession.id
      });
    }

    return json({
      success: true,
      sessions: [],
      messages: [],
      currentSessionId: null
    });
  } catch (err) {
    console.error('채팅 기록 조회 오류:', err);
    throw error(500, '서버 오류가 발생했습니다.');
  }
};

// 새 세션 생성 또는 세션 삭제
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const user = getFirstUser();
    if (!user) {
      throw error(404, '사용자 정보가 없습니다.');
    }

    const sessionId = url.searchParams.get('sessionId');

    if (sessionId) {
      // 특정 세션 삭제
      deleteChatSession(sessionId);
      return json({
        success: true,
        message: '대화가 삭제되었습니다.'
      });
    }

    throw error(400, '세션 ID가 필요합니다.');
  } catch (err) {
    console.error('세션 삭제 오류:', err);
    throw error(500, '서버 오류가 발생했습니다.');
  }
};

// 새 세션 생성
export const PUT: RequestHandler = async () => {
  try {
    const user = getFirstUser();
    if (!user) {
      throw error(404, '사용자 정보가 없습니다.');
    }

    const session = createChatSession(user.id);

    return json({
      success: true,
      session: session
    });
  } catch (err) {
    console.error('세션 생성 오류:', err);
    throw error(500, '서버 오류가 발생했습니다.');
  }
};

// ============ 백그라운드 작업 함수들 ============

// 대화 요약 트리거 (백그라운드)
async function triggerSummarization(sessionId: string, totalMessageCount: number): Promise<void> {
  // 요약할 메시지 범위: 최근 10개 제외한 나머지
  const messagesToSummarize = totalMessageCount - RECENT_MESSAGES_COUNT;
  if (messagesToSummarize <= 0) return;

  // 기존 요약이 있고, 새 메시지가 5개 미만이면 스킵
  const existingSummary = getChatSummary(sessionId);
  if (existingSummary && (totalMessageCount - existingSummary.messageCount) < 5) {
    return;
  }

  // 요약할 메시지 조회 (오래된 메시지들)
  const allMessages = getChatHistory(sessionId, 50);
  const oldMessages = allMessages.slice(0, -RECENT_MESSAGES_COUNT);

  if (oldMessages.length === 0) return;

  console.log(`[Summarization] 세션 ${sessionId}: ${oldMessages.length}개 메시지 요약 시작`);

  // 요약 생성
  const summary = await summarizeMessages(oldMessages);

  if (summary) {
    // 요약 저장
    saveChatSummary(sessionId, totalMessageCount, summary);
    console.log(`[Summarization] 세션 ${sessionId}: 요약 저장 완료`);
  }
}

// 메모리 추출 트리거 (백그라운드)
async function triggerMemoryExtraction(
  userId: string,
  sessionId: string,
  recentMessages: { role: string; content: string }[]
): Promise<void> {
  console.log(`[Memory] 사용자 ${userId}: 메모리 추출 시작`);

  // 메모리 추출
  const memories = await extractMemories(recentMessages as { role: 'user' | 'assistant'; content: string; id: string; sessionId: string; userId: string; createdAt: string }[]);

  if (memories.length === 0) {
    console.log(`[Memory] 추출된 메모리 없음`);
    return;
  }

  // 메모리 저장
  for (const memory of memories) {
    saveUserMemory(userId, memory.category, memory.content, sessionId);
  }

  console.log(`[Memory] 사용자 ${userId}: ${memories.length}개 메모리 저장 완료`);
}
