<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { marked } from 'marked';
  import { Sparkle, ArrowsClockwise, PaperPlaneTilt } from 'phosphor-svelte';
  import { hasUser, userName, sessions, currentSessionId, isLoading, error } from '$lib/stores';

  // marked 설정
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  // 채팅 관련
  let messages: Array<{ id?: string; role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let inputMessage = '';
  let chatContainer: HTMLDivElement;

  // URL에서 세션 ID 가져오기
  $: {
    const sessionParam = $page.url.searchParams.get('session');
    if (sessionParam && sessionParam !== $currentSessionId) {
      $currentSessionId = sessionParam;
      loadChatData(sessionParam);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  async function loadChatData(sessionId: string | null) {
    try {
      // 채팅 데이터 로드 (세션 목록 + 메시지)
      const url = sessionId ? `/api/chat?sessionId=${sessionId}` : '/api/chat';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        $sessions = data.sessions || [];
        messages = data.messages || [];
        scrollToBottom();
      }
    } catch (e) {
      console.error('채팅 데이터 로드 실패:', e);
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || $isLoading) return;

    const userMessage = inputMessage.trim();
    inputMessage = '';

    messages = [...messages, {
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }];
    scrollToBottom();

    $isLoading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: $currentSessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        messages = [...messages, {
          role: 'assistant',
          content: data.response,
          createdAt: new Date().toISOString()
        }];
        $currentSessionId = data.sessionId;
        // URL 업데이트
        goto(`/chat?session=${data.sessionId}`, { replaceState: true });
        // 세션 목록 새로고침
        await loadChatData($currentSessionId);
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
      $isLoading = false;
      scrollToBottom();
    }
  }

  async function regenerateResponse() {
    if ($isLoading || !$currentSessionId) return;

    const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
    if (lastAssistantIndex === -1) return;

    messages = messages.slice(0, lastAssistantIndex);
    $isLoading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          sessionId: $currentSessionId
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
      $isLoading = false;
      scrollToBottom();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  onMount(() => {
    const sessionParam = $page.url.searchParams.get('session');
    if (sessionParam) {
      $currentSessionId = sessionParam;
      loadChatData(sessionParam);
    } else if ($currentSessionId) {
      loadChatData($currentSessionId);
    }
  });
</script>

<div class="chat-view">
  {#if !$hasUser}
    <div class="welcome-message">
      <div class="welcome-icon"><Sparkle size={48} weight="fill" /></div>
      <h2>사주몽에 오신 것을 환영합니다!</h2>
      <p>AI 사주 상담을 시작하려면 먼저 사주 정보를 등록해주세요.</p>
      <a class="primary-btn" href="/saju">
        사주 등록하기
      </a>
    </div>
  {:else}
    <div class="chat-container" bind:this={chatContainer}>
      {#if messages.length === 0}
        <div class="chat-welcome">
          <p>안녕하세요, <strong>{$userName}</strong>님!</p>
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
          {#if message.role === 'assistant' && index === messages.length - 1 && !$isLoading}
            <div class="message-actions">
              <button class="action-btn" onclick={regenerateResponse} title="다시 생성">
                <ArrowsClockwise size={14} /> 다시 생성
              </button>
            </div>
          {/if}
        </div>
      {/each}

      {#if $isLoading}
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
        disabled={$isLoading}
      ></textarea>
      <button
        class="send-btn"
        onclick={sendMessage}
        disabled={$isLoading || !inputMessage.trim()}
      >
        <PaperPlaneTilt size={20} weight="fill" />
      </button>
    </div>
  {/if}
</div>

<style>
  .chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .welcome-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: var(--space-8);
    text-align: center;
    color: var(--text-secondary);
  }

  .welcome-icon {
    font-size: 48px;
    margin-bottom: var(--space-4);
    color: var(--accent);
  }

  .welcome-message h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: var(--space-2);
  }

  .welcome-message p {
    margin-bottom: var(--space-4);
    font-size: 14px;
  }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    background: var(--gray-900);
    color: var(--white);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
  }

  .primary-btn:hover {
    background: var(--gray-800);
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .chat-welcome {
    text-align: center;
    padding: var(--space-8);
    color: var(--text-secondary);
  }

  .chat-welcome strong {
    color: var(--text);
  }

  .message {
    max-width: 75%;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .message.user {
    margin-left: auto;
  }

  .message.assistant {
    margin-right: auto;
  }

  .message-content {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: 14px;
    line-height: 1.6;
  }

  .message.user .message-content {
    background: var(--gray-800);
    color: var(--white);
    border-bottom-right-radius: var(--radius-sm);
  }

  .message.assistant .message-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-bottom-left-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
  }

  .message-content :global(p) {
    margin-bottom: var(--space-2);
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content :global(ul),
  .message-content :global(ol) {
    margin-left: var(--space-4);
    margin-bottom: var(--space-2);
  }

  .message-content :global(li) {
    margin-bottom: var(--space-1);
  }

  .message-content :global(strong) {
    font-weight: 600;
  }

  .message-content :global(code) {
    background: var(--gray-100);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .message-actions {
    display: flex;
    gap: var(--space-2);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-size: 12px;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .action-btn:hover {
    background: var(--gray-100);
    color: var(--text-secondary);
  }

  .typing {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-4);
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--gray-400);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  .chat-input-container {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--surface);
    border-top: 1px solid var(--border);
  }

  .chat-input {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 14px;
    resize: none;
    background: var(--bg);
    color: var(--text);
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--gray-400);
  }

  .chat-input:disabled {
    opacity: 0.5;
  }

  .send-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-900);
    color: var(--white);
    border-radius: var(--radius-lg);
    font-size: 18px;
    border: none;
    cursor: pointer;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--gray-800);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .message {
      max-width: 85%;
    }
  }
</style>
