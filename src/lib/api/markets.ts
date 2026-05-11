import { fetchWithProxy, logger } from '$lib/config/api';
import { INDICES, SECTORS } from '$lib/config/indianMarkets';
import { NIFTY50_SYMBOLS } from '$lib/config/nifty50';
import type { MarketQuote, StockQuote, MarketsData, GainersLosers } from '$lib/types';

interface ChartMeta {
	regularMarketPrice?: number;
	chartPreviousClose?: number;
	regularMarketChange?: number;
	regularMarketChangePercent?: number;
	currency?: string;
}

interface ChartResponse {
	chart?: {
		result?: Array<{ meta: ChartMeta }>;
		error?: unknown;
	};
}

async function fetchYahooChart(symbol: string): Promise<ChartMeta | null> {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
	try {
		const response = await fetchWithProxy(url);
		const text = await response.text();
		const data: ChartResponse = JSON.parse(text);
		return data?.chart?.result?.[0]?.meta ?? null;
	} catch (err) {
		logger.warn('Markets', `Failed to fetch ${symbol}: ${(err as Error).message}`);
		return null;
	}
}

async function fetchSymbolsBatch(
	symbols: string[]
): Promise<Map<string, ChartMeta>> {
	const results = await Promise.all(symbols.map((s) => fetchYahooChart(s).then((m) => ({ symbol: s, meta: m }))));
	const map = new Map<string, ChartMeta>();
	for (const { symbol, meta } of results) {
		if (meta) map.set(symbol, meta);
	}
	return map;
}

function calcChange(meta: ChartMeta): { change: number; changePercent: number } {
	const price = meta.regularMarketPrice ?? 0;
	const prev = meta.chartPreviousClose ?? price;
	// Prefer explicit fields if available, otherwise derive from prev close
	const change = meta.regularMarketChange ?? price - prev;
	const changePercent =
		meta.regularMarketChangePercent ?? (prev !== 0 ? ((price - prev) / prev) * 100 : 0);
	return { change, changePercent };
}

export async function fetchMarkets(): Promise<MarketsData> {
	const allSymbols = [...INDICES, ...SECTORS];
	const quoteMap = await fetchSymbolsBatch(allSymbols.map((s) => s.symbol));

	function buildQuote(sym: { symbol: string; name: string; type: 'index' | 'sector' }): MarketQuote {
		const meta = quoteMap.get(sym.symbol);
		if (!meta) {
			return { symbol: sym.symbol, name: sym.name, price: 0, change: 0, changePercent: 0, type: sym.type };
		}
		const { change, changePercent } = calcChange(meta);
		return {
			symbol: sym.symbol,
			name: sym.name,
			price: meta.regularMarketPrice ?? 0,
			change,
			changePercent,
			type: sym.type
		};
	}

	return {
		indices: INDICES.map(buildQuote),
		sectors: SECTORS.map(buildQuote)
	};
}

export async function fetchGainersLosers(): Promise<GainersLosers> {
	const symbols = NIFTY50_SYMBOLS.map((s) => s.symbol);

	// Fetch in batches of 10 with small delays to avoid rate limits
	const BATCH_SIZE = 10;
	const allMeta = new Map<string, ChartMeta>();

	for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
		const batch = symbols.slice(i, i + BATCH_SIZE);
		const batchMap = await fetchSymbolsBatch(batch);
		for (const [sym, meta] of batchMap) {
			allMeta.set(sym, meta);
		}
		if (i + BATCH_SIZE < symbols.length) {
			await new Promise((r) => setTimeout(r, 300));
		}
	}

	const nameMap = new Map(NIFTY50_SYMBOLS.map((s) => [s.symbol, s.name]));

	const stocks: StockQuote[] = [];
	for (const [symbol, meta] of allMeta) {
		if (meta.regularMarketPrice == null) continue;
		const { change, changePercent } = calcChange(meta);
		stocks.push({
			symbol,
			name: nameMap.get(symbol) ?? symbol,
			price: meta.regularMarketPrice,
			change,
			changePercent
		});
	}

	const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);

	return {
		gainers: sorted.slice(0, 5),
		losers: sorted.slice(-5).reverse()
	};
}
