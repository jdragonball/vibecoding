<script lang="ts">
	import { goto } from '$app/navigation';

	// Form state (기본값: 테스트용)
	let name = $state('신재용');
	let birthYear = $state('1992');
	let birthMonth = $state('6');
	let birthDay = $state('25');
	let birthHour = $state('11-13');
	let gender = $state('남성');
	let mbti = $state('INTP');
	let concern = $state('사람들을 다 패고싶어요');
	let isSubmitting = $state(false);

	// MBTI options
	const mbtiTypes = [
		'INTJ', 'INTP', 'ENTJ', 'ENTP',
		'INFJ', 'INFP', 'ENFJ', 'ENFP',
		'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
		'ISTP', 'ISFP', 'ESTP', 'ESFP'
	];

	// Birth hour options (시주)
	const hourOptions = [
		{ value: '', label: '모름' },
		{ value: '23-01', label: '자시 (23:00~01:00)' },
		{ value: '01-03', label: '축시 (01:00~03:00)' },
		{ value: '03-05', label: '인시 (03:00~05:00)' },
		{ value: '05-07', label: '묘시 (05:00~07:00)' },
		{ value: '07-09', label: '진시 (07:00~09:00)' },
		{ value: '09-11', label: '사시 (09:00~11:00)' },
		{ value: '11-13', label: '오시 (11:00~13:00)' },
		{ value: '13-15', label: '미시 (13:00~15:00)' },
		{ value: '15-17', label: '신시 (15:00~17:00)' },
		{ value: '17-19', label: '유시 (17:00~19:00)' },
		{ value: '19-21', label: '술시 (19:00~21:00)' },
		{ value: '21-23', label: '해시 (21:00~23:00)' }
	];

	// Generate year options (1940-2015)
	const years = Array.from({ length: 76 }, (_, i) => 2015 - i);
	const months = Array.from({ length: 12 }, (_, i) => i + 1);
	const days = Array.from({ length: 31 }, (_, i) => i + 1);

	// Concern placeholder suggestions
	const concernPlaceholders = [
		'이직을 고민하고 있어요. 지금이 맞는 타이밍일까요?',
		'연애가 잘 안 풀려요. 언제쯤 좋은 사람을 만날 수 있을까요?',
		'사업을 시작하고 싶은데, 제가 잘 해낼 수 있을지 모르겠어요.',
		'요즘 삶의 방향을 잃은 것 같아요. 어떻게 살아야 할까요?'
	];

	let placeholderIndex = $state(0);

	$effect(() => {
		const interval = setInterval(() => {
			placeholderIndex = (placeholderIndex + 1) % concernPlaceholders.length;
		}, 4000);
		return () => clearInterval(interval);
	});

	// Validation (고민은 선택사항)
	let isFormValid = $derived(
		name.trim() !== '' &&
		birthYear !== '' &&
		birthMonth !== '' &&
		birthDay !== '' &&
		gender !== '' &&
		mbti !== ''
	);

	async function handleSubmit() {
		if (!isFormValid || isSubmitting) return;

		isSubmitting = true;

		const birthdate = `${birthYear}${birthMonth.padStart(2, '0')}${birthDay.padStart(2, '0')}`;

		const formData = {
			name,
			birthdate,
			birthHour: birthHour || null,
			gender,
			mbti,
			concern
		};

		// Store form data in sessionStorage and navigate to report page
		sessionStorage.setItem('reportRequest', JSON.stringify(formData));
		goto('/report');
	}
</script>

