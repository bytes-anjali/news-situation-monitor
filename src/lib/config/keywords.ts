interface KeywordScore {
	term: string;
	volume: number;
}

// Estimated monthly search volumes for Indian finance keywords
// Sorted by volume descending; longest/highest match wins
const KEYWORD_SCORES: KeywordScore[] = [
	// 100K+
	{ term: 'nifty 50', volume: 246000 },
	{ term: 'sensex', volume: 201000 },
	{ term: 'share market', volume: 165000 },
	{ term: 'stock market', volume: 135000 },
	{ term: 'mutual fund', volume: 110000 },
	{ term: 'nifty', volume: 110000 },
	{ term: 'ipo', volume: 90000 },
	// 50K–100K
	{ term: 'sbi', volume: 90000 },
	{ term: 'reliance', volume: 74000 },
	{ term: 'hdfc bank', volume: 60000 },
	{ term: 'tcs', volume: 60000 },
	{ term: 'icici bank', volume: 55000 },
	{ term: 'infosys', volume: 55000 },
	{ term: 'nifty bank', volume: 49000 },
	{ term: 'adani', volume: 49000 },
	{ term: 'bajaj finance', volume: 40000 },
	{ term: 'wipro', volume: 40000 },
	// 20K–50K
	{ term: 'rbi', volume: 33000 },
	{ term: 'repo rate', volume: 33000 },
	{ term: 'kotak bank', volume: 27000 },
	{ term: 'axis bank', volume: 27000 },
	{ term: 'tata motors', volume: 27000 },
	{ term: 'maruti', volume: 22000 },
	{ term: 'ongc', volume: 22000 },
	{ term: 'budget', volume: 22000 },
	{ term: 'inflation', volume: 18000 },
	{ term: 'crude oil', volume: 18000 },
	{ term: 'rupee', volume: 18000 },
	{ term: 'hcl tech', volume: 14000 },
	{ term: 'sun pharma', volume: 14000 },
	{ term: 'ltimindtree', volume: 14000 },
	{ term: 'itc', volume: 14000 },
	{ term: 'airtel', volume: 14000 },
	// 10K–20K (Spot threshold)
	{ term: 'quarterly results', volume: 12000 },
	{ term: 'q4 results', volume: 12000 },
	{ term: 'q3 results', volume: 12000 },
	{ term: 'q2 results', volume: 12000 },
	{ term: 'q1 results', volume: 12000 },
	{ term: 'dividend', volume: 12000 },
	{ term: 'buyback', volume: 11000 },
	{ term: 'stock split', volume: 11000 },
	{ term: 'rights issue', volume: 11000 },
	{ term: 'fii', volume: 11000 },
	{ term: 'dii', volume: 11000 },
	{ term: 'gdp', volume: 11000 },
	{ term: 'nse', volume: 11000 },
	{ term: 'bse', volume: 10000 },
	{ term: 'titan', volume: 10000 },
	{ term: 'ntpc', volume: 10000 },
	{ term: 'coal india', volume: 10000 },
	{ term: 'bajaj finserv', volume: 10000 },
	{ term: 'tata steel', volume: 10000 },
	{ term: 'sebi', volume: 10000 }
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
