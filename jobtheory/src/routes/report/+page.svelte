<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	// 강점/약점 항목 타입
	interface TraitItem {
		title: string;
		description: string;
	}

	// 무료 티저 타입
	interface FreeReport {
		oneLiner: string;
		typeName: string;
		keywords: string[];
		description: string;
		strengths: TraitItem[];
		weaknesses: TraitItem[];
		preview: {
			sectionTitles: string[];
			teaserText: string;
		};
	}

	// 유료 섹션 타입
	interface Section {
		slot: number;
		id: string;
		title: string;
		emoji: string;
		content: string;
		part: number;
	}

	interface SajuData {
		yearPillar: string;
		monthPillar: string;
		dayPillar: string;
		hourPillar: string;
		dayMaster: string;
		dayMasterElement: string;
		dayMasterMeaning: string;
	}

	// 상태
	let isLoading = $state(true);
	let isPaidLoading = $state(false);
	let error = $state<string | null>(null);
	let loadingMessage = $state('사주를 분석하고 있어요');

	// 데이터
	let name = $state('');
	let mbti = $state('');
	let saju = $state<SajuData | null>(null);
	let freeReport = $state<FreeReport | null>(null);
	let paidSections = $state<Section[] | null>(null);
	let paidOneLiner = $state<string | null>(null);

	// 원본 요청 데이터 (유료 호출용)
	let originalRequest = $state<Record<string, unknown> | null>(null);

	const loadingMessages = [
		'사주를 분석하고 있어요',
		'오행의 균형을 살펴보고 있어요',
		'MBTI와 연결하고 있어요',
		'당신만의 유형을 찾고 있어요'
	];

	// 고민 유무에 따라 Part 2 라벨 동적 변경
	const getPartLabel = (part: number): string => {
		if (part === 1) return '나를 알기';
		if (part === 2) {
			const concern = originalRequest?.concern as string | undefined;
			return concern?.trim() ? '고민 분석' : '심층 분석';
		}
		if (part === 3) return '앞으로';
		return '';
	};

	// 천간/지지 분리 함수
	function splitPillar(pillar: string): { stem: string; branch: string } {
		if (pillar === '시간 미상') return { stem: '?', branch: '?' };
		return { stem: pillar[0], branch: pillar[1] };
	}

	// 리포트 저장 ID
	let reportId = $state<string | null>(null);

	// 리포트 저장 함수
	function saveReport(reportData: {
		name: string;
		mbti: string;
		saju: SajuData;
		freeReport: FreeReport;
		paidSections?: Section[] | null;
		paidOneLiner?: string | null;
	}) {
		if (!browser) return;

		const id = reportId || `report_${Date.now()}`;
		reportId = id;

		const saved = localStorage.getItem('reports');
		const reports = saved ? JSON.parse(saved) : [];

		// 기존 리포트가 있으면 업데이트, 없으면 추가
		const existingIndex = reports.findIndex((r: { id: string }) => r.id === id);
		const reportToSave = {
			id,
			createdAt: new Date().toISOString(),
			data: {
				name: reportData.name,
				mbti: reportData.mbti,
				saju: reportData.saju, // 사주 전체 정보 저장
				report: {
					oneLiner: reportData.paidOneLiner || reportData.freeReport.oneLiner,
					typeName: reportData.freeReport.typeName,
					freeReport: reportData.freeReport,
					paidSections: reportData.paidSections || null
				}
			}
		};

		if (existingIndex >= 0) {
			reports[existingIndex] = reportToSave;
		} else {
			reports.unshift(reportToSave); // 최신순
		}

		// 최대 20개까지만 저장
		if (reports.length > 20) {
			reports.pop();
		}

		localStorage.setItem('reports', JSON.stringify(reports));
	}

	onMount(async () => {
		if (!browser) return;

		// 1. 저장된 리포트 보기 (history에서 왔을 때)
		const viewId = sessionStorage.getItem('viewReportId');
		if (viewId) {
			sessionStorage.removeItem('viewReportId');
			const saved = localStorage.getItem('reports');
			if (saved) {
				const reports = JSON.parse(saved);
				const found = reports.find((r: { id: string }) => r.id === viewId);
				if (found) {
					reportId = found.id;
					name = found.data.name;
					mbti = found.data.mbti;
					saju = found.data.saju;
					freeReport = found.data.report.freeReport;
					if (found.data.report.paidSections) {
						paidSections = found.data.report.paidSections;
						paidOneLiner = found.data.report.oneLiner;
					}
					isLoading = false;
					return;
				}
			}
			// 저장된 리포트를 찾지 못함
			goto('/history');
			return;
		}

		// 2. 새 리포트 생성 (폼에서 왔을 때)
		const stored = sessionStorage.getItem('reportRequest');

		if (!stored) {
			goto('/');
			return;
		}

		originalRequest = JSON.parse(stored);

		let messageIndex = 0;
		const messageInterval = setInterval(() => {
			messageIndex = (messageIndex + 1) % loadingMessages.length;
			loadingMessage = loadingMessages[messageIndex];
		}, 2000);

		try {
			// 무료 API 호출
			const response = await fetch('/api/generate/free', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: stored
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || '리포트 생성에 실패했어요');
			}

			name = result.data.name;
			mbti = result.data.mbti;
			saju = result.data.saju;
			freeReport = result.data.report;

			// 무료 리포트 저장
			saveReport({
				name: result.data.name,
				mbti: result.data.mbti,
				saju: result.data.saju,
				freeReport: result.data.report
			});

			sessionStorage.removeItem('reportRequest');

		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요';
		} finally {
			clearInterval(messageInterval);
			isLoading = false;
		}
	});

	async function unlockPaidReport() {
		if (!originalRequest || !freeReport) return;

		isPaidLoading = true;

		try {
			const response = await fetch('/api/generate/paid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...originalRequest,
					freeContext: freeReport
				})
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || '리포트 생성에 실패했어요');
			}

			paidOneLiner = result.data.report.oneLiner;
			paidSections = result.data.report.sections;

			// 유료 리포트 포함하여 저장 (업데이트)
			if (saju && freeReport) {
				saveReport({
					name,
					mbti,
					saju,
					freeReport,
					paidSections: result.data.report.sections,
					paidOneLiner: result.data.report.oneLiner
				});
			}

		} catch (e) {
			error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요';
		} finally {
			isPaidLoading = false;
		}
	}

	function parseMarkdown(text: string): string {
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
	}

	function groupByPart(sections: Section[]): { part: number; label: string; sections: Section[] }[] {
		const grouped: Record<number, Section[]> = {};
		sections.forEach(section => {
			if (!grouped[section.part]) grouped[section.part] = [];
			grouped[section.part].push(section);
		});
		return Object.entries(grouped).map(([part, secs]) => ({
			part: parseInt(part),
			label: getPartLabel(parseInt(part)),
			sections: secs
		}));
	}
