<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Dashboard } from '$lib/components/layout';
	import { IndianMarketPanel, GainersLosersPanel, ContentSpottingPanel } from '$lib/components/panels';
	import { markets, news, refresh } from '$lib/stores';
	import { fetchMarkets, fetchGainersLosers, fetchIndianNews } from '$lib/api';
	import { isMarketOpen, getNewsRefreshInterval } from '$lib/utils/marketHours';

	const MARKET_REFRESH_MS = 60 * 1000;

	async function loadMarkets() {
		markets.setLoading(true);
		try {
			const data = await fetchMarkets();
			markets.setMarkets(data.indices, data.sectors);
		} catch (err) {
			markets.setError(String(err));
		}
	}

	async function loadGainersLosers() {
		markets.setGainersLoading(true);
		try {
			const data = await fetchGainersLosers();
			markets.setGainersLosers(data);
		} catch (err) {
			markets.setError(String(err));
		}
	}

	async function loadNews() {
		news.setLoading(true);
		try {
			const cards = await fetchIndianNews();
			news.setCards(cards);
		} catch (err) {
			news.setError(String(err));
		}
	}

	// Full manual refresh — shows "Refreshing..." in header
	async function handleRefresh() {
		refresh.startRefresh();

		const safetyTimer = setTimeout(() => refresh.endRefresh(['Refresh timed out']), 45000);

		try {
			await Promise.all([loadMarkets(), loadGainersLosers()]);
			refresh.nextStage();
			await loadNews();
			refresh.endRefresh();
		} catch (err) {
			refresh.endRefresh([String(err)]);
		} finally {
			clearTimeout(safetyTimer);
		}
	}

	// Silent background refreshes — no header spinner
	async function silentRefreshMarkets() {
		if (!isMarketOpen()) return;
		try {
			const data = await fetchMarkets();
			markets.setMarkets(data.indices, data.sectors);
		} catch {
			// don't clobber panel error state on transient failures
		}
	}

	async function silentRefreshNews() {
		try {
			const cards = await fetchIndianNews();
			news.setCards(cards);
		} catch {
			// silent
		}
	}

	onMount(() => {
		// Initial full load (including gainers/losers once)
		handleRefresh();

		// Markets: every 60s, skips automatically when market is closed
		const marketTimer = setInterval(silentRefreshMarkets, MARKET_REFRESH_MS);

		// News: self-rescheduling — 15min during market hours, 60min outside
		let newsTimer: ReturnType<typeof setTimeout> | null = null;
		function scheduleNews() {
			newsTimer = setTimeout(async () => {
				await silentRefreshNews();
				scheduleNews();
			}, getNewsRefreshInterval());
		}
		scheduleNews();

		return () => {
			clearInterval(marketTimer);
			if (newsTimer) clearTimeout(newsTimer);
		};
	});
</script>

<svelte:head>
	<title>AngelOne Bytes — Content Dashboard</title>
	<meta name="description" content="Indian stock market and finance content spotting dashboard" />
</svelte:head>

<div class="app">
	<Header onRefresh={handleRefresh} />

	<main class="main-content">
		<Dashboard>
			<div class="panel-slot">
				<IndianMarketPanel />
			</div>
			<div class="panel-slot">
				<GainersLosersPanel onRefresh={loadGainersLosers} />
			</div>
			<div class="panel-slot news-slot">
				<ContentSpottingPanel />
			</div>
		</Dashboard>
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
	}

	.news-slot {
		column-span: all;
	}
</style>
