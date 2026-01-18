<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	interface Section {
		slot: number;
		id: string;
		title: string;
		emoji: string;
		content: string;
		part: number;
	}

	interface ReportData {
		name: string;
		mbti: string;
		saju: {
			yearPillar: string;
			monthPillar: string;
			dayPillar: string;
			hourPillar: string;
			dayMaster: string;
			dayMasterElement: string;
			dayMasterMeaning: string;
		};
		report: {
			oneLiner: string;
			sections: Section[];
		};
	}

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let reportData = $state<ReportData | null>(null);
	let loadingMessage = $state('사주를 분석하고 있어요');
	let activeSection = $state<string>('');

	const loadingMessages = [
		'사주를 분석하고 있어요',
		'오행의 균형을 살펴보고 있어요',
		'MBTI와 연결하고 있어요',
		'고민에 맞는 이야기를 찾고 있어요',
		'맞춤형 가이드를 작성하고 있어요',
		'거의 다 됐어요'
	];

	const partLabels: Record<number, string> = {
		1: '나를 알기',
		2: '고민 분석',
		3: '앞으로'
	};

	onMount(async () => {
		if (!browser) return;

		const stored = sessionStorage.getItem('reportRequest');

		// request가 없으면 저장된 리포트에서 불러오기
		if (!stored) {
			const viewId = sessionStorage.getItem('viewReportId');
			const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');

			if (viewId) {
				sessionStorage.removeItem('viewReportId');
				const found = savedReports.find((r: { id: string }) => r.id === viewId);
				if (found) {
					reportData = found.data;
					if (reportData?.report?.sections?.length) {
						activeSection = reportData.report.sections[0].id;
					}
					isLoading = false;
					return;
				}
			}

			// viewId 없으면 가장 최근 리포트
			if (savedReports.length > 0) {
				reportData = savedReports[0].data;
				if (reportData?.report?.sections?.length) {
					activeSection = reportData.report.sections[0].id;
				}
				isLoading = false;
				return;
			}

			goto('/');
			return;
		}

		const formData = JSON.parse(stored);

		let messageIndex = 0;
		const messageInterval = setInterval(() => {
			messageIndex = (messageIndex + 1) % loadingMessages.length;
			loadingMessage = loadingMessages[messageIndex];
		}, 2000);

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || '리포트 생성에 실패했어요');
			}

			reportData = result.data;
			sessionStorage.removeItem('reportRequest');

			// 테스트용: 결과를 localStorage에 저장 (배열로)
			const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
			const newReport = {
				id: Date.now().toString(),
				createdAt: new Date().toISOString(),
				data: result.data
			};
			savedReports.unshift(newReport); // 최신순
			localStorage.setItem('reports', JSON.stringify(savedReports));

			if (reportData?.report?.sections?.length) {
				activeSection = reportData.report.sections[0].id;
			}

		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요';
		} finally {
			clearInterval(messageInterval);
			isLoading = false;
		}
	});

	function scrollToSection(sectionId: string) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function parseMarkdown(text: string): string {
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
	}

	// 섹션을 Part별로 그룹화
	function groupByPart(sections: Section[]): { part: number; label: string; sections: Section[] }[] {
		const grouped: Record<number, Section[]> = {};
		sections.forEach(section => {
			if (!grouped[section.part]) grouped[section.part] = [];
			grouped[section.part].push(section);
		});
		return Object.entries(grouped).map(([part, secs]) => ({
			part: parseInt(part),
			label: partLabels[parseInt(part)] || '',
			sections: secs
		}));
	}
</script>

