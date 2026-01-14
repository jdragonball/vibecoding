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
  /* ==================== Modern Dark UI ==================== */
  .app-container {
    display: flex;
    height: 100vh;
    background: var(--bg-primary);
  }

  /* ==================== Sidebar ==================== */
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 300px;
    height: 100vh;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    display: flex;
    flex-direction: column;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 99;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-header h2 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    font-size: 1rem;
  }

  .close-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .new-chat-btn {
    margin: 1rem;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
    color: white;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .new-chat-btn:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    margin-bottom: 0.25rem;
    transition: all 0.2s ease;
  }

  .session-item:hover {
    background: var(--bg-tertiary);
  }

  .session-item.active {
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
    border: 1px solid rgba(37, 99, 235, 0.2);
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  .session-date {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .delete-session-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    opacity: 0;
    transition: all 0.2s;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
  }

  .session-item:hover .delete-session-btn {
    opacity: 1;
  }

  .delete-session-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .no-sessions {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  /* ==================== Main Area ==================== */
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    background: var(--bg-primary);
  }

  /* ==================== Header ==================== */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .menu-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    font-size: 1.25rem;
  }

  .menu-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .logo {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--primary-color);
  }

  .nav {
    display: flex;
    gap: 0.5rem;
    background: var(--bg-tertiary);
    padding: 0.25rem;
    border-radius: var(--radius-lg);
  }

  .nav-btn {
    padding: 0.625rem 1.25rem;
    background: transparent;
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .nav-btn:hover {
    color: var(--text-primary);
  }

  .nav-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
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
    padding: 0.875rem 1.25rem;
    background: linear-gradient(135deg, var(--error) 0%, #dc2626 100%);
    color: white;
    font-size: 0.9rem;
  }

  .error-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: var(--radius-sm);
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
    padding: 3rem;
    text-align: center;
  }

  .welcome-message h2 {
    font-size: 1.75rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .welcome-message p {
    margin-bottom: 2rem;
    color: var(--text-secondary);
    font-size: 1rem;
    max-width: 400px;
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .chat-welcome {
    text-align: center;
    padding: 3rem 2rem;
    color: var(--text-secondary);
  }

  .chat-welcome strong {
    color: var(--primary-color);
  }

  .message {
    max-width: 75%;
    line-height: 1.6;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .message.user {
    align-self: flex-end;
    background: var(--chat-user);
    padding: 1rem 1.25rem;
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
    color: white;
  }

  .message.assistant {
    align-self: flex-start;
    background: var(--chat-assistant);
    padding: 1rem 1.25rem;
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .message-content {
    word-break: break-word;
  }

  .message-content :global(p) {
    margin: 0 0 0.75rem 0;
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content :global(strong) {
    font-weight: 600;
    color: var(--primary-color);
  }

  .message-content :global(em) {
    font-style: italic;
    color: var(--text-secondary);
  }

  .message-content :global(ul), .message-content :global(ol) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  .message-content :global(li) {
    margin: 0.375rem 0;
  }

  .message-content :global(code) {
    background: var(--bg-elevated);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
  }

  .message-content :global(pre) {
    background: var(--bg-elevated);
    padding: 1rem;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 0.75rem 0;
    border: 1px solid var(--border-color);
  }

  .message-content :global(pre code) {
    padding: 0;
    background: none;
  }

  .message-actions {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .action-btn {
    background: var(--bg-tertiary);
    color: var(--text-muted);
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .action-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .typing {
    display: flex;
    gap: 6px;
    padding: 0.5rem 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--primary-color);
    border-radius: 50%;
    animation: pulse 1.4s infinite ease-in-out;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes pulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  .chat-input-container {
    display: flex;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }

  .chat-input {
    flex: 1;
    padding: 1rem 1.25rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    resize: none;
    font-size: 0.95rem;
  }

  .chat-input::placeholder {
    color: var(--text-muted);
  }

  .chat-input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-glow);
  }

  .send-btn {
    padding: 1rem 1.75rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
    color: white;
    border-radius: var(--radius-lg);
    font-weight: 600;
    font-size: 0.95rem;
  }

  .send-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ==================== Fortune View ==================== */
  .fortune-view {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1.5rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .fortune-card {
    background: var(--bg-secondary);
    border-radius: var(--radius-xl);
    padding: 2rem;
    border: 1px solid var(--border-color);
  }

  .fortune-card h2 {
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .today-pillar {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: 2rem;
    font-size: 0.95rem;
  }

  .today-pillar strong {
    color: var(--primary-color);
  }

  .fortune-scores {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .score-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .score-label {
    width: 90px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .score-bar {
    flex: 1;
    height: 8px;
    background: var(--bg-elevated);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .score-value {
    width: 50px;
    text-align: right;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .fortune-advice {
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
  }

  .fortune-advice h3 {
    margin-bottom: 0.75rem;
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .fortune-advice p {
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .lucky-items {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .lucky-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }

  .lucky-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .lucky-value {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--primary-color);
  }

  .empty-fortune {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1.5rem;
    color: var(--text-secondary);
  }

  /* ==================== Saju View ==================== */
  .saju-view {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .saju-form-card, .saju-info-card {
    background: var(--bg-secondary);
    border-radius: var(--radius-xl);
    padding: 2rem;
    border: 1px solid var(--border-color);
  }

  .saju-form-card h2, .saju-info-card h2 {
    margin-bottom: 2rem;
    font-size: 1.25rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.875rem 1rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  .gender-options {
    display: flex;
    gap: 1.5rem;
    padding-top: 0.5rem;
  }

  .gender-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .gender-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
  }

  .primary-btn {
    padding: 1rem 2rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
    color: white;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
  }

  .primary-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);
  }

  .primary-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .primary-btn.full-width {
    width: 100%;
    margin-top: 1.5rem;
  }

  .pillars {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .pillar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem 1rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }

  .pillar-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pillar-value {
    font-size: 1.75rem;
    font-weight: 700;
  }

  .pillar-value.highlight {
    color: var(--primary-color);
  }

  .animal-info {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 1.1rem;
    color: var(--text-secondary);
  }

  .ohaeng-chart h3 {
    margin-bottom: 1.25rem;
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .ohaeng-bars {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ohaeng-bar-item {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ohaeng-name {
    width: 32px;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .ohaeng-bar {
    flex: 1;
    height: 24px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .ohaeng-fill {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ohaeng-fill.wood { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
  .ohaeng-fill.fire { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
  .ohaeng-fill.earth { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
  .ohaeng-fill.metal { background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); }
  .ohaeng-fill.water { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }

  .ohaeng-count {
    width: 24px;
    text-align: center;
    font-weight: 600;
  }

  /* ==================== Responsive ==================== */
  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
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
      font-size: 0.8rem;
      padding: 0.5rem 0.75rem;
    }

    .pillars {
      grid-template-columns: repeat(2, 1fr);
    }

    .lucky-items {
      grid-template-columns: 1fr;
    }

    .message {
      max-width: 88%;
    }

    .chat-input-container {
      padding: 1rem;
    }

    .send-btn {
      padding: 1rem 1.25rem;
    }
  }
</style>
