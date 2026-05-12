<script lang="ts">
	import Panel from '$lib/components/common/Panel.svelte';
	import { news } from '$lib/stores';
	import { INDIAN_NEWS_FEEDS } from '$lib/config/feeds';

	interface Props {
		onRefresh?: () => void;
	}

	let { onRefresh }: Props = $props();

	function relativeTime(date: Date): string {
		const diff = Date.now() - date.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		return `${days}d ago`;
	}

	const feedColors = Object.fromEntries(INDIAN_NEWS_FEEDS.map((f) => [f.id, f.color]));
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
	</div>

	<div class="cards">
		{#each $news.cards as card (card.id)}
			<article class="card">
				<div class="card-meta">
					<div class="card-sources">
						{#each card.sources as src}
							<span class="source-dot" style="color:{feedColors[src.feedId] ?? '#888'}">●</span>
							<a
								href={src.url}
								target="_blank"
								rel="noopener noreferrer"
								class="source-link"
								style="color:{feedColors[src.feedId] ?? '#888'}">{src.name}</a
							>
						{/each}
					</div>
					<span class="timestamp">{relativeTime(card.timestamp)}</span>
				</div>

				<p class="headline">{card.headline}</p>
			</article>
		{/each}

		{#if $news.cards.length === 0 && !$news.loading}
			<div class="empty">Click Refresh to load news</div>
		{/if}
	</div>
</Panel>

<style>
	.feed-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}

	.feed-dot {
		font-size: 0.55rem;
	}

	.news-toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.refresh-news-btn {
		font-size: 0.6rem;
		font-family: inherit;
		padding: 0.25rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.refresh-news-btn:hover:not(:disabled) {
		background: var(--border);
		color: var(--text);
	}

	.refresh-news-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.news-updated {
		font-size: 0.55rem;
		color: var(--text-muted);
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 0.6rem 0.7rem;
		transition: border-color 0.15s;
	}

	.card:hover {
		border-color: var(--border-light);
	}

	.card-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
		gap: 0.5rem;
	}

	.card-sources {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.2rem;
	}

	.source-dot {
		font-size: 0.5rem;
		line-height: 1;
	}

	.source-link {
		font-size: 0.55rem;
		font-weight: 600;
		text-decoration: none;
		margin-right: 0.35rem;
	}

	.source-link:hover {
		text-decoration: underline;
	}

	.timestamp {
		font-size: 0.55rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.headline {
		font-size: 0.72rem;
		color: var(--text);
		line-height: 1.4;
		margin: 0;
	}

	.empty {
		font-size: 0.65rem;
		color: var(--text-muted);
		text-align: center;
		padding: 2rem 1rem;
	}
</style>
