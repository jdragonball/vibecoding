<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>나 사용설명서 - 당신만의 인생 내비게이션</title>
	<meta name="description" content="사주와 MBTI를 기반으로 당신의 고민에 맞는 맞춤형 인생 가이드를 제공합니다." />
</svelte:head>

{@render children()}
