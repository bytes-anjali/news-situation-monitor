<script lang="ts">
	import { markets } from '$lib/stores';
	import { yahooFinanceUrl } from '$lib/api/markets';

	interface Props {
		onRefreshGainers?: () => void;
	}
	let { onRefreshGainers }: Props = $props();

	function fmt(price: number, sym: string): string {
		if (sym === 'INR=X') return price.toFixed(2);
		if (price >= 10000) return price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
		return price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function fmtPct(pct: number): string {
		return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
	}

	function fmtPrice(p: number): string {
		return p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	const lastUpdatedText = $derived(
		$markets.lastUpdated
			? `${new Date($markets.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
			: ''
	);
</script>

<div class="market-bar">
	<!-- Indices -->
	<div class="bar-section indices-section">
		<span class="section-label">Indices</span>
		{#if $markets.loading}
			<span class="loading-text">Loading…</span>
		{:else if $markets.indices.length > 0}
			<div class="indices-row">
				{#each $markets.indices as item}
					<a
						class="index-chip"
						class:up={item.changePercent >= 0}
						class:down={item.changePercent < 0}
						href={yahooFinanceUrl(item.symbol)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span class="chip-name">{item.name}</span>
						<span class="chip-value">{fmt(item.price, item.symbol)}</span>
						<span class="chip-pct">{fmtPct(item.changePercent)}</span>
					</a>
				{/each}
			</div>
			{#if lastUpdatedText}
				<span class="updated-at">{lastUpdatedText}</span>
			{/if}
		{:else}
			<span class="empty-text">No data</span>
		{/if}
	</div>

	<!-- Sectors -->
	{#if $markets.sectors.length > 0}
		<div class="bar-section sectors-section">
			<span class="section-label">Sectors</span>
			<div class="sectors-row">
				{#each $markets.sectors as item}
					<a
						class="sector-chip"
						class:up={item.changePercent >= 0}
						class:down={item.changePercent < 0}
						href={yahooFinanceUrl(item.symbol)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span class="chip-name">{item.name}</span>
						<span class="chip-pct">{fmtPct(item.changePercent)}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Gainers & Losers -->
	<div class="bar-section gl-section">
		<div class="gl-col">
			<span class="section-label gainers-label">▲ Gainers</span>
			{#if $markets.gainersLoading}
				<span class="loading-text">Loading…</span>
			{:else if $markets.gainers.length > 0}
				<div class="gl-row">
					{#each $markets.gainers as stock}
						<a
							class="gl-chip up"
							href={yahooFinanceUrl(stock.symbol)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span class="chip-name">{stock.name}</span>
							<span class="chip-price">₹{fmtPrice(stock.price)}</span>
							<span class="chip-pct">{fmtPct(stock.changePercent)}</span>
						</a>
					{/each}
				</div>
			{:else}
				<button class="load-btn" onclick={onRefreshGainers}>Load</button>
			{/if}
		</div>

		<div class="gl-divider"></div>

		<div class="gl-col">
			<span class="section-label losers-label">▼ Losers</span>
			{#if $markets.gainersLoading}
				<span class="loading-text">Loading…</span>
			{:else if $markets.losers.length > 0}
				<div class="gl-row">
					{#each $markets.losers as stock}
						<a
							class="gl-chip down"
							href={yahooFinanceUrl(stock.symbol)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span class="chip-name">{stock.name}</span>
							<span class="chip-price">₹{fmtPrice(stock.price)}</span>
							<span class="chip-pct">{fmtPct(stock.changePercent)}</span>
						</a>
					{/each}
				</div>
			{:else}
				<button class="load-btn" onclick={onRefreshGainers}>Load</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.market-bar {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.7rem 1rem;
		margin-bottom: 0.5rem;
	}

	.bar-section {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.section-label {
		font-size: 0.52rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		flex-shrink: 0;
		padding-top: 0.35rem;
		min-width: 3.5rem;
	}

	.gainers-label { color: var(--green); }
	.losers-label  { color: var(--red); }

	/* ── Indices ── */
	.indices-section { align-items: center; }

	.indices-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		flex: 1;
	}

	.index-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0.3rem 0.6rem;
		text-decoration: none;
		transition: border-color 0.15s;
		white-space: nowrap;
	}

	.index-chip:hover { border-color: var(--border-light); text-decoration: none; }
	.index-chip.up  { border-left: 2px solid var(--green); }
	.index-chip.down { border-left: 2px solid var(--red); }

	.chip-name {
		font-size: 0.62rem;
		color: var(--text-dim);
	}

	.chip-value {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text);
		font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
	}

	.chip-pct {
		font-size: 0.65rem;
		font-weight: 600;
		font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
	}

	.index-chip.up  .chip-pct { color: var(--green); }
	.index-chip.down .chip-pct { color: var(--red); }

	.updated-at {
		font-size: 0.5rem;
		color: var(--text-muted);
		flex-shrink: 0;
		align-self: center;
	}

	/* ── Sectors ── */
	.sectors-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		flex: 1;
	}

	.sector-chip {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.2rem 0.5rem;
		text-decoration: none;
		white-space: nowrap;
		transition: border-color 0.15s;
	}

	.sector-chip:hover { border-color: var(--border-light); text-decoration: none; }
	.sector-chip.up  .chip-pct { color: var(--green); }
	.sector-chip.down .chip-pct { color: var(--red); }
	.sector-chip .chip-name { font-size: 0.6rem; color: var(--text-dim); }
	.sector-chip .chip-pct  { font-size: 0.62rem; font-weight: 600; font-family: 'SF Mono', Monaco, 'Fira Code', monospace; }

	/* ── Gainers / Losers ── */
	.gl-section {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.gl-col {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.gl-divider {
		width: 1px;
		background: var(--border);
		align-self: stretch;
		flex-shrink: 0;
	}

	.gl-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		flex: 1;
	}

	.gl-chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		text-decoration: none;
		white-space: nowrap;
		transition: border-color 0.15s;
	}

	.gl-chip:hover { border-color: var(--border-light); text-decoration: none; }
	.gl-chip .chip-name  { font-size: 0.62rem; font-weight: 600; color: var(--text); }
	.gl-chip .chip-price { font-size: 0.55rem; color: var(--text-muted); font-family: 'SF Mono', Monaco, 'Fira Code', monospace; }
	.gl-chip.up   .chip-pct { color: var(--green); }
	.gl-chip.down .chip-pct { color: var(--red); }
	.gl-chip .chip-pct { font-size: 0.62rem; font-weight: 600; font-family: 'SF Mono', Monaco, 'Fira Code', monospace; }

	.loading-text, .empty-text {
		font-size: 0.6rem;
		color: var(--text-muted);
		padding-top: 0.3rem;
	}

	.load-btn {
		font-size: 0.58rem;
		font-family: inherit;
		padding: 0.2rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		margin-top: 0.2rem;
	}

	.load-btn:hover { background: var(--border); color: var(--text); }
</style>
