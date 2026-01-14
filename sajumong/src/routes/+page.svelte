<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';

  // marked 설정
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  // 상태 관리
  let currentView: 'chat' | 'saju' | 'fortune' = 'chat';
  let isLoading = false;
  let error = '';
  let showSidebar = false;

  // 사용자 & 사주 정보
  let hasUser = false;
  let userName = '';
  let sajuInfo: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    animal: string;
    ohaengCount: Record<string, number>;
    summary: string;
  } | null = null;

  // 사주 입력 폼
  let formName = '';
  let formYear = 1990;
  let formMonth = 1;
  let formDay = 1;
  let formHour = 12;
  let formGender: 'male' | 'female' = 'male';

  // 채팅 관련
  let messages: Array<{ id?: string; role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let sessions: Array<{ id: string; title: string; updatedAt: string }> = [];
  let currentSessionId: string | null = null;
  let inputMessage = '';
  let chatContainer: HTMLDivElement;

  // 운세 관련
  let fortune: {
    date: string;
    todayPillar: string;
    categories: {
      overall: number;
      love: number;
      money: number;
      health: number;
      work: number;
    };
    advice: string;
    luckyColor: string;
    luckyNumber: number;
    luckyDirection: string;
  } | null = null;

  onMount(async () => {
    await loadSajuInfo();
    await loadChatData();
  });

  async function loadSajuInfo() {
    try {
      const res = await fetch('/api/saju');
      const data = await res.json();

      if (data.success && data.hasUser) {
        hasUser = true;
        userName = data.user.name;
        sajuInfo = data.saju;

        formName = data.user.name;
        formYear = data.user.birthYear;
        formMonth = data.user.birthMonth;
        formDay = data.user.birthDay;
        formHour = data.user.birthHour;
        formGender = data.user.gender;
      }
    } catch (e) {
      console.error('사주 정보 로드 실패:', e);
    }
  }

  async function loadChatData(sessionId?: string) {
    try {
      const url = sessionId ? `/api/chat?sessionId=${sessionId}` : '/api/chat';
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        sessions = data.sessions || [];
        messages = data.messages || [];
        currentSessionId = data.currentSessionId;
        scrollToBottom();
      }
    } catch (e) {
      console.error('채팅 데이터 로드 실패:', e);
    }
  }

  async function saveSaju() {
    if (!formName.trim()) {
      error = '이름을 입력해주세요.';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          birthYear: formYear,
          birthMonth: formMonth,
          birthDay: formDay,
          birthHour: formHour,
          gender: formGender
        })
      });

      const data = await res.json();

      if (data.success) {
        hasUser = true;
        userName = data.user.name;
        sajuInfo = data.saju;
        currentView = 'chat';
      } else {
        error = data.message || '등록에 실패했습니다.';
      }
    } catch (e) {
      error = '서버 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    inputMessage = '';

    messages = [...messages, {
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }];
    scrollToBottom();

    isLoading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        messages = [...messages, {
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString()
        }];
        currentSessionId = data.sessionId;
        // 세션 목록 새로고침
        await loadChatData(currentSessionId);
      } else {
        messages = [...messages, {
          role: 'assistant',
          content: '죄송합니다. 응답을 생성하는 데 문제가 발생했습니다.',
          createdAt: new Date().toISOString()
        }];
      }
    } catch (e) {
      messages = [...messages, {
        role: 'assistant',
        content: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
        createdAt: new Date().toISOString()
      }];
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }

  // 다시 생성
  async function regenerateResponse() {
    if (isLoading || !currentSessionId) return;

    // 마지막 assistant 메시지 UI에서 제거
    const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
    if (lastAssistantIndex === -1) return;

    messages = messages.slice(0, lastAssistantIndex);
    isLoading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          sessionId: currentSessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        messages = [...messages, {
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString()
        }];
      } else {
        messages = [...messages, {
          role: 'assistant',
          content: '죄송합니다. 다시 생성하는 데 문제가 발생했습니다.',
          createdAt: new Date().toISOString()
        }];
      }
    } catch (e) {
      messages = [...messages, {
        role: 'assistant',
        content: '서버 연결에 실패했습니다.',
        createdAt: new Date().toISOString()
      }];
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }

  // 새 대화 시작
  async function startNewChat() {
    try {
      const res = await fetch('/api/chat', { method: 'PUT' });
      const data = await res.json();

      if (data.success) {
        currentSessionId = data.session.id;
        messages = [];
        await loadChatData(currentSessionId);
        showSidebar = false;
      }
    } catch (e) {
      console.error('새 대화 생성 실패:', e);
    }
  }

  // 세션 선택
  async function selectSession(sessionId: string) {
    currentSessionId = sessionId;
    await loadChatData(sessionId);
    showSidebar = false;
  }

  // 세션 삭제
  async function deleteSession(sessionId: string, event: Event) {
    event.stopPropagation();

    if (!confirm('이 대화를 삭제하시겠습니까?')) return;

    try {
      await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' });
      sessions = sessions.filter(s => s.id !== sessionId);

      if (currentSessionId === sessionId) {
        if (sessions.length > 0) {
          await selectSession(sessions[0].id);
        } else {
          currentSessionId = null;
          messages = [];
        }
      }
    } catch (e) {
      console.error('세션 삭제 실패:', e);
    }
  }

  async function loadFortune() {
    if (!hasUser) {
      error = '먼저 사주를 등록해주세요.';
      currentView = 'saju';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const res = await fetch('/api/fortune');
      const data = await res.json();

      if (data.success) {
        fortune = data.fortune;
      } else {
        error = data.message || '운세를 불러오는 데 실패했습니다.';
      }
    } catch (e) {
      error = '서버 오류가 발생했습니다.';
    } finally {
      isLoading = false;
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#8b5cf6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  // 마지막 메시지가 assistant인지 확인
  $: canRegenerate = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant';
</script>

<div class="app-container">
  <!-- 사이드바 -->
  <aside class="sidebar" class:open={showSidebar}>
    <div class="sidebar-header">
      <h2>대화 목록</h2>
      <button class="close-btn" onclick={() => showSidebar = false}>✕</button>
    </div>

    <button class="new-chat-btn" onclick={startNewChat}>
      ➕ 새 대화
    </button>

    <div class="session-list">
      {#each sessions as session}
        <div
          class="session-item"
          class:active={session.id === currentSessionId}
          onclick={() => selectSession(session.id)}
        >
          <div class="session-info">
            <span class="session-title">{session.title}</span>
            <span class="session-date">{formatDate(session.updatedAt)}</span>
          </div>
          <button class="delete-session-btn" onclick={(e) => deleteSession(session.id, e)}>
            🗑️
          </button>
        </div>
      {/each}

      {#if sessions.length === 0}
        <div class="no-sessions">
          아직 대화가 없습니다
        </div>
      {/if}
    </div>
  </aside>

  <!-- 사이드바 오버레이 -->
  {#if showSidebar}
    <div class="sidebar-overlay" onclick={() => showSidebar = false}></div>
  {/if}

  <!-- 메인 영역 -->
  <div class="main-area">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-left">
        {#if currentView === 'chat'}
          <button class="menu-btn" onclick={() => showSidebar = true}>☰</button>
        {/if}
        <h1 class="logo">🔮 사주몽</h1>
      </div>
      <nav class="nav">
        <button
          class="nav-btn"
          class:active={currentView === 'chat'}
          onclick={() => currentView = 'chat'}
        >
          💬 채팅
        </button>
        <button
          class="nav-btn"
          class:active={currentView === 'fortune'}
          onclick={() => { currentView = 'fortune'; loadFortune(); }}
        >
          ✨ 운세
        </button>
        <button
          class="nav-btn"
          class:active={currentView === 'saju'}
          onclick={() => currentView = 'saju'}
        >
          📋 사주
        </button>
      </nav>
    </header>

    <!-- 메인 컨텐츠 -->
    <main class="main-content">
      {#if error}
        <div class="error-banner">
          {error}
          <button class="error-close" onclick={() => error = ''}>✕</button>
        </div>
      {/if}

      <!-- 채팅 뷰 -->
      {#if currentView === 'chat'}
        <div class="chat-view">
          {#if !hasUser}
            <div class="welcome-message">
              <h2>🔮 사주몽에 오신 것을 환영합니다!</h2>
              <p>AI 사주 상담을 시작하려면 먼저 사주 정보를 등록해주세요.</p>
              <button class="primary-btn" onclick={() => currentView = 'saju'}>
                사주 등록하기
              </button>
            </div>
          {:else}
            <div class="chat-container" bind:this={chatContainer}>
              {#if messages.length === 0}
                <div class="chat-welcome">
                  <p>👋 안녕하세요, <strong>{userName}</strong>님!</p>
                  <p>저는 사주몽이에요. 사주에 관해 궁금한 것이 있으면 무엇이든 물어보세요.</p>
                </div>
              {/if}

              {#each messages as message, index}
                <div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
                  <div class="message-content">
                    {#if message.role === 'assistant'}
                      {@html renderMarkdown(message.content)}
                    {:else}
                      {message.content}
                    {/if}
                  </div>
                  {#if message.role === 'assistant' && index === messages.length - 1 && !isLoading}
                    <div class="message-actions">
                      <button class="action-btn" onclick={regenerateResponse} title="다시 생성">
                        🔄 다시 생성
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}

              {#if isLoading}
                <div class="message assistant">
                  <div class="message-content typing">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                  </div>
                </div>
              {/if}
            </div>

            <div class="chat-input-container">
              <textarea
                class="chat-input"
                bind:value={inputMessage}
                onkeydown={handleKeydown}
                placeholder="메시지를 입력하세요..."
                rows="1"
                disabled={isLoading}
              ></textarea>
              <button
                class="send-btn"
                onclick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                전송
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 운세 뷰 -->
      {#if currentView === 'fortune'}
        <div class="fortune-view">
          {#if isLoading}
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>오늘의 운세를 불러오는 중...</p>
            </div>
          {:else if fortune}
            <div class="fortune-card">
              <h2>✨ {fortune.date} 운세</h2>
              <p class="today-pillar">오늘의 일진: <strong>{fortune.todayPillar}</strong></p>

              <div class="fortune-scores">
                {#each [
                  { label: '🔮 총운', score: fortune.categories.overall },
                  { label: '💕 애정운', score: fortune.categories.love },
                  { label: '💰 금전운', score: fortune.categories.money },
                  { label: '🏥 건강운', score: fortune.categories.health },
                  { label: '💼 직장운', score: fortune.categories.work }
                ] as item}
                  <div class="score-item">
                    <span class="score-label">{item.label}</span>
                    <div class="score-bar">
                      <div class="score-fill" style="width: {item.score}%; background-color: {getScoreColor(item.score)}"></div>
                    </div>
                    <span class="score-value">{item.score}점</span>
                  </div>
                {/each}
              </div>

              <div class="fortune-advice">
                <h3>📝 오늘의 조언</h3>
                <p>{fortune.advice}</p>
              </div>

              <div class="lucky-items">
                <div class="lucky-item">
                  <span class="lucky-label">🎨 행운의 색</span>
                  <span class="lucky-value">{fortune.luckyColor}</span>
                </div>
                <div class="lucky-item">
                  <span class="lucky-label">🔢 행운의 숫자</span>
                  <span class="lucky-value">{fortune.luckyNumber}</span>
                </div>
                <div class="lucky-item">
                  <span class="lucky-label">🧭 행운의 방향</span>
                  <span class="lucky-value">{fortune.luckyDirection}</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="empty-fortune">
              <p>운세 정보를 불러올 수 없습니다.</p>
              <button class="primary-btn" onclick={loadFortune}>다시 시도</button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 사주 뷰 -->
      {#if currentView === 'saju'}
        <div class="saju-view">
          <div class="saju-form-card">
            <h2>📋 사주 정보 {hasUser ? '수정' : '등록'}</h2>

            <div class="form-group">
              <label for="name">이름</label>
              <input type="text" id="name" bind:value={formName} placeholder="이름을 입력하세요" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="year">출생년도</label>
                <input type="number" id="year" bind:value={formYear} min="1900" max={new Date().getFullYear()} />
              </div>
              <div class="form-group">
                <label for="month">월</label>
                <select id="month" bind:value={formMonth}>
                  {#each Array(12) as _, i}
                    <option value={i + 1}>{i + 1}월</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="day">일</label>
                <select id="day" bind:value={formDay}>
                  {#each Array(31) as _, i}
                    <option value={i + 1}>{i + 1}일</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="hour">출생시간</label>
                <select id="hour" bind:value={formHour}>
                  {#each Array(24) as _, i}
                    <option value={i}>{i}시 ({getTimeSlot(i)})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="gender">성별</label>
                <div class="gender-options" id="gender">
                  <label class="gender-option">
                    <input type="radio" bind:group={formGender} value="male" />
                    <span>남성</span>
                  </label>
                  <label class="gender-option">
                    <input type="radio" bind:group={formGender} value="female" />
                    <span>여성</span>
                  </label>
                </div>
              </div>
            </div>

            <button class="primary-btn full-width" onclick={saveSaju} disabled={isLoading}>
              {isLoading ? '저장 중...' : (hasUser ? '수정하기' : '등록하기')}
            </button>
          </div>

          {#if sajuInfo}
            <div class="saju-info-card">
              <h2>🔮 나의 사주팔자</h2>

              <div class="pillars">
                {#each [
                  { label: '년주', value: sajuInfo.yearPillar },
                  { label: '월주', value: sajuInfo.monthPillar },
                  { label: '일주', value: sajuInfo.dayPillar, highlight: true },
                  { label: '시주', value: sajuInfo.hourPillar }
                ] as pillar}
                  <div class="pillar">
                    <span class="pillar-label">{pillar.label}</span>
                    <span class="pillar-value" class:highlight={pillar.highlight}>{pillar.value}</span>
                  </div>
                {/each}
              </div>

              <div class="animal-info">
                <span>🐾 띠: {sajuInfo.animal}띠</span>
              </div>

              <div class="ohaeng-chart">
                <h3>오행 분포</h3>
                <div class="ohaeng-bars">
                  {#each Object.entries(sajuInfo.ohaengCount) as [ohaeng, count]}
                    <div class="ohaeng-bar-item">
                      <span class="ohaeng-name">{ohaeng}</span>
                      <div class="ohaeng-bar">
                        <div
                          class="ohaeng-fill"
                          style="width: {(count as number) * 12.5}%"
                          class:wood={ohaeng === '목'}
                          class:fire={ohaeng === '화'}
                          class:earth={ohaeng === '토'}
                          class:metal={ohaeng === '금'}
                          class:water={ohaeng === '수'}
                        ></div>
                      </div>
                      <span class="ohaeng-count">{count}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </main>
  </div>
</div>

<script lang="ts" context="module">
  function getTimeSlot(hour: number): string {
    if (hour >= 23 || hour < 1) return '자시';
    if (hour < 3) return '축시';
    if (hour < 5) return '인시';
    if (hour < 7) return '묘시';
    if (hour < 9) return '진시';
    if (hour < 11) return '사시';
    if (hour < 13) return '오시';
    if (hour < 15) return '미시';
    if (hour < 17) return '신시';
    if (hour < 19) return '유시';
    if (hour < 21) return '술시';
    return '해시';
  }
</script>

<style>
  /* ==================== Dieter Rams Style - Less but better ==================== */
  .app-container {
    display: flex;
    height: 100vh;
    background: var(--bg);
  }

  /* ==================== Sidebar ==================== */
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 320px;
    height: 100vh;
    background: var(--surface);
    border-right: 1px solid var(--border);
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    z-index: 100;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 99;
    backdrop-filter: blur(2px);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 14px;
  }

  .close-btn:hover {
    background: var(--gray-100);
    color: var(--text);
  }

  .new-chat-btn {
    margin: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--gray-800);
    color: var(--white);
    font-weight: 500;
    font-size: 14px;
    border-radius: var(--radius-md);
  }

  .new-chat-btn:hover {
    background: var(--gray-700);
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-1);
  }

  .session-item:hover {
    background: var(--gray-100);
  }

  .session-item.active {
    background: var(--gray-800);
    color: var(--white);
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-date {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .session-item.active .session-date {
    color: var(--gray-400);
  }

  .delete-session-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    font-size: 12px;
    border-radius: var(--radius-sm);
  }

  .session-item:hover .delete-session-btn {
    opacity: 1;
  }

  .delete-session-btn:hover {
    background: var(--gray-200);
  }

  .no-sessions {
    text-align: center;
    padding: var(--space-12);
    color: var(--text-muted);
    font-size: 14px;
  }

  /* ==================== Main Area ==================== */
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  /* ==================== Header ==================== */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .menu-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 18px;
  }

  .menu-btn:hover {
    background: var(--gray-100);
    color: var(--text);
  }

  .logo {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .nav {
    display: flex;
    gap: var(--space-1);
    background: var(--gray-100);
    padding: var(--space-1);
    border-radius: var(--radius-lg);
  }

  .nav-btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .nav-btn:hover {
    color: var(--text);
  }

  .nav-btn.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  /* ==================== Main Content ==================== */
  .main-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-6);
    background: #fef2f2;
    color: #dc2626;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid #fecaca;
  }

  .error-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .error-close:hover {
    background: #fecaca;
  }

  /* ==================== Chat View ==================== */
  .chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .welcome-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    text-align: center;
  }

  .welcome-message h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: var(--space-3);
    color: var(--text);
  }

  .welcome-message p {
    margin-bottom: var(--space-6);
    color: var(--text-secondary);
    font-size: 15px;
    max-width: 360px;
    line-height: 1.6;
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .chat-welcome {
    text-align: center;
    padding: var(--space-10);
    color: var(--text-secondary);
  }

  .chat-welcome strong {
    color: var(--text);
    font-weight: 600;
  }

  .message {
    max-width: 75%;
    line-height: 1.6;
  }

  .message.user {
    align-self: flex-end;
    background: var(--gray-800);
    color: var(--white);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  }

  .message.assistant {
    align-self: flex-start;
    background: var(--surface);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
  }

  .message-content {
    word-break: break-word;
    font-size: 15px;
  }

  .message-content :global(p) {
    margin: 0 0 var(--space-3) 0;
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content :global(strong) {
    font-weight: 600;
  }

  .message-content :global(em) {
    font-style: italic;
  }

  .message-content :global(ul), .message-content :global(ol) {
    margin: var(--space-3) 0;
    padding-left: var(--space-5);
  }

  .message-content :global(li) {
    margin: var(--space-2) 0;
  }

  .message-content :global(code) {
    background: var(--gray-100);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 13px;
  }

  .message-content :global(pre) {
    background: var(--gray-100);
    padding: var(--space-4);
    overflow-x: auto;
    margin: var(--space-3) 0;
    border-radius: var(--radius-md);
  }

  .message-content :global(pre code) {
    padding: 0;
    background: none;
  }

  .message-actions {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }

  .action-btn {
    color: var(--text-muted);
    font-size: 13px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
  }

  .action-btn:hover {
    background: var(--gray-100);
    color: var(--text-secondary);
  }

  .typing {
    display: flex;
    gap: 6px;
    padding: var(--space-2) 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--gray-400);
    border-radius: var(--radius-full);
    animation: blink 1.2s ease-in-out infinite;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes blink {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .chat-input-container {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    background: var(--surface);
    border-top: 1px solid var(--border);
  }

  .chat-input {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    background: var(--gray-50);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--text);
    resize: none;
    overflow: hidden;
    font-size: 15px;
  }

  .chat-input::placeholder {
    color: var(--text-muted);
  }

  .chat-input:focus {
    background: var(--white);
    border-color: var(--gray-300);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  }

  .send-btn {
    padding: var(--space-3) var(--space-5);
    background: var(--gray-800);
    color: var(--white);
    font-weight: 500;
    font-size: 14px;
    border-radius: var(--radius-lg);
  }

  .send-btn:hover:not(:disabled) {
    background: var(--gray-700);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ==================== Fortune View ==================== */
  .fortune-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--gray-200);
    border-top-color: var(--gray-600);
    border-radius: var(--radius-full);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .fortune-card {
    background: var(--surface);
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
  }

  .fortune-card h2 {
    text-align: center;
    margin-bottom: var(--space-2);
    font-size: 20px;
    font-weight: 600;
  }

  .today-pillar {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: var(--space-8);
    font-size: 14px;
  }

  .today-pillar strong {
    color: var(--text);
    font-weight: 600;
  }

  .fortune-scores {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  .score-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .score-label {
    width: 80px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .score-bar {
    flex: 1;
    height: 8px;
    background: var(--gray-100);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.5s ease;
  }

  .score-value {
    width: 40px;
    text-align: right;
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }

  .fortune-advice {
    background: var(--gray-50);
    padding: var(--space-5);
    margin-bottom: var(--space-6);
    border-radius: var(--radius-lg);
  }

  .fortune-advice h3 {
    margin-bottom: var(--space-3);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .fortune-advice p {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 14px;
  }

  .lucky-items {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .lucky-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .lucky-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .lucky-value {
    font-weight: 600;
    font-size: 16px;
    color: var(--text);
  }

  .empty-fortune {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--space-4);
    color: var(--text-secondary);
  }

  /* ==================== Saju View ==================== */
  .saju-view {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .saju-form-card, .saju-info-card {
    background: var(--surface);
    padding: var(--space-6);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
  }

  .saju-form-card h2, .saju-info-card h2 {
    margin-bottom: var(--space-6);
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: var(--gray-50);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 15px;
  }

  .form-group input:focus,
  .form-group select:focus {
    background: var(--white);
    border-color: var(--gray-300);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-4);
  }

  .gender-options {
    display: flex;
    gap: var(--space-6);
    padding-top: var(--space-2);
  }

  .gender-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .gender-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--gray-800);
  }

  .primary-btn {
    padding: var(--space-3) var(--space-6);
    background: var(--gray-800);
    color: var(--white);
    font-weight: 500;
    font-size: 14px;
    border-radius: var(--radius-md);
  }

  .primary-btn:hover:not(:disabled) {
    background: var(--gray-700);
  }

  .primary-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .primary-btn.full-width {
    width: 100%;
    margin-top: var(--space-4);
  }

  .pillars {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .pillar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .pillar-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
  }

  .pillar-value {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
  }

  .pillar-value.highlight {
    color: var(--accent);
  }

  .animal-info {
    text-align: center;
    margin-bottom: var(--space-6);
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .ohaeng-chart h3 {
    margin-bottom: var(--space-4);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .ohaeng-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .ohaeng-bar-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .ohaeng-name {
    width: 28px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }

  .ohaeng-bar {
    flex: 1;
    height: 24px;
    background: var(--gray-100);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .ohaeng-fill {
    height: 100%;
    border-radius: var(--radius-sm);
  }

  .ohaeng-fill.wood { background: #22c55e; }
  .ohaeng-fill.fire { background: #ef4444; }
  .ohaeng-fill.earth { background: #eab308; }
  .ohaeng-fill.metal { background: var(--gray-400); }
  .ohaeng-fill.water { background: #3b82f6; }

  .ohaeng-count {
    width: 24px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }

  /* ==================== Responsive ==================== */
  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .header-left {
      width: 100%;
      justify-content: space-between;
    }

    .nav {
      width: 100%;
    }

    .nav-btn {
      flex: 1;
      text-align: center;
      font-size: 13px;
      padding: var(--space-2) var(--space-3);
    }

    .pillars {
      grid-template-columns: repeat(2, 1fr);
    }

    .lucky-items {
      grid-template-columns: 1fr;
    }

    .message {
      max-width: 85%;
    }

    .chat-input-container {
      padding: var(--space-4);
    }

    .fortune-view, .saju-view {
      padding: var(--space-4);
    }
  }
</style>
