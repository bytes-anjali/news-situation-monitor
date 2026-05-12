<script lang="ts">
	import Panel from '$lib/components/common/Panel.svelte';
	import type { TrendItem } from '$lib/api/trends';

	interface Props {
		trends: TrendItem[];
		loading: boolean;
		error?: string | null;
		onRefresh?: () => void;
	}

	let { trends, loading, error = null, onRefresh }: Props = $props();
</script>

<Panel id="trends" title="Trending: Business & Finance" {loading} {error}>
	{#snippet actions()}
		<button
			class="refresh-btn"
			onclick={onRefresh}
			disabled={loading}
			title="Refresh trends"
		>
			↻
		</button>
	{/snippet}

	<div class="trends-list">
		{#if trends.length > 0}
			{#each trends as trend, i}
				<a
					class="trend-row"
					href={trend.shareUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					<span class="rank">#{i + 1}</span>
					<div class="trend-info">
						<span class="trend-title">{trend.title}</span>
						{#if trend.entityName && trend.entityName !== trend.title}
							<span class="trend-entity">{trend.entityName}</span>
						{/if}
					</div>
					<span class="trend-arrow">↗</span>
				</a>
			{/each}
		{:else if !loading}
			<div class="empty">No trending B&F topics found</div>
		{/if}
	</div>

	<div class="source-note">
		<a href="https://trends.google.com/trends/explore?cat=b&geo=IN" target="_blank" rel="noopener noreferrer">
			Google Trends · Business & Finance · India
		</a>
	</div>
</Panel>

<style>
	.trends-list {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.trend-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.4rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		text-decoration: none;
		transition: background 0.15s, border-color 0.15s;
	}

	.trend-row:hover {
		background: var(--surface-hover);
		border-color: var(--border-light);
		text-decoration: none;
	}

	.rank {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--text-muted);
		min-width: 1.5rem;
		flex-shrink: 0;
	}

	.trend-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.trend-title {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.trend-entity {
		font-size: 0.55rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.trend-arrow {
		font-size: 0.65rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.empty {
		font-size: 0.65rem;
		color: var(--text-muted);
		text-align: center;
		padding: 1rem;
	}

	.source-note {
		margin-top: 0.5rem;
		text-align: right;
	}

	.source-note a {
		font-size: 0.5rem;
		color: var(--text-muted);
		text-decoration: none;
		opacity: 0.6;
	}

	.source-note a:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.refresh-btn {
		font-size: 0.75rem;
		font-family: inherit;
		padding: 0.1rem 0.35rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		transition: all 0.15s;
		line-height: 1;
	}

	.refresh-btn:hover:not(:disabled) {
		background: var(--border);
		color: var(--text);
	}

	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
