<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { marked } from 'marked';
  import { ArrowsClockwise, PaperPlaneTilt } from 'phosphor-svelte';
  import { hasUser, userName, sessions, currentSessionId, isLoading } from '$lib/stores';

  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  let messages: Array<{ id?: string; role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let inputMessage = '';
  let chatContainer: HTMLDivElement;

  // URL에서 세션 ID 가져오기
  $: sessionId = $page.params.id;

  // 세션 ID 변경 시 데이터 로드
  $: if (sessionId) {
    $currentSessionId = sessionId;
    loadChatData(sessionId);
    // 2초 후 세션 목록 갱신 (AI 제목 생성 반영)
    setTimeout(refreshSessions, 2000);
  }

  async function refreshSessions() {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        $sessions = data.sessions || [];
      }
    } catch (e) {
      // 무시
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  async function loadChatData(id: string) {
    try {
      const res = await fetch(`/api/chat?sessionId=${id}`);
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
          sessionId: sessionId
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
          content: '죄송합니다. 응답을 생성하는 데 문제가 발생했습니다.',
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

  async function regenerateResponse() {
    if ($isLoading || !sessionId) return;

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
          sessionId: sessionId
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
</script>

<div class="chat-view">
  <div class="chat-container" bind:this={chatContainer}>
    {#if messages.length === 0}
      <div class="chat-welcome">
        <p>메시지를 불러오는 중...</p>
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
</div>

<style>
  .chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

  .message {
    max-width: 75%;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .message.user { margin-left: auto; }
  .message.assistant { margin-right: auto; }

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

  .message-content :global(p) { margin-bottom: var(--space-2); }
  .message-content :global(p:last-child) { margin-bottom: 0; }
  .message-content :global(ul), .message-content :global(ol) { margin-left: var(--space-4); margin-bottom: var(--space-2); }
  .message-content :global(li) { margin-bottom: var(--space-1); }
  .message-content :global(strong) { font-weight: 600; }

  .message-actions { display: flex; gap: var(--space-2); }

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

  .chat-input:disabled { opacity: 0.5; }

  .send-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-900);
    color: var(--white);
    border-radius: var(--radius-lg);
    border: none;
    cursor: pointer;
  }

  .send-btn:hover:not(:disabled) { background: var(--gray-800); }
  .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 640px) {
    .message { max-width: 85%; }
  }
</style>
