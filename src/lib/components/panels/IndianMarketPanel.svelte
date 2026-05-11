<script lang="ts">
	import Panel from '$lib/components/common/Panel.svelte';
	import { markets } from '$lib/stores';

	function fmt(price: number, sym: string): string {
		if (sym === 'INR=X') return price.toFixed(2);
		if (price >= 10000) return price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
		return price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function fmtPct(pct: number): string {
		const sign = pct >= 0 ? '+' : '';
		return `${sign}${pct.toFixed(2)}%`;
	}
</script>

<Panel id="markets" title="Indian Market Overview" loading={$markets.loading} error={$markets.error}>
	{#if $markets.indices.length > 0}
		<div class="section-label">Indices</div>
		<div class="indices-grid">
			{#each $markets.indices as item}
				<div class="market-tile" class:up={item.changePercent >= 0} class:down={item.changePercent < 0}>
					<div class="tile-name">{item.name}</div>
					<div class="tile-price">{fmt(item.price, item.symbol)}</div>
					<div class="tile-change">{fmtPct(item.changePercent)}</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if $markets.sectors.length > 0}
		<div class="section-label" style="margin-top:0.75rem">Sectors</div>
		<div class="sectors-grid">
			{#each $markets.sectors as item}
				<div class="sector-row" class:up={item.changePercent >= 0} class:down={item.changePercent < 0}>
					<span class="sector-name">{item.name}</span>
					<span class="sector-change">{fmtPct(item.changePercent)}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if $markets.indices.length === 0 && !$markets.loading}
		<div class="empty">No market data — click Refresh</div>
	{/if}
</Panel>

<style>
	.section-label {
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: 0.4rem;
	}

	.indices-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.4rem;
	}

	.market-tile {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 0.5rem 0.6rem;
	}

	.market-tile.up {
		border-left: 2px solid var(--green);
	}

	.market-tile.down {
		border-left: 2px solid var(--red);
	}

	.tile-name {
		font-size: 0.6rem;
		color: var(--text-dim);
		margin-bottom: 0.2rem;
	}

	.tile-price {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 0.15rem;
	}

	.tile-change {
		font-size: 0.65rem;
		font-weight: 500;
	}

	.market-tile.up .tile-change {
		color: var(--green);
	}

	.market-tile.down .tile-change {
		color: var(--red);
	}

	.sectors-grid {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.sector-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.25rem 0.5rem;
		background: var(--bg);
		border-radius: 3px;
		border: 1px solid var(--border);
	}

	.sector-name {
		font-size: 0.65rem;
		color: var(--text-dim);
	}

	.sector-change {
		font-size: 0.65rem;
		font-weight: 600;
	}

	.sector-row.up .sector-change {
		color: var(--green);
	}

	.sector-row.down .sector-change {
		color: var(--red);
	}

	.empty {
		font-size: 0.65rem;
		color: var(--text-muted);
		text-align: center;
		padding: 1rem;
	}
</style>