<main class="page">
	<header class="header">
		<div class="container header-inner">
			<div class="logo">
				<span class="logo-icon">&#9678;</span>
				<span class="logo-text">나 사용설명서</span>
			</div>
			<a href="/history" class="history-link">저장된 리포트</a>
		</div>
	</header>

	<section class="hero">
		<div class="container">
			<p class="hero-subtitle">사주 × MBTI 기반</p>
			<h1 class="hero-title">
				당신의 고민에 맞는<br />
				<span class="text-accent">맞춤형 인생 가이드</span>
			</h1>
			<p class="hero-description">
				똑같은 틀에 맞춘 운세가 아닌,<br />
				지금 당신의 상황에 꼭 맞는 이야기를 들려드릴게요.
			</p>
		</div>
	</section>

	<section class="form-section">
		<div class="container">
			<form class="card form-card" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

				<!-- Name -->
				<div class="input-group">
					<label class="input-label" for="name">이름</label>
					<input
						id="name"
						type="text"
						class="input-field"
						placeholder="홍길동"
						bind:value={name}
					/>
				</div>

				<!-- Birthdate -->
				<div class="input-group">
					<label class="input-label">생년월일 (양력)</label>
					<div class="date-inputs">
						<select class="input-field" bind:value={birthYear}>
							<option value="">년도</option>
							{#each years as year}
								<option value={String(year)}>{year}년</option>
							{/each}
						</select>
						<select class="input-field" bind:value={birthMonth}>
							<option value="">월</option>
							{#each months as month}
								<option value={String(month)}>{month}월</option>
							{/each}
						</select>
						<select class="input-field" bind:value={birthDay}>
							<option value="">일</option>
							{#each days as day}
								<option value={String(day)}>{day}일</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Birth Hour -->
				<div class="input-group">
					<label class="input-label" for="birthHour">태어난 시간 (선택)</label>
					<select id="birthHour" class="input-field" bind:value={birthHour}>
						{#each hourOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<p class="input-hint">시간을 모르셔도 괜찮아요</p>
				</div>

				<!-- Gender -->
				<div class="input-group">
					<label class="input-label">성별</label>
					<div class="radio-group">
						<label class="radio-item" class:selected={gender === '남성'}>
							<input type="radio" name="gender" value="남성" bind:group={gender} />
							<span>남성</span>
						</label>
						<label class="radio-item" class:selected={gender === '여성'}>
							<input type="radio" name="gender" value="여성" bind:group={gender} />
							<span>여성</span>
						</label>
					</div>
				</div>

				<!-- MBTI -->
				<div class="input-group">
					<label class="input-label">MBTI</label>
					<div class="mbti-grid">
						{#each mbtiTypes as type}
							<button
								type="button"
								class="mbti-btn"
								class:selected={mbti === type}
								onclick={() => mbti = type}
							>
								{type}
							</button>
						{/each}
					</div>
					<p class="input-hint">
						MBTI를 모르신다면 <a href="https://www.16personalities.com/ko" target="_blank" rel="noopener">여기서</a> 검사해보세요
					</p>
				</div>

				<div class="section-divider">&#10047;</div>

				<!-- Concern -->
				<div class="input-group">
					<label class="input-label" for="concern">지금 가장 고민되는 것</label>
					<textarea
						id="concern"
						class="input-field"
						placeholder={concernPlaceholders[placeholderIndex]}
						bind:value={concern}
						rows="4"
					></textarea>
					<p class="input-hint">
						구체적으로 써주실수록 더 정확한 이야기를 들려드릴 수 있어요
					</p>
				</div>

				<button
					type="submit"
					class="btn btn-primary submit-btn"
					disabled={!isFormValid || isSubmitting}
				>
					{#if isSubmitting}
						<span class="spinner"></span>
						분석 중...
					{:else}
						나만의 가이드 받기
					{/if}
				</button>

			</form>
		</div>
	</section>

	<footer class="footer">
		<div class="container">
			<p class="text-muted text-sm">
				&#9678; 나 사용설명서 &middot; 당신의 선택을 믿어도 됩니다
			</p>
		</div>
	</footer>
</main>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		padding: var(--space-lg) 0;
		border-bottom: 1px solid var(--border-light);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.history-link {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.history-link:hover {
		background: var(--bg-secondary);
		border-color: var(--border-medium);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-weight: 600;
		color: var(--text-primary);
	}

	.logo-icon {
		font-size: var(--font-size-xl);
		color: var(--accent-warm);
	}

	.hero {
		padding: var(--space-3xl) 0 var(--space-2xl);
		text-align: center;
	}

	.hero-subtitle {
		font-size: var(--font-size-sm);
		color: var(--text-accent);
		font-weight: 500;
		margin-bottom: var(--space-sm);
	}

	.hero-title {
		font-size: clamp(1.75rem, 5vw, 2.25rem);
		font-weight: 700;
		line-height: 1.4;
		margin-bottom: var(--space-lg);
	}

	.hero-description {
		color: var(--text-secondary);
		font-size: var(--font-size-base);
		line-height: 1.8;
	}

	.form-section {
		flex: 1;
		padding-bottom: var(--space-3xl);
	}

	.form-card {
		max-width: 480px;
		margin: 0 auto;
	}

	.date-inputs {
		display: grid;
		grid-template-columns: 1.2fr 0.9fr 0.9fr;
		gap: var(--space-sm);
	}

	.input-hint {
		margin-top: var(--space-xs);
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.input-hint a {
		text-decoration: underline;
	}

	.char-count {
		font-variant-numeric: tabular-nums;
	}

	.char-count.warning {
		color: var(--accent-clay);
	}

	.radio-group {
		display: flex;
		gap: var(--space-sm);
	}

	.radio-item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		background: var(--bg-card);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.radio-item input {
		display: none;
	}

	.radio-item:hover {
		border-color: var(--border-medium);
	}

	.radio-item.selected {
		background: var(--text-primary);
		color: var(--bg-card);
		border-color: var(--text-primary);
	}

	.mbti-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-sm);
	}

	.mbti-btn {
		padding: var(--space-sm) var(--space-xs);
		font-family: var(--font-family);
		font-size: var(--font-size-sm);
		font-weight: 500;
		background: var(--bg-card);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.mbti-btn:hover {
		border-color: var(--border-medium);
		background: var(--bg-secondary);
	}

	.mbti-btn.selected {
		background: var(--text-primary);
		color: var(--bg-card);
		border-color: var(--text-primary);
	}

	.submit-btn {
		width: 100%;
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		font-size: var(--font-size-lg);
	}

	.footer {
		padding: var(--space-xl) 0;
		text-align: center;
		border-top: 1px solid var(--border-light);
	}

	/* Section divider flower */
	.section-divider {
		font-size: var(--font-size-lg);
		color: var(--accent-warm);
	}
</style>
