import { fetchWithMarketProxy as fetchWithProxy, logger } from '$lib/config/api';
import { INDICES, SECTORS } from '$lib/config/indianMarkets';
import { NIFTY50_SYMBOLS } from '$lib/config/nifty50';
import type { MarketQuote, StockQuote, MarketsData, GainersLosers } from '$lib/types';

interface ChartMeta {
	regularMarketPrice?: number;
	chartPreviousClose?: number;
	regularMarketChange?: number;
	regularMarketChangePercent?: number;
}

interface V7Quote {
	symbol: string;
	regularMarketPrice?: number;
	regularMarketChange?: number;
	regularMarketChangePercent?: number;
	chartPreviousClose?: number;
}

interface V7Response {
	quoteResponse?: { result?: V7Quote[] };
}

export function yahooFinanceUrl(symbol: string): string {
	return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

// v8/chart — no crumb needed, works reliably through proxies
async function fetchChart(symbol: string): Promise<ChartMeta | null> {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d&_t=${Date.now()}`;
	try {
		const res = await fetchWithProxy(url);
		const data = JSON.parse(await res.text());
		const meta = data?.chart?.result?.[0]?.meta;
		return meta?.regularMarketPrice != null ? meta : null;
	} catch (err) {
		logger.warn('Markets', `chart failed for ${symbol}: ${(err as Error).message}`);
		return null;
	}
}

// v7/quote batch — for 50 Nifty stocks (acceptable if it works, falls back gracefully)
async function fetchV7Batch(symbols: string[]): Promise<Map<string, V7Quote>> {
	const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&_t=${Date.now()}`;
	try {
		const res = await fetchWithProxy(url);
		const data: V7Response = JSON.parse(await res.text());
		const quotes = data?.quoteResponse?.result ?? [];
		const map = new Map<string, V7Quote>();
		for (const q of quotes) {
			if (q.regularMarketPrice != null) map.set(q.symbol, q);
		}
		return map;
	} catch (err) {
		logger.warn('Markets', `v7 batch failed: ${(err as Error).message}`);
		return new Map();
	}
}

function calcChange(price: number, prev: number, explicitChange?: number, explicitPct?: number) {
	const change = explicitChange ?? price - prev;
	const changePercent = explicitPct ?? (prev !== 0 ? ((price - prev) / prev) * 100 : 0);
	return { change, changePercent };
}

export async function fetchMarkets(): Promise<MarketsData> {
	const allSymbols = [...INDICES, ...SECTORS];

	// Parallel v8/chart — one proxy call per symbol, no crumb needed
	const metas = await Promise.all(allSymbols.map(s => fetchChart(s.symbol)));
	const metaMap = new Map(allSymbols.map((s, i) => [s.symbol, metas[i]]));

	function buildQuote(sym: { symbol: string; name: string; type: 'index' | 'sector' }): MarketQuote {
		const m = metaMap.get(sym.symbol);
		if (!m?.regularMarketPrice) {
			return { symbol: sym.symbol, name: sym.name, price: 0, change: 0, changePercent: 0, type: sym.type };
		}
		const price = m.regularMarketPrice;
		const prev = m.chartPreviousClose ?? price;
		const { change, changePercent } = calcChange(price, prev, m.regularMarketChange, m.regularMarketChangePercent);
		return { symbol: sym.symbol, name: sym.name, price, change, changePercent, type: sym.type };
	}

	return { indices: INDICES.map(buildQuote), sectors: SECTORS.map(buildQuote) };
}

export async function fetchGainersLosers(): Promise<GainersLosers> {
	const symbols = NIFTY50_SYMBOLS.map(s => s.symbol);
	const nameMap = new Map(NIFTY50_SYMBOLS.map(s => [s.symbol, s.name]));

	// Try v7/quote batch first (2 calls for 50 symbols); fall back to v8/chart per-symbol
	let [map1, map2] = await Promise.all([
		fetchV7Batch(symbols.slice(0, 25)),
		fetchV7Batch(symbols.slice(25))
	]);

	// If v7 returned nothing, fall back to v8/chart (serial, batched)
	if (map1.size === 0 && map2.size === 0) {
		const BATCH = 10;
		const combined = new Map<string, V7Quote>();
		for (let i = 0; i < symbols.length; i += BATCH) {
			const batch = symbols.slice(i, i + BATCH);
			const metas = await Promise.all(batch.map(s => fetchChart(s)));
			batch.forEach((sym, idx) => {
				const m = metas[idx];
				if (m?.regularMarketPrice != null) {
					combined.set(sym, {
						symbol: sym,
						regularMarketPrice: m.regularMarketPrice,
						regularMarketChange: m.regularMarketChange,
						regularMarketChangePercent: m.regularMarketChangePercent,
						chartPreviousClose: m.chartPreviousClose
					});
				}
			});
			if (i + BATCH < symbols.length) await new Promise(r => setTimeout(r, 200));
		}
		map1 = combined;
		map2 = new Map();
	}

	const allQuotes = new Map([...map1, ...map2]);
	const stocks: StockQuote[] = [];

	for (const [symbol, q] of allQuotes) {
		if (q.regularMarketPrice == null) continue;
		const price = q.regularMarketPrice;
		const prev = q.chartPreviousClose ?? price;
		const { change, changePercent } = calcChange(price, prev, q.regularMarketChange, q.regularMarketChangePercent);
		stocks.push({ symbol, name: nameMap.get(symbol) ?? symbol, price, change, changePercent });
	}

	const sorted = stocks.sort((a, b) => b.changePercent - a.changePercent);
	return { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() };
}
