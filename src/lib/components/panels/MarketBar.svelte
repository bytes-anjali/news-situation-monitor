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

	const updatedAt = $derived(
		$markets.lastUpdated
			? new Date($markets.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
			: ''
	);
</script>

<div class="market-row">

	<!-- ── Indices ───────────────────────────────────── -->
	<div class="section">
		<div class="section-head">
			<span class="section-title">Indices</span>
			{#if updatedAt}<span class="updated">{updatedAt}</span>{/if}
		</div>
		{#if $markets.loading}
			<div class="loading">Loading…</div>
		{:else}
			<div class="tiles">
				{#each $markets.indices as item}
					<a
						class="tile"
						class:up={item.changePercent >= 0}
						class:down={item.changePercent < 0}
						href={yahooFinanceUrl(item.symbol)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span class="tile-name">{item.name}</span>
						<span class="tile-val">{fmt(item.price, item.symbol)}</span>
						<span class="tile-pct">{fmtPct(item.changePercent)}</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- ── Sectors ───────────────────────────────────── -->
	<div class="section">
		<div class="section-head">
			<span class="section-title">Sectors</span>
		</div>
		{#if $markets.loading}
			<div class="loading">Loading…</div>
		{:else}
			<div class="tiles">
				{#each $markets.sectors as item}
					<a
						class="tile"
						class:up={item.changePercent >= 0}
						class:down={item.changePercent < 0}
						href={yahooFinanceUrl(item.symbol)}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span class="tile-name">{item.name}</span>
						<span class="tile-val">{fmt(item.price, item.symbol)}</span>
						<span class="tile-pct">{fmtPct(item.changePercent)}</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- ── Gainers / Losers ──────────────────────────── -->
	<div class="section gl-section">
		<div class="gl-half">
			<div class="section-head">
				<span class="section-title gainers-title">▲ Gainers</span>
			</div>
			{#if $markets.gainersLoading}
				<div class="loading">Loading…</div>
			{:else if $markets.gainers.length > 0}
				<div class="tiles">
					{#each $markets.gainers as s}
						<a class="tile up" href={yahooFinanceUrl(s.symbol)} target="_blank" rel="noopener noreferrer">
							<span class="tile-name">{s.name}</span>
							<span class="tile-sub">₹{fmtPrice(s.price)}</span>
							<span class="tile-pct">{fmtPct(s.changePercent)}</span>
						</a>
					{/each}
				</div>
			{:else}
				<button class="load-btn" onclick={onRefreshGainers}>Load gainers/losers</button>
			{/if}
		</div>

		<div class="divider-v"></div>

		<div class="gl-half">
			<div class="section-head">
				<span class="section-title losers-title">▼ Losers</span>
			</div>
			{#if $markets.gainersLoading}
				<div class="loading">Loading…</div>
			{:else if $markets.losers.length > 0}
				<div class="tiles">
					{#each $markets.losers as s}
						<a class="tile down" href={yahooFinanceUrl(s.symbol)} target="_blank" rel="noopener noreferrer">
							<span class="tile-name">{s.name}</span>
							<span class="tile-sub">₹{fmtPrice(s.price)}</span>
							<span class="tile-pct">{fmtPct(s.changePercent)}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

</div>

<style>
	.market-row {
		display: flex;
		align-items: stretch;
		gap: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.75rem 0;
		margin-bottom: 0.5rem;
		overflow-x: auto;
	}

	/* ── Sections ── */
	.section {
		display: flex;
		flex-direction: column;
		padding: 0 1rem;
		min-width: 0;
		flex-shrink: 0;
	}

	.gl-section {
		display: flex;
		flex-direction: row;
		gap: 0;
		padding: 0;
		flex: 1;
	}

	.gl-half {
		display: flex;
		flex-direction: column;
		padding: 0 1rem;
		min-width: 0;
		flex: 1;
	}

	/* ── Headers ── */
	.section-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.section-title {
		font-size: 0.52rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.gainers-title { color: var(--green); }
	.losers-title  { color: var(--red); }

	.updated {
		font-size: 0.48rem;
		color: var(--text-muted);
		opacity: 0.7;
	}

	/* ── Dividers ── */
	.divider {
		width: 1px;
		background: var(--border);
		flex-shrink: 0;
		align-self: stretch;
	}

	.divider-v {
		width: 1px;
		background: var(--border);
		flex-shrink: 0;
		align-self: stretch;
	}

	/* ── Tile grid ── */
	.tiles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-content: flex-start;
	}

	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0.35rem 0.55rem;
		text-decoration: none;
		transition: border-color 0.15s;
		min-width: 5.5rem;
	}

	.tile:hover {
		border-color: var(--border-light);
		text-decoration: none;
	}

	.tile.up  { border-top: 2px solid var(--green); }
	.tile.down { border-top: 2px solid var(--red); }

	.tile-name {
		font-size: 0.58rem;
		color: var(--text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 7rem;
	}

	.tile-val {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text);
		font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
		white-space: nowrap;
	}

	.tile-sub {
		font-size: 0.55rem;
		color: var(--text-muted);
		font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
	}

	.tile-pct {
		font-size: 0.65rem;
		font-weight: 600;
		font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
		white-space: nowrap;
	}

	.tile.up   .tile-pct { color: var(--green); }
	.tile.down .tile-pct { color: var(--red); }

	.loading {
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.load-btn {
		font-size: 0.58rem;
		font-family: inherit;
		padding: 0.25rem 0.7rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-dim);
		cursor: pointer;
		white-space: nowrap;
	}

	.load-btn:hover {
		background: var(--border);
		color: var(--text);
	}
</style>
