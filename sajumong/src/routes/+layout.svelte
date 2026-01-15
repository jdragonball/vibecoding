<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    ChatCircle,
    ChartBar,
    Calendar,
    Sparkle,
    ClipboardText,
    Trash,
    PencilSimple,
    List,
    X
  } from 'phosphor-svelte';
  import { showSidebar, sessions, currentSessionId, hasUser, userName, error } from '$lib/stores';

  // 현재 경로 확인
  $: currentPath = $page.url.pathname;

  // 날짜 포맷
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

  // 새 대화 시작
  async function startNewChat() {
    $currentSessionId = null;
    $showSidebar = false;
    goto('/chat');
  }

  // 세션 선택
  async function selectSession(sessionId: string) {
    $currentSessionId = sessionId;
    $showSidebar = false;
    goto(`/chat?session=${sessionId}`);
  }

  // 세션 삭제
  async function deleteSession(sessionId: string, event: Event) {
    event.stopPropagation();
    if (!confirm('이 대화를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        $sessions = $sessions.filter(s => s.id !== sessionId);
        if ($currentSessionId === sessionId) {
          $currentSessionId = null;
        }
      }
    } catch (err) {
      console.error('세션 삭제 실패:', err);
    }
  }

  // 세션 목록 로드
  async function loadSessions() {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        $sessions = data.sessions || [];
      }
    } catch (err) {
      console.error('세션 목록 로드 실패:', err);
    }
  }

  // 사용자 정보 로드
  async function loadUser() {
    try {
      const res = await fetch('/api/saju');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          $hasUser = true;
          $userName = data.user.name;
        }
      }
    } catch (err) {
      console.error('사용자 정보 로드 실패:', err);
    }
  }

  onMount(() => {
    loadUser();
    loadSessions();
  });
</script>

