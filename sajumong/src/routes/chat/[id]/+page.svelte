<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { marked } from 'marked';
  import { ArrowsClockwise, PaperPlaneTilt } from 'phosphor-svelte';
  import { hasUser, userName, sessions, currentSessionId, isLoading, t, locale } from '$lib/stores';

  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  let messages: Array<{ id?: string; role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let inputMessage = '';
  let chatContainer: HTMLDivElement;
  let inputElement: HTMLTextAreaElement;
  let streamingContent = '';  // 스트리밍 중인 응답 내용

  onMount(() => {
    if (inputElement) {
      inputElement.focus();
    }
  });

  // URL에서 세션 ID 가져오기
  $: sessionId = $page.params.id;

  // 세션 ID 변경 시 데이터 로드 (브라우저에서만)
  $: if (browser && sessionId) {
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
    }, 50);
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

  // 스트리밍 메시지 전송
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
    streamingContent = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
          stream: true,  // 스트리밍 모드 활성화
          locale: $locale
        })
      });

      if (!res.ok) {
        throw new Error($t.chat.apiError);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error($t.chat.streamError);
      }

      // SSE 파싱
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                streamingContent += data.chunk;
                scrollToBottom();
              }

              if (data.done) {
                // 스트리밍 완료: 메시지 배열에 추가
                messages = [...messages, {
                  role: 'assistant',
                  content: streamingContent,
                  createdAt: new Date().toISOString()
                }];
                streamingContent = '';
              }

              if (data.error) {
                messages = [...messages, {
                  role: 'assistant',
                  content: data.error,
                  createdAt: new Date().toISOString()
                }];
                streamingContent = '';
              }
            } catch (e) {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (e) {
      console.error($t.chat.sendFailed, e);
      if (streamingContent) {
        // 스트리밍 중 오류: 지금까지의 내용 저장
        messages = [...messages, {
          role: 'assistant',
          content: streamingContent || $t.chat.connectionFailed,
          createdAt: new Date().toISOString()
        }];
      } else {
        messages = [...messages, {
          role: 'assistant',
          content: $t.chat.connectionFailed,
          createdAt: new Date().toISOString()
        }];
      }
      streamingContent = '';
    } finally {
      $isLoading = false;
      scrollToBottom();
    }
  }

  // 스트리밍 다시 생성
  async function regenerateResponse() {
    if ($isLoading || !sessionId) return;

    const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
    if (lastAssistantIndex === -1) return;

    messages = messages.slice(0, lastAssistantIndex);
    $isLoading = true;
    streamingContent = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          sessionId: sessionId,
          stream: true,  // 스트리밍 모드 활성화
          locale: $locale
        })
      });

      if (!res.ok) {
        throw new Error($t.chat.apiError);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error($t.chat.streamError);
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                streamingContent += data.chunk;
                scrollToBottom();
              }

              if (data.done) {
                messages = [...messages, {
                  role: 'assistant',
                  content: streamingContent,
                  createdAt: new Date().toISOString()
                }];
                streamingContent = '';
              }

              if (data.error) {
                messages = [...messages, {
                  role: 'assistant',
                  content: data.error,
                  createdAt: new Date().toISOString()
                }];
                streamingContent = '';
              }
            } catch (e) {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (e) {
      console.error($t.chat.regenerateFailed, e);
      if (streamingContent) {
        messages = [...messages, {
          role: 'assistant',
          content: streamingContent,
          createdAt: new Date().toISOString()
        }];
      } else {
        messages = [...messages, {
          role: 'assistant',
          content: $t.chat.regenerateFailed,
          createdAt: new Date().toISOString()
        }];
      }
      streamingContent = '';
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
        <p>{$t.common.loading}</p>
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
            <button class="action-btn" onclick={regenerateResponse} title={$t.chat.regenerate}>
              <ArrowsClockwise size={14} /> {$t.chat.regenerate}
            </button>
          </div>
        {/if}
      </div>
    {/each}

    {#if $isLoading}
      <div class="message assistant">
        <div class="message-content" class:typing={!streamingContent}>
          {#if streamingContent}
            {@html renderMarkdown(streamingContent)}
            <span class="cursor">▊</span>
          {:else}
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <div class="chat-input-container">
    <textarea
      class="chat-input"
      bind:this={inputElement}
      bind:value={inputMessage}
      onkeydown={handleKeydown}
      placeholder={$t.chat.placeholder}
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

  .cursor {
    display: inline-block;
    animation: blink 1s infinite;
    color: var(--gray-400);
    font-weight: 300;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
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
