import { fetchWithProxy, logger } from '$lib/config/api';

export interface TrendItem {
	title: string;
	traffic: string;
	shareUrl: string;
}

// Finance-relevant terms to filter daily trending topics
const FINANCE_TERMS = new Set([
	'nifty', 'sensex', 'bse', 'nse', 'stock', 'share', 'market', 'ipo', 'sebi',
	'rbi', 'rupee', 'inr', 'usd', 'bank', 'finance', 'mutual fund', 'sip', 'etf',
	'gold', 'silver', 'crude', 'oil', 'gdp', 'inflation', 'repo', 'rate', 'budget',
	'reliance', 'tcs', 'infosys', 'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'bajaj',
	'adani', 'tata', 'wipro', 'hcl', 'maruti', 'ongc', 'ntpc', 'itc', 'titan',
	'zomato', 'swiggy', 'paytm', 'nykaa', 'ola', 'razorpay', 'zerodha',
	'dividend', 'results', 'quarterly', 'profit', 'revenue', 'earnings',
	'bull', 'bear', 'rally', 'crash', 'correction', 'breakout',
	'fii', 'dii', 'foreign', 'investment', 'debt', 'equity', 'commodity',
	'pharma', 'auto', 'realty', 'metal', 'fmcg', 'it sector', 'midcap',
	'demat', 'trading', 'investor', 'listing', 'allotment', 'gmp'
]);

function isFinanceTrend(title: string): boolean {
	const lower = title.toLowerCase();
	for (const term of FINANCE_TERMS) {
		if (lower.includes(term)) return true;
	}
	return false;
}

export async function fetchBusinessTrends(): Promise<TrendItem[]> {
	// Google Trends daily RSS for India — reliable through CORS proxies
	const url = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN';

	const response = await fetchWithProxy(url);
	const text = await response.text();

	if (typeof DOMParser === 'undefined') return [];

	let doc: Document;
	try {
		const parser = new DOMParser();
		doc = parser.parseFromString(text, 'text/xml');
	} catch {
		logger.warn('Trends', 'Failed to parse RSS');
		return [];
	}

	if (doc.querySelector('parsererror')) {
		logger.warn('Trends', 'RSS parse error');
		return [];
	}

	const items = Array.from(doc.querySelectorAll('item'));

	const parsed = items.map((item) => ({
		title: item.querySelector('title')?.textContent?.trim() ?? '',
		traffic:
			item.getElementsByTagNameNS('*', 'approx_traffic')[0]?.textContent?.trim() ?? '',
		shareUrl:
			item.querySelector('link')?.nextSibling?.textContent?.trim() ||
			item.querySelector('link')?.textContent?.trim() ||
			`https://trends.google.com/trends/explore?geo=IN&q=${encodeURIComponent(item.querySelector('title')?.textContent?.trim() ?? '')}`
	}));

	// Prefer finance-relevant items; fall back to top items if none match
	const financeItems = parsed.filter((i) => i.title && isFinanceTrend(i.title));
	const source = financeItems.length > 0 ? financeItems : parsed;

	return source.filter((i) => i.title).slice(0, 5);
}