<div class="app-wrapper">
  <div class="app-container">
    <!-- 사이드바 -->
    <aside class="sidebar" class:open={$showSidebar}>
      <div class="sidebar-header">
        <h2><Sparkle size={18} weight="fill" /> 사주몽</h2>
        <button class="new-chat-btn-small" onclick={startNewChat} title="새 대화">
          <PencilSimple size={18} />
        </button>
      </div>

      <div class="session-list">
        {#each $sessions as session}
          <div
            class="session-item"
            class:active={session.id === $currentSessionId}
            onclick={() => selectSession(session.id)}
            onkeydown={(e) => e.key === 'Enter' && selectSession(session.id)}
            role="button"
            tabindex="0"
          >
            <div class="session-info">
              <span class="session-title">{session.title}</span>
              <span class="session-date">{formatDate(session.updatedAt)}</span>
            </div>
            <button class="delete-session-btn" onclick={(e) => deleteSession(session.id, e)}>
              <Trash size={16} />
            </button>
          </div>
        {/each}

        {#if $sessions.length === 0}
          <div class="no-sessions">
            아직 대화가 없습니다
          </div>
        {/if}
      </div>
    </aside>

    <!-- 사이드바 오버레이 (모바일) -->
    {#if $showSidebar}
      <button class="sidebar-overlay" onclick={() => $showSidebar = false} aria-label="사이드바 닫기"></button>
    {/if}

    <!-- 메인 영역 -->
    <div class="main-area">
      <!-- 헤더 -->
      <header class="header">
        <div class="header-left">
          <button class="menu-btn" onclick={() => $showSidebar = true}><List size={22} /></button>
          <h1 class="logo"><Sparkle size={22} weight="fill" /> 사주몽</h1>
        </div>
        <nav class="nav">
          <a
            class="nav-btn"
            class:active={currentPath === '/chat'}
            href="/chat"
          >
            <ChatCircle size={22} weight={currentPath === '/chat' ? 'fill' : 'regular'} />
          </a>
          <a
            class="nav-btn"
            class:active={currentPath === '/dashboard'}
            href="/dashboard"
          >
            <ChartBar size={22} weight={currentPath === '/dashboard' ? 'fill' : 'regular'} />
          </a>
          <a
            class="nav-btn"
            class:active={currentPath === '/calendar'}
            href="/calendar"
          >
            <Calendar size={22} weight={currentPath === '/calendar' ? 'fill' : 'regular'} />
          </a>
          <a
            class="nav-btn"
            class:active={currentPath === '/fortune'}
            href="/fortune"
          >
            <Sparkle size={22} weight={currentPath === '/fortune' ? 'fill' : 'regular'} />
          </a>
          <a
            class="nav-btn"
            class:active={currentPath === '/saju'}
            href="/saju"
          >
            <ClipboardText size={22} weight={currentPath === '/saju' ? 'fill' : 'regular'} />
          </a>
        </nav>
      </header>

      <!-- 메인 컨텐츠 -->
      <main class="main-content">
        {#if $error}
          <div class="error-banner">
            {$error}
            <button class="error-close" onclick={() => $error = ''}><X size={16} /></button>
          </div>
        {/if}

        <slot />
      </main>
    </div>
  </div>
</div>

<style>
  /* ==================== GPT Style Layout ==================== */
  .app-wrapper {
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    background: var(--gray-100);
  }

  .app-container {
    display: flex;
    width: 100%;
    max-width: 1400px;
    height: 100vh;
    background: var(--bg);
    box-shadow: var(--shadow-lg);
    position: relative;
    overflow: hidden;
  }

  /* ==================== Sidebar ==================== */
  .sidebar {
    width: 280px;
    min-width: 280px;
    height: 100%;
    background: var(--gray-900);
    color: var(--white);
    display: flex;
    flex-direction: column;
    transition: margin-left 0.3s ease;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-4);
    border-bottom: 1px solid var(--gray-700);
  }

  .sidebar-header h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 16px;
    font-weight: 600;
    color: var(--white);
  }

  .new-chat-btn-small {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    background: var(--gray-700);
    color: var(--white);
    font-size: 16px;
    border: none;
    cursor: pointer;
  }

  .new-chat-btn-small:hover {
    background: var(--gray-600);
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .session-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-3);
    cursor: pointer;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-1);
    background: transparent;
    border: none;
    color: var(--gray-300);
    text-align: left;
  }

  .session-item:hover {
    background: var(--gray-700);
    color: var(--white);
  }

  .session-item.active {
    background: var(--gray-700);
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
    display: block;
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 2px;
  }

  .session-item.active .session-date,
  .session-item:hover .session-date {
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
    background: transparent;
    color: var(--gray-400);
    border: none;
    cursor: pointer;
  }

  .session-item:hover .delete-session-btn {
    opacity: 1;
  }

  .delete-session-btn:hover {
    background: var(--gray-600);
    color: var(--white);
  }

  .no-sessions {
    text-align: center;
    padding: var(--space-8);
    color: var(--gray-500);
    font-size: 14px;
  }

  .sidebar-overlay {
    display: none;
  }

  /* ==================== Main Area ==================== */
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--bg);
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
    display: none;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 18px;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .menu-btn:hover {
    background: var(--gray-100);
    color: var(--text);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
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
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: #fef2f2;
    border-bottom: 1px solid #fecaca;
    color: #dc2626;
    font-size: 14px;
  }

  .error-close {
    background: transparent;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: var(--space-1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-close:hover {
    background: #fecaca;
    border-radius: var(--radius-sm);
  }

  /* ==================== Mobile Responsive ==================== */
  @media (max-width: 768px) {
    .app-wrapper {
      background: var(--bg);
    }

    .app-container {
      max-width: 100%;
      box-shadow: none;
    }

    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      z-index: 100;
      transform: translateX(-100%);
      box-shadow: var(--shadow-lg);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99;
      border: none;
      cursor: pointer;
    }

    .menu-btn {
      display: flex;
    }
  }

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
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
      justify-content: center;
    }
  }
</style>
