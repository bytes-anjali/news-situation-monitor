<script lang="ts">
	import { untrack } from 'svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import { news, data } from '$lib/stores';
	import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';
	import { DATA_FEEDS } from '$lib/api/dataFeeds';
	import { fetchSummary, isSummaryEnabled, type ArticleSummary } from '$lib/api/summarize';
	import type { TrendItem } from '$lib/api/trends';
	import type { NewsCategory } from '$lib/types';

	interface Props {
		onRefresh?: () => void;
		onRefreshData?: () => void;
		trends?: TrendItem[];
	}

	let { onRefresh, onRefreshData, trends = [] }: Props = $props();

	type Tab = 'all' | NewsCategory | 'data-feeds';
	let activeTab = $state<Tab>('all');

	const TABS: { id: Tab; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'stocks', label: 'Stocks' },
		{ id: 'mutual-funds', label: 'Mutual Funds' },
		{ id: 'personal-finance', label: 'Personal Finance' },
		{ id: 'other', label: 'Other' },
		{ id: 'data-feeds', label: 'Trends & Data' }
	];

	const CAT_COLORS: Record<string, string> = {
		stocks: '#58a6ff',
		'mutual-funds': '#3fb950',
		'personal-finance': '#d29922',
		other: '#8b949e',
		regulatory: '#e91e63',
		'corp-action': '#ff9800',
		'market-data': '#ffd600'
	};

	const CAT_LABELS: Record<string, string> = {
		stocks: 'Stocks',
		'mutual-funds': 'Mutual Funds',
		'personal-finance': 'Personal Finance',
		other: 'Other',
		regulatory: 'Regulatory',
		'corp-action': 'Corp Action',
		'market-data': 'Market Data'
	};

	function relativeTime(date: Date): string {
		const diff = Date.now() - date.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	const feedColors = Object.fromEntries(INDIAN_NEWS_FEEDS.map((f) => [f.id, f.color]));

	function getMatchingTrend(headline: string): TrendItem | null {
		if (trends.length === 0) return null;
		const lower = headline.toLowerCase();
		for (const trend of trends) {
			const words = trend.title
				.toLowerCase()
				.replace(/[^\w\s]/g, '')
				.split(/\s+/)
				.filter((w) => w.length > 3);
			if (words.some((w) => lower.includes(w))) return trend;
		}
		return null;
	}

	const filteredCards = $derived.by(() => {
		if (activeTab === 'data-feeds') return $data.cards;
		const cards =
			activeTab === 'all' ? $news.cards : $news.cards.filter((c) => c.category === activeTab);
		const trending = cards.filter((c) => getMatchingTrend(c.headline) !== null);
		const regular = cards.filter((c) => getMatchingTrend(c.headline) === null);
		return [...trending, ...regular];
	});

	function tabCount(id: Tab): number {
		if (id === 'data-feeds') return $data.cards.length;
		if (id === 'all') return $news.cards.length;
		return $news.cards.filter((c) => c.category === id).length;
	}

	const dataFeedColors = Object.fromEntries(DATA_FEEDS.map((f) => [f.id, f.color]));

	// ── AI Summaries ────────────────────────────────────────────────────────────
	type SumState =
		| { s: 'idle' }
		| { s: 'loading' }
		| { s: 'done'; title: string; summary: string }
		| { s: 'error'; msg: string };

	let sums = $state<Record<string, SumState>>({});

	function getSummary(url: string, headline: string) {
		if (!isSummaryEnabled() || !url) return;
		const existing = untrack(() => sums[url]);
		if (existing && existing.s !== 'error') return;
		sums[url] = { s: 'loading' };
		fetchSummary(url, headline)
			.then((r: ArticleSummary) => { sums[url] = { s: 'done', ...r }; })
			.catch((e: Error) => { sums[url] = { s: 'error', msg: e.message ?? 'Failed' }; });
	}

	// ── Script Generation ────────────────────────────────────────────────────────
	const API_BASE = import.meta.env.VITE_API_URL ?? '';

	type ScriptState =
		| { s: 'idle' }
		| { s: 'loading' }
		| { s: 'done'; script: string; copied: boolean }
		| { s: 'error'; msg: string };

	let scripts = $state<Record<string, ScriptState>>({});

	function generateScript(cardId: string, headline: string, summary: string, category: string, sourceUrls: string[]) {
		if (!API_BASE) return;
		scripts[cardId] = { s: 'loading' };
		const params = new URLSearchParams({ headline, summary, category, urls: sourceUrls.join(',') });
		fetch(`${API_BASE}/script?${params}`, { signal: AbortSignal.timeout(30000) })
			.then((r) => {
				if (!r.ok) throw new Error(`script: ${r.status}`);
				return r.json();
			})
			.then((data) => { scripts[cardId] = { s: 'done', script: data.script, copied: false }; })
			.catch((e: Error) => { scripts[cardId] = { s: 'error', msg: e.message ?? 'Failed' }; });
	}

	async function copyScript(cardId: string, text: string) {
		await navigator.clipboard.writeText(text);
		const st = scripts[cardId];
		if (st?.s === 'done') scripts[cardId] = { ...st, copied: true };
		setTimeout(() => {
			const cur = scripts[cardId];
			if (cur?.s === 'done') scripts[cardId] = { ...cur, copied: false };
		}, 2000);
	}
</script>

<Panel
	id="news"
	title="Content Spotting"
	count={$news.cards.length}
	loading={$news.loading}
	error={$news.error}
>
	{#snippet header()}
		<div class="feed-legend">
			{#each INDIAN_NEWS_FEEDS as feed}
				<span class="feed-dot" style="color:{feed.color}">● {feed.name}</span>
			{/each}
		</div>
	{/snippet}

	<div class="news-toolbar">
		{#if activeTab === 'data-feeds'}
			<button
				class="refresh-news-btn"
				onclick={onRefreshData}
				disabled={$data.loading}
				title="Manually refresh data feeds"
			>
				↻ Refresh Data
			</button>
			{#if $data.lastUpdated}
				<span class="news-updated">
					Updated {new Date($data.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
				</span>
			{/if}
		{:else}
			<button
				class="refresh-news-btn"
				onclick={onRefresh}
				disabled={$news.loading}
				title="Manually refresh news"
			>
				↻ Refresh News
			</button>
			{#if $news.lastUpdated}
				<span class="news-updated">
					Updated {new Date($news.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
				</span>
			{/if}
		{/if}
	</div>

	{#if trends.length > 0}
		<div class="trends-bar">
			<span class="trends-label">🔥 Trending</span>
			{#each trends as t}
				<a href={t.shareUrl} target="_blank" rel="noopener noreferrer" class="trend-chip" title="View on Google Trends">{t.title}</a>
			{/each}
		</div>
	{/if}

	<div class="tabs">
		{#each TABS as tab}
			<button class="tab" class:active={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				{tab.label}
				{#if tabCount(tab.id) > 0}
					<span class="tab-count">{tabCount(tab.id)}</span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="cards">
		{#each filteredCards as card (card.id)}
			{@const matchedTrend = getMatchingTrend(card.headline)}
			{@const sumUrl = card.sources[0]?.url}
			{@const sum = sumUrl ? sums[sumUrl] : null}
			{@const scr = scripts[card.id]}
			<article class="card" class:trending={matchedTrend !== null}>
				<div class="card-top">
					<div class="card-badges">
						<span
							class="cat-badge"
							style="color:{CAT_COLORS[card.category]};border-color:{CAT_COLORS[card.category]}33;background:{CAT_COLORS[card.category]}11"
						>{CAT_LABELS[card.category]}</span>
						{#if matchedTrend !== null}
							<a href={matchedTrend.shareUrl} target="_blank" rel="noopener noreferrer" class="trend-badge" title="Trending: {matchedTrend.title}">🔥 Trending</a>
						{/if}
					</div>
					<span class="timestamp">{relativeTime(card.timestamp)}</span>
				</div>

				<p class="headline" class:ai-title={sum?.s === 'done'}>
					{sum?.s === 'done' ? sum.title : card.headline}
				</p>

				{#if sum?.s === 'loading'}
					<div class="summary-shimmer"></div>
				{:else if sum?.s === 'done'}
					<p class="summary">{sum.summary}</p>
				{:else if sum?.s === 'error'}
					<p class="summary-error">⚠ {sum.msg}
						<button class="inline-retry" onclick={() => getSummary(sumUrl ?? '', card.headline)}>retry</button>
					</p>
				{:else if isSummaryEnabled() && sumUrl}
					<button class="summary-btn" onclick={() => getSummary(sumUrl, card.headline)}>
						Get AI Summary
					</button>
				{/if}

				<div class="card-sources">
					{#each card.sources as src}
						{@const chipColor = feedColors[src.feedId] ?? dataFeedColors[src.feedId] ?? src.color ?? '#888'}
						<a href={src.url} target="_blank" rel="noopener noreferrer" class="source-chip" style="--chip-color:{chipColor}">
							<span class="dot">●</span>{src.name}
						</a>
					{/each}
				</div>

				<!-- Script section -->
				{#if API_BASE}
					<div class="script-row">
						{#if !scr || scr.s === 'idle'}
							<button
								class="script-btn"
								onclick={() => generateScript(
									card.id,
									sum?.s === 'done' ? sum.title : card.headline,
									sum?.s === 'done' ? sum.summary : '',
									card.category,
									card.sources.map(s => s.url)
								)}
							>✦ Generate Script</button>
						{:else if scr.s === 'loading'}
							<div class="script-generating">Generating script…</div>
						{:else if scr.s === 'error'}
							<span class="script-error">⚠ {scr.msg}</span>
							<button class="script-btn" onclick={() => generateScript(
								card.id,
								sum?.s === 'done' ? sum.title : card.headline,
								sum?.s === 'done' ? sum.summary : '',
								card.category,
								card.sources.map(s => s.url)
							)}>Retry</button>
						{/if}
					</div>

					{#if scr?.s === 'done'}
						<div class="script-box">
							<div class="script-header">
								<span class="script-label">📝 Script — Angel One Bytes</span>
								<button
									class="copy-btn"
									class:copied={scr.copied}
									onclick={() => copyScript(card.id, scr.script)}
								>{scr.copied ? '✓ Copied' : 'Copy'}</button>
							</div>
							<pre class="script-text">{scr.script}</pre>
						</div>
					{/if}
				{/if}
			</article>
		{/each}

		{#if filteredCards.length === 0 && !$news.loading && !$data.loading}
			<div class="empty">
				{#if activeTab === 'data-feeds'}
					{$data.cards.length === 0 ? 'Click Refresh Data to load regulatory & market data' : 'No data in this view'}
				{:else}
					{$news.cards.length === 0 ? 'Click Refresh News to load stories' : 'No stories in this category yet'}
				{/if}
			</div>
		{/if}
	</div>
</Panel>

<style>
	.feed-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}

	.feed-dot { font-size: 0.6rem; }

	.news-toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
	}

	.refresh-news-btn {
		font-size: 0.65rem;
		font-family: inherit;
		padding: 0.3rem 0.7rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.refresh-news-btn:hover:not(:disabled) { background: var(--border); color: var(--text); }
	.refresh-news-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	.news-updated { font-size: 0.6rem; color: var(--text-muted); }

	.trends-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		background: rgba(210, 153, 34, 0.07);
		border: 1px solid rgba(210, 153, 34, 0.18);
		border-radius: 5px;
		padding: 0.4rem 0.6rem;
		margin-bottom: 0.75rem;
	}

	.trends-label {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--yellow);
		flex-shrink: 0;
		margin-right: 0.15rem;
	}

	.trend-chip {
		font-size: 0.6rem;
		color: var(--text-dim);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.15rem 0.5rem;
		text-decoration: none;
		white-space: nowrap;
		transition: border-color 0.15s, color 0.15s;
	}

	.trend-chip:hover { border-color: var(--yellow); color: var(--yellow); text-decoration: none; }

	.tabs {
		display: flex;
		gap: 0.2rem;
		margin-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.4rem;
		flex-wrap: wrap;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.62rem;
		font-family: inherit;
		font-weight: 500;
		padding: 0.25rem 0.6rem;
		border: 1px solid transparent;
		border-radius: 4px;
		color: var(--text-muted);
		background: transparent;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.tab:hover { color: var(--text-dim); border-color: var(--border); }
	.tab.active { color: var(--text); background: var(--border); border-color: var(--border-light); }

	.tab-count {
		font-size: 0.55rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0 0.3rem;
		color: var(--text-muted);
	}

	.tab.active .tab-count { background: var(--surface); }

	.cards { display: flex; flex-direction: column; gap: 0.6rem; }

	.card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0.75rem 0.9rem;
		transition: border-color 0.15s;
	}

	.card:hover { border-color: var(--border-light); }
	.card.trending { border-left: 3px solid rgba(210, 153, 34, 0.55); }

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.45rem;
		gap: 0.5rem;
	}

	.card-badges { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }

	.cat-badge {
		font-size: 0.52rem;
		font-weight: 700;
		border: 1px solid;
		border-radius: 3px;
		padding: 0.1rem 0.4rem;
		white-space: nowrap;
		letter-spacing: 0.01em;
	}

	.trend-badge {
		font-size: 0.52rem;
		font-weight: 700;
		color: var(--yellow);
		background: rgba(210, 153, 34, 0.1);
		border: 1px solid rgba(210, 153, 34, 0.25);
		border-radius: 3px;
		padding: 0.1rem 0.35rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.trend-badge:hover { background: rgba(210, 153, 34, 0.18); text-decoration: none; }

	.timestamp {
		font-size: 0.58rem;
		color: var(--text-muted);
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.headline {
		font-size: 0.84rem;
		font-weight: 500;
		color: var(--text);
		line-height: 1.45;
		margin: 0 0 0.4rem 0;
	}

	.ai-title { font-weight: 600; }

	.summary {
		font-size: 0.72rem;
		color: var(--text-dim);
		line-height: 1.55;
		margin: 0 0 0.5rem 0;
	}

	.summary-error {
		font-size: 0.62rem;
		color: var(--red);
		margin: 0 0 0.5rem 0;
		opacity: 0.7;
	}

	.summary-btn {
		font-size: 0.6rem;
		font-family: inherit;
		padding: 0.2rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-muted);
		cursor: pointer;
		margin-bottom: 0.5rem;
		transition: all 0.15s;
	}

	.summary-btn:hover { border-color: var(--accent); color: var(--accent); }

	.inline-retry {
		font-size: 0.58rem;
		font-family: inherit;
		background: none;
		border: none;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.summary-shimmer {
		height: 2.4rem;
		border-radius: 3px;
		margin-bottom: 0.5rem;
		background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
	}

	@keyframes shimmer {
		0%   { background-position: -200% 0; }
		100% { background-position:  200% 0; }
	}

	.card-sources {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.source-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.58rem;
		font-weight: 600;
		color: var(--chip-color);
		text-decoration: none;
		opacity: 0.75;
		transition: opacity 0.12s;
	}

	.source-chip:hover { opacity: 1; text-decoration: underline; }
	.dot { font-size: 0.4rem; }

	/* ── Script ── */
	.script-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.script-btn {
		font-size: 0.62rem;
		font-family: inherit;
		font-weight: 600;
		padding: 0.3rem 0.75rem;
		background: transparent;
		border: 1px solid var(--accent);
		border-radius: 4px;
		color: var(--accent);
		cursor: pointer;
		transition: all 0.15s;
	}

	.script-btn:hover {
		background: var(--accent);
		color: var(--bg);
	}

	.script-generating {
		font-size: 0.6rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.script-error {
		font-size: 0.6rem;
		color: var(--red);
		opacity: 0.8;
	}

	.script-box {
		margin-top: 0.65rem;
		background: var(--surface);
		border: 1px solid var(--border-light);
		border-radius: 5px;
		overflow: hidden;
	}

	.script-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.7rem;
		border-bottom: 1px solid var(--border);
	}

	.script-label {
		font-size: 0.55rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.copy-btn {
		font-size: 0.58rem;
		font-family: inherit;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
	}

	.copy-btn:hover { background: var(--border); color: var(--text); }
	.copy-btn.copied { border-color: var(--green); color: var(--green); }

	.script-text {
		font-size: 0.78rem;
		line-height: 1.75;
		color: var(--text);
		padding: 0.75rem 0.9rem;
		margin: 0;
		white-space: pre-wrap;
		font-family: inherit;
	}

	.empty {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-align: center;
		padding: 2.5rem 1rem;
	}
</style>
