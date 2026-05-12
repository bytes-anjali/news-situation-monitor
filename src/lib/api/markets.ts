import { fetchWithProxy, logger } from '$lib/config/api';
import { INDICES, SECTORS } from '$lib/config/indianMarkets';
import { NIFTY50_SYMBOLS } from '$lib/config/nifty50';
import type { MarketQuote, StockQuote, MarketsData, GainersLosers } from '$lib/types';

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

async function fetchV7Batch(symbols: string[]): Promise<Map<string, V7Quote>> {
	const t = Date.now();
	const syms = encodeURIComponent(symbols.join(','));

	for (const host of ['query1', 'query2'] as const) {
		const url = `https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${syms}&_t=${t}`;
		try {
			const response = await fetchWithProxy(url);
			const text = await response.text();
			const data: V7Response = JSON.parse(text);
			const quotes = data?.quoteResponse?.result ?? [];
			if (quotes.length > 0) {
				const map = new Map<string, V7Quote>();
				for (const q of quotes) map.set(q.symbol, q);
				return map;
			}
		} catch (err) {
			logger.warn('Markets', `${host} v7 batch failed: ${(err as Error).message}`);
		}
	}
	return new Map();
}

function buildChange(q: V7Quote): { change: number; changePercent: number } {
	const price = q.regularMarketPrice ?? 0;
	const prev = q.chartPreviousClose ?? price;
	return {
		change: q.regularMarketChange ?? price - prev,
		changePercent: q.regularMarketChangePercent ?? (prev !== 0 ? ((price - prev) / prev) * 100 : 0)
	};
}

export async function fetchMarkets(): Promise<MarketsData> {
	const allSymbols = [...INDICES, ...SECTORS];
	// Single batch request — all 10 symbols in one proxy call
	const quoteMap = await fetchV7Batch(allSymbols.map((s) => s.symbol));

	function buildQuote(sym: { symbol: string; name: string; type: 'index' | 'sector' }): MarketQuote {
		const q = quoteMap.get(sym.symbol);
		if (!q) return { symbol: sym.symbol, name: sym.name, price: 0, change: 0, changePercent: 0, type: sym.type };
		const { change, changePercent } = buildChange(q);
		return { symbol: sym.symbol, name: sym.name, price: q.regularMarketPrice ?? 0, change, changePercent, type: sym.type };
	}

	return { indices: INDICES.map(buildQuote), sectors: SECTORS.map(buildQuote) };
}

export async function fetchGainersLosers(): Promise<GainersLosers> {
	const symbols = NIFTY50_SYMBOLS.map((s) => s.symbol);
	const nameMap = new Map(NIFTY50_SYMBOLS.map((s) => [s.symbol, s.name]));

	// Two batches of 25 — 2 proxy calls total instead of 50
	const [map1, map2] = await Promise.all([
		fetchV7Batch(symbols.slice(0, 25)),
		fetchV7Batch(symbols.slice(25))
	]);
	const allQuotes = new Map([...map1, ...map2]);

	const stocks: StockQuote[] = [];
	for (const [symbol, q] of allQuotes) {
		if (q.regularMarketPrice == null) continue;
		const { change, changePercent } = buildChange(q);
		stocks.push({ symbol, name: nameMap.get(symbol) ?? symbol, price: q.regularMarketPrice, change, changePercent });
	}

	const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
	return { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() };
}
