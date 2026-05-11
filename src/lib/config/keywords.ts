interface KeywordScore {
	term: string;
	volume: number;
}

// Real monthly search volumes from Google India (KeywordTool.io, May 2026)
const KEYWORD_SCORES: KeywordScore[] = [
	// 10M+
	{ term: 'nifty 50', volume: 16600000 },
	{ term: 'sensex', volume: 9140000 },
	{ term: 'sbi', volume: 5000000 },
	{ term: 'hdfc bank', volume: 4090000 },
	{ term: 'nifty', volume: 3350000 },
	{ term: 'stock market', volume: 2240000 },
	{ term: 'icici bank', volume: 2240000 },
	{ term: 'axis bank', volume: 2240000 },
	{ term: 'nse', volume: 1500000 },
	{ term: 'airtel', volume: 1220000 },
	{ term: 'bajaj finance', volume: 823000 },
	{ term: 'bajaj finserv', volume: 823000 },
	{ term: 'mutual fund', volume: 673000 },
	{ term: 'infosys', volume: 673000 },
	{ term: 'tata motors', volume: 673000 },
	{ term: 'maruti', volume: 673000 },
	{ term: 'titan', volume: 673000 },
	{ term: 'bse', volume: 673000 },
	{ term: 'share market', volume: 550000 },
	{ term: 'nifty bank', volume: 550000 },
	{ term: 'tcs', volume: 450000 },
	{ term: 'ipo', volume: 450000 },
	{ term: 'rbi', volume: 450000 },
	{ term: 'ntpc', volume: 368000 },
	{ term: 'hcl tech', volume: 301000 },
	{ term: 'wipro', volume: 301000 },
	{ term: 'reliance', volume: 246000 },
	{ term: 'sebi', volume: 246000 },
	{ term: 'budget', volume: 201000 },
	{ term: 'itc', volume: 201000 },
	{ term: 'adani', volume: 165000 },
	{ term: 'ongc', volume: 165000 },
	{ term: 'rupee', volume: 165000 },
	{ term: 'dividend', volume: 165000 },
	{ term: 'ltimindtree', volume: 165000 },
	{ term: 'repo rate', volume: 135000 },
	{ term: 'crude oil', volume: 135000 },
	{ term: 'kotak bank', volume: 135000 },
	{ term: 'coal india', volume: 135000 },
	{ term: 'inflation', volume: 90500 },
	{ term: 'sun pharma', volume: 110000 },
	{ term: 'gdp', volume: 110000 },
	{ term: 'tata steel', volume: 110000 },
	{ term: 'stock split', volume: 110000 },
	{ term: 'fii', volume: 18100 },
	{ term: 'quarterly results', volume: 14800 },
	{ term: 'buyback', volume: 12100 },
	{ term: 'dii', volume: 12100 },
	// Consumer / fintech brands
	{ term: 'swiggy', volume: 2240000 },
	{ term: 'zomato', volume: 1830000 },
	{ term: 'nykaa', volume: 1830000 },
	{ term: 'ola', volume: 823000 },
	{ term: 'oyo', volume: 823000 },
	{ term: 'mahindra', volume: 673000 },
	{ term: 'paytm', volume: 1000000 },
	{ term: 'razorpay', volume: 368000 },
	{ term: 'nps', volume: 368000 },
	{ term: 'sip', volume: 301000 },
	// Investment / trading terms
	{ term: 'intraday trading', volume: 165000 },
	{ term: 'vedanta', volume: 165000 },
	{ term: 'grey market premium', volume: 201000 },
	{ term: 'etf', volume: 90500 },
	{ term: 'jsw', volume: 90500 },
	{ term: 'adani group', volume: 40500 },
	{ term: 'nifty midcap', volume: 40500 },
	{ term: 'nifty next 50', volume: 135000 },
	{ term: 'ppf', volume: 135000 },
	{ term: 'index fund', volume: 33100 },
	{ term: 'reits', volume: 33100 },
	{ term: 'ipo listing', volume: 14800 },
	{ term: 'railway stocks', volume: 14800 },
	{ term: 'demat account', volume: 74000 },
	{ term: 'technical analysis', volume: 74000 },
	{ term: 'fundamental analysis', volume: 22200 },
	{ term: 'midcap', volume: 22200 },
	{ term: 'allotment', volume: 27100 },
	{ term: 'earnings', volume: 18100 },
	{ term: 'tata group', volume: 60500 },
	{ term: 'defence stocks', volume: 60500 },
	{ term: 'bonus issue', volume: 110000 },
	{ term: 'gold etf', volume: 110000 },
	{ term: 'penny stocks', volume: 110000 },
	{ term: 'profit', volume: 74000 },
	// Below 10K threshold (Skip)
	{ term: 'rights issue', volume: 9900 },
	{ term: 'q4 results', volume: 8100 },
	{ term: 'q1 results', volume: 5400 },
	{ term: 'q2 results', volume: 5400 },
	{ term: 'q3 results', volume: 5400 }
];

const STOP_WORDS = new Set([
	'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
	'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'has',
	'have', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'its',
	'this', 'that', 'these', 'those', 'it', 'he', 'she', 'they', 'we', 'you',
	'says', 'said', 'after', 'over', 'amid', 'up', 'down', 'new', 'gets',
	'into', 'ahead', 'amid', 'despite', 'than', 'more', 'less', 'per', 'cent'
]);

export interface KeywordResult {
	term: string;
	volume: number;
	isSpot: boolean;
}

export function scoreHeadline(headline: string): KeywordResult {
	const lower = headline.toLowerCase();

	let best: KeywordScore | null = null;
	for (const kw of KEYWORD_SCORES) {
		if (lower.includes(kw.term)) {
			if (!best || kw.volume > best.volume) {
				best = kw;
			}
		}
	}

	if (best) {
		return { term: best.term, volume: best.volume, isSpot: best.volume >= 10000 };
	}

	return { term: extractKeyPhrase(headline), volume: 2400, isSpot: false };
}

function extractKeyPhrase(headline: string): string {
	const words = headline
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.split(/\s+/)
		.filter((w) => w.length > 3 && !STOP_WORDS.has(w));
	return words.slice(0, 2).join(' ') || headline.slice(0, 20).toLowerCase();
}

export function formatVolume(volume: number): string {
	if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M/mo`;
	if (volume >= 1000) return `${Math.round(volume / 1000)}K/mo`;
	return `${volume}/mo`;
}
