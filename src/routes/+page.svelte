<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Dashboard } from '$lib/components/layout';
	import { IndianMarketPanel, GainersLosersPanel, ContentSpottingPanel } from '$lib/components/panels';
	import { markets, news, refresh } from '$lib/stores';
	import { fetchMarkets, fetchGainersLosers, fetchIndianNews } from '$lib/api';

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

	async function handleRefresh() {
		refresh.startRefresh();

		// Safety net: always end refresh after 45s no matter what
		const safetyTimer = setTimeout(() => refresh.endRefresh(['Refresh timed out']), 45000);

		try {
			// Stage 1: markets (fast, parallel)
			await Promise.all([loadMarkets(), loadGainersLosers()]);
			refresh.nextStage();

			// Stage 2: news (sequential RSS fetching across 4 feeds)
			await loadNews();
			refresh.endRefresh();
		} catch (err) {
			refresh.endRefresh([String(err)]);
		} finally {
			clearTimeout(safetyTimer);
		}
	}

	onMount(() => {
		handleRefresh();
		refresh.setupAutoRefresh(handleRefresh);
		return () => refresh.stopAutoRefresh();
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
				<GainersLosersPanel />
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
