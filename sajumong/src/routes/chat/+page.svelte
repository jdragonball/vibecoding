<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { marked } from 'marked';
  import { Sparkle, PaperPlaneTilt } from 'phosphor-svelte';
  import { hasUser, userName, sessions, currentSessionId, isLoading, t, locale } from '$lib/stores';

  marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  let messages: Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }> = [];
  let inputMessage = '';
  let chatContainer: HTMLDivElement;
  let inputElement: HTMLTextAreaElement;
  let tempSessionId: string | null = null;
  let streamingContent = '';  // 스트리밍 중인 응답 내용

  onMount(() => {
    if (inputElement) {
      inputElement.focus();
    }
  });

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 50);
  }

  async function sendFirstMessage() {
    if (!inputMessage.trim() || $isLoading) return;

    const userMessage = inputMessage.trim();
    inputMessage = '';

    // 임시 세션 ID 생성
    tempSessionId = 'temp-' + Date.now();

    // 즉시 사이드바에 "새 대화" 추가
    $sessions = [
      { id: tempSessionId, title: '새 대화', updatedAt: new Date().toISOString() },
      ...$sessions
    ];
    $currentSessionId = tempSessionId;

    // 메시지 추가
    messages = [{
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
          sessionId: null,  // 새 세션 생성 요청
          stream: true,     // 스트리밍 모드 활성화
          locale: $locale   // 언어 설정 전달
        })
      });

      if (!res.ok) {
        throw new Error($t.chat.apiError);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let realSessionId: string | null = null;

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

              if (data.done && data.sessionId) {
                realSessionId = data.sessionId;

                // 임시 세션을 실제 세션으로 교체
                $sessions = $sessions.map(s =>
                  s.id === tempSessionId
                    ? { ...s, id: realSessionId! }
                    : s
                );
                $currentSessionId = realSessionId;

                // 스트리밍 완료 후 실제 세션 페이지로 이동
                goto(`/chat/${realSessionId}`, { replaceState: true });
              }

              if (data.error) {
                $sessions = $sessions.filter(s => s.id !== tempSessionId);
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
      $sessions = $sessions.filter(s => s.id !== tempSessionId);
      if (streamingContent) {
        messages = [...messages, {
          role: 'assistant',
          content: streamingContent,
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

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendFirstMessage();
    }
  }

  // 새 채팅 페이지 진입 시 초기화
  $currentSessionId = null;
</script>

<div class="chat-view">
  {#if !$hasUser}
    <div class="welcome-message">
      <div class="welcome-icon"><Sparkle size={48} weight="fill" /></div>
      <h2>{$t.chat.welcome}</h2>
      <p>{$t.chat.welcomeMessage}</p>
      <a class="primary-btn" href="/saju">
        {$t.chat.registerSaju}
      </a>
    </div>
  {:else}
    <div class="chat-container" bind:this={chatContainer}>
      {#if messages.length === 0}
        <div class="chat-welcome">
          <p>{$t.chat.welcomeUser.replace('{name}', $userName)}</p>
          <p>{$t.chat.welcomeUserMessage}</p>
        </div>
      {/if}

      {#each messages as message}
        <div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
          <div class="message-content">
            {#if message.role === 'assistant'}
              {@html renderMarkdown(message.content)}
            {:else}
              {message.content}
            {/if}
          </div>
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
        onclick={sendFirstMessage}
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

  .primary-btn:hover { background: var(--gray-800); }

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

  .chat-welcome strong { color: var(--text); }

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
