<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/dashboard', { replaceState: true });
  });
</script>

<div class="redirect-message">
  <p>대시보드로 이동 중...</p>
</div>

<style>
  .redirect-message {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
  }
</style>
