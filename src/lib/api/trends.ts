import { fetchWithProxy, logger } from '$lib/config/api';
import { NIFTY50_SYMBOLS } from '$lib/config/nifty50';

export interface TrendItem {
	symbol: string;
	name: string;
	shareUrl: string;
}

interface TrendingResponse {
	finance?: {
		result?: Array<{
			quotes?: Array<{ symbol: string }>;
		}>;
		error?: unknown;
	};
}

const nameMap = new Map(NIFTY50_SYMBOLS.map((s) => [s.symbol, s.name]));

function symbolToName(symbol: string): string {
	return nameMap.get(symbol) ?? symbol.replace(/\.NS$/, '');
}

export async function fetchBusinessTrends(): Promise<TrendItem[]> {
	const t = Date.now();

	for (const host of ['query1', 'query2'] as const) {
		const url = `https://${host}.finance.yahoo.com/v1/finance/trending/IN?count=10&_t=${t}`;
		try {
			const response = await fetchWithProxy(url);
			const text = await response.text();
			const data: TrendingResponse = JSON.parse(text);
			const quotes = data?.finance?.result?.[0]?.quotes ?? [];
			if (quotes.length > 0) {
				return quotes.slice(0, 5).map((q) => ({
					symbol: q.symbol,
					name: symbolToName(q.symbol),
					shareUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(q.symbol)}`
				}));
			}
		} catch (err) {
			logger.warn('Trends', `${host} failed: ${(err as Error).message}`);
		}
	}

	throw new Error('Failed to fetch trending tickers');
}
