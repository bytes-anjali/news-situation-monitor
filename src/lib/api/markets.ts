import { fetchWithProxy } from '$lib/config/api';
import { INDICES, SECTORS } from '$lib/config/indianMarkets';
import { NIFTY50_SYMBOLS } from '$lib/config/nifty50';
import type { MarketQuote, StockQuote, MarketsData, GainersLosers } from '$lib/types';

interface YahooQuote {
	symbol: string;
	shortName?: string;
	longName?: string;
	regularMarketPrice?: number;
	regularMarketChange?: number;
	regularMarketChangePercent?: number;
}

interface YahooQuoteResponse {
	quoteResponse?: {
		result?: YahooQuote[];
		error?: unknown;
	};
}

async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuote[]> {
	const symbolsParam = symbols.join(',');
	const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}&fields=shortName,longName,regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

	const response = await fetchWithProxy(url);
	const text = await response.text();

	let data: YahooQuoteResponse;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('Failed to parse Yahoo Finance response');
	}

	return data?.quoteResponse?.result ?? [];
}

export async function fetchMarkets(): Promise<MarketsData> {
	const allSymbols = [...INDICES, ...SECTORS].map((s) => s.symbol);
	const quotes = await fetchYahooQuotes(allSymbols);

	const quoteMap = new Map<string, YahooQuote>();
	for (const q of quotes) {
		quoteMap.set(q.symbol, q);
	}

	function buildQuote(
		sym: { symbol: string; name: string; type: 'index' | 'sector' }
	): MarketQuote {
		const q = quoteMap.get(sym.symbol);
		return {
			symbol: sym.symbol,
			name: sym.name,
			price: q?.regularMarketPrice ?? 0,
			change: q?.regularMarketChange ?? 0,
			changePercent: q?.regularMarketChangePercent ?? 0,
			type: sym.type
		};
	}

	return {
		indices: INDICES.map(buildQuote),
		sectors: SECTORS.map(buildQuote)
	};
}

export async function fetchGainersLosers(): Promise<GainersLosers> {
	// Fetch in two batches of 25 to stay within URL limits
	const batch1 = NIFTY50_SYMBOLS.slice(0, 25).map((s) => s.symbol);
	const batch2 = NIFTY50_SYMBOLS.slice(25).map((s) => s.symbol);

	const [quotes1, quotes2] = await Promise.all([
		fetchYahooQuotes(batch1),
		fetchYahooQuotes(batch2)
	]);

	const allQuotes = [...quotes1, ...quotes2];
	const nameMap = new Map(NIFTY50_SYMBOLS.map((s) => [s.symbol, s.name]));

	const stocks: StockQuote[] = allQuotes
		.filter((q) => q.regularMarketPrice != null)
		.map((q) => ({
			symbol: q.symbol,
			name: nameMap.get(q.symbol) ?? q.shortName ?? q.symbol,
			price: q.regularMarketPrice!,
			change: q.regularMarketChange ?? 0,
			changePercent: q.regularMarketChangePercent ?? 0
		}));

	const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent);

	return {
		gainers: sorted.slice(0, 5),
		losers: sorted.slice(-5).reverse()
	};
}