</script>

<svelte:head>
	{#if name}
		<title>{name}님의 사용설명서 - 나 사용설명서</title>
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

	{:else if freeReport && saju}
		<header class="report-header">
			<div class="container">
				<a href="/" class="back-link">
					<span>←</span> 처음으로
				</a>
			</div>
		</header>

		<!-- 사주 원국표 -->
		<section class="saju-section">
			<div class="container">
				<div class="saju-card card">
					<h2 class="saju-title">사주 원국</h2>
					<div class="saju-table">
						<div class="saju-column">
							<span class="saju-label">시주</span>
							<span class="saju-stem">{splitPillar(saju.hourPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.hourPillar).branch}</span>
						</div>
						<div class="saju-column">
							<span class="saju-label">일주</span>
							<span class="saju-stem highlight">{splitPillar(saju.dayPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.dayPillar).branch}</span>
						</div>
						<div class="saju-column">
							<span class="saju-label">월주</span>
							<span class="saju-stem">{splitPillar(saju.monthPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.monthPillar).branch}</span>
						</div>
						<div class="saju-column">
							<span class="saju-label">연주</span>
							<span class="saju-stem">{splitPillar(saju.yearPillar).stem}</span>
							<span class="saju-branch">{splitPillar(saju.yearPillar).branch}</span>
						</div>
					</div>
					<p class="saju-info">
						일간 <strong>{saju.dayMaster}</strong>({saju.dayMasterElement}) · {saju.dayMasterMeaning}
					</p>
				</div>
			</div>
		</section>

		<!-- 히어로 영역 -->
		<section class="report-hero">
			<div class="container">
				<div class="hero-badge">
					<span class="tag">{mbti}</span>
					<span class="tag">{saju.dayMaster}{saju.dayMasterElement}</span>
				</div>
				<p class="type-name">{freeReport.typeName}</p>
				<h1 class="report-title">{name}님의 사용설명서</h1>
				<p class="report-subtitle">"{freeReport.oneLiner}"</p>

				<div class="keywords">
					{#each freeReport.keywords as keyword}
						<span class="keyword-tag">{keyword}</span>
					{/each}
				</div>
			</div>
		</section>

		<!-- 성격 설명 -->
		<section class="description-section">
			<div class="container">
				<div class="description-card card">
					<p class="description-text">{@html parseMarkdown(freeReport.description)}</p>
				</div>
			</div>
		</section>

		<!-- 강점/약점 -->
		<section class="traits-section">
			<div class="container">
				<div class="traits-grid">
					<!-- 강점 -->
					<div class="trait-card card">
						<h3 class="trait-header strengths-header">
							<span class="trait-icon">✦</span>
							강점
						</h3>
						<ul class="trait-list">
							{#each freeReport.strengths as item}
								<li class="trait-item">
									<span class="trait-title">{item.title}</span>
									<span class="trait-desc">{item.description}</span>
								</li>
							{/each}
						</ul>
					</div>

					<!-- 약점 -->
					<div class="trait-card card">
						<h3 class="trait-header weaknesses-header">
							<span class="trait-icon">○</span>
							약점
						</h3>
						<ul class="trait-list">
							{#each freeReport.weaknesses as item}
								<li class="trait-item">
									<span class="trait-title">{item.title}</span>
									<span class="trait-desc">{item.description}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- 유료 섹션이 있으면 표시 -->
		{#if paidSections}
			<div class="report-content">
				<div class="container">
					{#each groupByPart(paidSections) as group}
						<div class="part-group">
							<div class="part-header">
								<span class="part-number">Part {group.part}</span>
								<span class="part-label">{group.label}</span>
							</div>

							{#each group.sections as section}
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

		{:else}
			<!-- 유료 유도 영역 -->
			<section class="paid-teaser">
				<div class="container">
					<div class="teaser-card card">
						<div class="teaser-header">
							<span class="teaser-badge">심층 분석 준비 완료</span>
							<h2 class="teaser-title">{name}님만을 위한<br/>맞춤 분석이 기다리고 있어요</h2>
							<p class="teaser-subtitle">{freeReport.preview.teaserText}</p>
						</div>

						<!-- 블러된 섹션 미리보기 -->
						<div class="preview-sections">
							{#each freeReport.preview.sectionTitles as title, i}
								<div class="preview-item">
									<span class="preview-number">{i + 1}</span>
									<span class="preview-title">{title}</span>
									<span class="preview-lock">🔒</span>
								</div>
							{/each}
						</div>

						<div class="teaser-cta">
							<p class="price-display">
								<span class="price-original">19,900원</span>
								<span class="price-current">9,900원</span>
							</p>
							<button
								class="btn btn-primary unlock-btn"
								onclick={unlockPaidReport}
								disabled={isPaidLoading}
							>
								{#if isPaidLoading}
									<span class="spinner"></span>
									분석 중...
								{:else}
									전체 리포트 열기
								{/if}
							</button>
							<p class="social-proof">오늘 {Math.floor(Math.random() * 100) + 50}명이 리포트를 받았어요</p>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<footer class="report-footer">
			<div class="container">
				<p class="text-muted text-sm text-center">
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

	/* 사주 원국표 */
	.saju-section {
		padding: var(--space-xl) 0;
		background: var(--bg-secondary);
	}

	.saju-card {
		max-width: 400px;
		margin: 0 auto;
		text-align: center;
		padding: var(--space-xl);
	}

	.saju-title {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-lg);
	}

	.saju-table {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.saju-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.saju-label {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.saju-stem, .saju-branch {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-xl);
		font-weight: 600;
		border: 1px solid var(--border-light);
		border-radius: var(--radius-md);
		background: var(--bg-card);
	}

	.saju-stem.highlight {
		background: var(--accent-warm);
		color: white;
		border-color: var(--accent-warm);
	}

	.saju-branch {
		background: var(--bg-secondary);
	}

	.saju-info {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.saju-info strong {
		color: var(--text-accent);
	}

	/* 히어로 */
	.report-hero {
		padding: var(--space-2xl) 0;
		text-align: center;
	}

	.hero-badge {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.type-name {
		font-size: var(--font-size-sm);
		color: var(--accent-warm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-sm);
	}

	.report-title {
		font-size: var(--font-size-2xl);
		margin-bottom: var(--space-sm);
	}

	.report-subtitle {
		color: var(--text-accent);
		font-size: var(--font-size-lg);
		font-style: italic;
		margin-bottom: var(--space-lg);
	}

	.keywords {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.keyword-tag {
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-accent);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		color: var(--text-accent);
	}

	/* 성격 설명 */
	.description-section {
		padding: var(--space-xl) 0;
	}

	.description-card {
		max-width: 680px;
		margin: 0 auto;
		padding: var(--space-xl);
	}

	.description-text {
		font-size: var(--font-size-base);
		line-height: 1.9;
		color: var(--text-primary);
	}

	.description-text :global(p) {
		margin-bottom: var(--space-md);
	}

	.description-text :global(strong) {
		color: var(--text-accent);
	}

	/* 강점/약점 */
	.traits-section {
		padding: var(--space-xl) 0;
		background: var(--bg-secondary);
	}

	.traits-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
		max-width: 900px;
		margin: 0 auto;
	}

	.trait-card {
		padding: var(--space-lg);
	}

	.trait-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 2px solid var(--border-light);
	}

	.strengths-header {
		color: var(--accent-warm);
		border-bottom-color: var(--accent-warm);
	}

	.weaknesses-header {
		color: var(--text-secondary);
	}

	.trait-icon {
		font-size: var(--font-size-xl);
	}

	.trait-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.trait-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
	}

	.trait-title {
		font-weight: 600;
		color: var(--text-primary);
	}

	.trait-desc {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	/* 유료 유도 영역 */
	.paid-teaser {
		padding: var(--space-2xl) 0;
	}

	.teaser-card {
		max-width: 500px;
		margin: 0 auto;
		padding: var(--space-2xl);
		text-align: center;
		border: 2px solid var(--accent-warm);
	}

	.teaser-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-md);
		background: var(--accent-warm);
		color: white;
		font-size: var(--font-size-xs);
		font-weight: 600;
		border-radius: var(--radius-full);
		margin-bottom: var(--space-lg);
	}

	.teaser-title {
		font-size: var(--font-size-xl);
		line-height: 1.4;
		margin-bottom: var(--space-sm);
	}

	.teaser-subtitle {
		color: var(--text-secondary);
		margin-bottom: var(--space-xl);
	}

	.preview-sections {
		margin-bottom: var(--space-xl);
	}

	.preview-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
	}

	.preview-number {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--border-light);
		border-radius: 50%;
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.preview-title {
		flex: 1;
		text-align: left;
		color: var(--text-secondary);
	}

	.preview-lock {
		font-size: var(--font-size-sm);
	}

	.teaser-cta {
		margin-top: var(--space-xl);
	}

	.price-display {
		margin-bottom: var(--space-md);
	}

	.price-original {
		text-decoration: line-through;
		color: var(--text-muted);
		margin-right: var(--space-sm);
	}

	.price-current {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--accent-warm);
	}

	.unlock-btn {
		width: 100%;
		padding: var(--space-lg);
		font-size: var(--font-size-lg);
	}

	.social-proof {
		margin-top: var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	/* 유료 콘텐츠 */
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
		padding: var(--space-2xl) 0;
		border-top: 1px solid var(--border-light);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
	}
</style>