<svelte:head>
	{#if reportData}
		<title>{reportData.name}님의 사용설명서 - 나 사용설명서</title>
	{/if}
</svelte:head>

<main class="page">
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-content">
				<div class="loading-icon">
					<span class="loading-circle"></span>
					<span class="loading-dot"></span>
				</div>
				<p class="loading-message">{loadingMessage}</p>
				<p class="loading-hint text-muted text-sm">잠시만 기다려주세요</p>
			</div>
		</div>

	{:else if error}
		<div class="error-container">
			<div class="error-content card">
				<p class="error-icon">○</p>
				<h2>앗, 문제가 생겼어요</h2>
				<p class="text-muted">{error}</p>
				<button class="btn btn-primary mt-lg" onclick={() => goto('/')}>
					다시 시도하기
				</button>
			</div>
		</div>

	{:else if reportData}
		<header class="report-header">
			<div class="container">
				<a href="/" class="back-link">
					<span>←</span> 처음으로
				</a>
			</div>
		</header>

		<section class="report-hero">
			<div class="container">
				<div class="hero-badge">
					<span class="tag">{reportData.mbti}</span>
					<span class="tag">{reportData.saju.dayMaster}{reportData.saju.dayMasterElement}</span>
				</div>
				<h1 class="report-title">{reportData.name}님의 사용설명서</h1>
				<p class="report-subtitle">{reportData.report.oneLiner}</p>

				<div class="saju-pills">
					<span class="saju-pill">
						<span class="pill-label">연</span>
						<span class="pill-value">{reportData.saju.yearPillar}</span>
					</span>
					<span class="saju-pill">
						<span class="pill-label">월</span>
						<span class="pill-value">{reportData.saju.monthPillar}</span>
					</span>
					<span class="saju-pill">
						<span class="pill-label">일</span>
						<span class="pill-value">{reportData.saju.dayPillar}</span>
					</span>
					<span class="saju-pill">
						<span class="pill-label">시</span>
						<span class="pill-value">{reportData.saju.hourPillar}</span>
					</span>
				</div>

				<p class="saju-meaning text-sm text-muted mt-md">
					{reportData.saju.dayMasterElement}({reportData.saju.dayMaster}) · {reportData.saju.dayMasterMeaning}
				</p>
			</div>
		</section>

		<!-- TOC -->
		<nav class="toc-nav">
			<div class="container">
				<div class="toc-scroll">
					{#each reportData.report.sections as section}
						<button
							class="toc-item"
							class:active={activeSection === section.id}
							onclick={() => scrollToSection(section.id)}
						>
							<span class="toc-emoji">{section.emoji}</span>
							<span class="toc-title">{section.title}</span>
						</button>
					{/each}
				</div>
			</div>
		</nav>

		<!-- Report Sections by Part -->
		<div class="report-content">
			<div class="container">
				{#each groupByPart(reportData.report.sections) as group}
					<div class="part-group">
						<div class="part-header">
							<span class="part-number">Part {group.part}</span>
							<span class="part-label">{group.label}</span>
						</div>

						{#each group.sections as section, index}
							<article
								id={section.id}
								class="report-section card"
								class:animate-fade-in={true}
								style="animation-delay: {(section.slot - 1) * 0.05}s"
							>
								<header class="section-header">
									<span class="section-emoji">{section.emoji}</span>
									<h2 class="section-title">{section.title}</h2>
								</header>
								<div class="section-content">
									<p>{@html parseMarkdown(section.content)}</p>
								</div>
							</article>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<footer class="report-footer">
			<div class="container">
				<div class="footer-cta card">
					<p class="footer-message">
						이 가이드가 도움이 되셨길 바라요.<br>
						<strong>당신의 선택을 믿어도 됩니다.</strong>
					</p>
					<button class="btn btn-secondary" onclick={() => goto('/')}>
						새로운 고민 상담하기
					</button>
				</div>
				<p class="text-muted text-sm mt-xl text-center">
					◎ 나 사용설명서 · 사주 × MBTI 기반 맞춤형 인생 가이드
				</p>
			</div>
		</footer>
	{/if}
</main>

<style>
	.page {
		min-height: 100vh;
	}

	.loading-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-content {
		text-align: center;
	}

	.loading-icon {
		position: relative;
		width: 60px;
		height: 60px;
		margin: 0 auto var(--space-xl);
	}

	.loading-circle {
		position: absolute;
		inset: 0;
		border: 2px solid var(--border-light);
		border-top-color: var(--accent-warm);
		border-radius: 50%;
		animation: spin 1.2s linear infinite;
	}

	.loading-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 8px;
		height: 8px;
		background: var(--accent-warm);
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.loading-message {
		font-size: var(--font-size-lg);
		font-weight: 500;
		margin-bottom: var(--space-sm);
	}

	.error-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.error-content {
		text-align: center;
		max-width: 400px;
	}

	.error-icon {
		font-size: 3rem;
		color: var(--accent-clay);
		margin-bottom: var(--space-md);
	}

	.report-header {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--border-light);
		background: var(--bg-card);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	.report-hero {
		padding: var(--space-3xl) 0;
		text-align: center;
		background: linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary));
	}

	.hero-badge {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	.report-title {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--space-sm);
	}

	.report-subtitle {
		color: var(--text-accent);
		font-size: var(--font-size-lg);
		margin-bottom: var(--space-xl);
	}

	.saju-pills {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.saju-pill {
		display: flex;
		align-items: center;
		background: var(--bg-card);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.pill-label {
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-accent);
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.pill-value {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.saju-meaning {
		margin-top: var(--space-md);
	}

	.toc-nav {
		position: sticky;
		top: 57px;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-light);
		z-index: 90;
	}

	.toc-scroll {
		display: flex;
		gap: var(--space-xs);
		padding: var(--space-md) 0;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.toc-scroll::-webkit-scrollbar {
		display: none;
	}

	.toc-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		white-space: nowrap;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.toc-item:hover {
		background: var(--bg-secondary);
	}

	.toc-item.active {
		background: var(--text-primary);
		color: var(--bg-card);
		border-color: var(--text-primary);
	}

	.toc-emoji {
		font-size: var(--font-size-base);
	}

	.report-content {
		padding: var(--space-xl) 0;
	}

	.part-group {
		margin-bottom: var(--space-2xl);
	}

	.part-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-sm);
		border-bottom: 2px solid var(--border-light);
	}

	.part-number {
		font-size: var(--font-size-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-warm);
		background: var(--bg-accent);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
	}

	.part-label {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--text-primary);
	}

	.report-section {
		margin-bottom: var(--space-lg);
		scroll-margin-top: 140px;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--border-light);
	}

	.section-emoji {
		font-size: var(--font-size-xl);
		color: var(--accent-warm);
	}

	.section-title {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.section-content {
		color: var(--text-primary);
		line-height: 1.9;
	}

	.section-content :global(p) {
		margin-bottom: var(--space-md);
	}

	.section-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.section-content :global(strong) {
		font-weight: 600;
		color: var(--text-accent);
	}

	.report-footer {
		padding: var(--space-2xl) 0 var(--space-3xl);
	}

	.footer-cta {
		text-align: center;
		padding: var(--space-2xl);
		background: var(--bg-secondary);
		border: none;
	}

	.footer-message {
		font-size: var(--font-size-lg);
		line-height: 1.8;
		margin-bottom: var(--space-lg);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
	}
</style>
