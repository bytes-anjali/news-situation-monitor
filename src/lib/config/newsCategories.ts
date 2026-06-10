export type NewsCategory = 'stocks' | 'mutual-funds' | 'personal-finance' | 'economics' | 'other' | 'regulatory' | 'corp-action' | 'market-data';

export const MAX_CARDS = 30;
export const MIN_SCORE = 4;

// ── Relevance scoring ─────────────────────────────────────────────────────────
// Uses simple includes() so "Nifty50", "Nifty 50", "nifty" all match.
// Articles scored; top MAX_CARDS with score >= MIN_SCORE are shown.

const SCORE_RULES: Array<{ terms: string[]; pts: number }> = [
	// Critical — 15 pts
	{ terms: ['nifty', 'sensex', 'bank nifty'], pts: 15 },
	{ terms: ['ipo', 'gmp', 'grey market', 'oversubscribed', 'listing gain', 'listing price'], pts: 15 },
	{ terms: ['rbi', 'repo rate', 'monetary policy', 'mpc'], pts: 15 },
	{ terms: ['union budget', 'interim budget', 'finance minister'], pts: 15 },

	// High value — 12 pts
	{ terms: ['sebi'], pts: 12 },
	{ terms: [
		'reliance', 'tcs', 'hdfc bank', 'icici bank', 'infosys', 'adani',
		'bajaj finance', 'maruti', 'wipro', 'hcl tech', 'ongc', 'ntpc',
		'state bank', 'sbi '
	], pts: 12 },

	// Important — 10 pts
	{ terms: ['quarterly results', 'q1 results', 'q2 results', 'q3 results', 'q4 results',
	           'net profit', 'revenue miss', 'revenue beat', 'earnings', 'pat '], pts: 10 },
	{ terms: ['dividend', 'bonus share', 'stock split', 'buyback', 'rights issue'], pts: 10 },
	{ terms: ['fii', 'dii', 'foreign institutional', 'institutional buying', 'institutional selling'], pts: 10 },
	{ terms: ['merger', 'acquisition', 'takeover', 'demerger', 'stake sale'], pts: 10 },

	// Notable — 8 pts
	{ terms: ['all-time high', 'all time high', '52-week high', '52 week high', 'record high', 'lifetime high'], pts: 8 },
	{ terms: ['crash', 'market crash', 'sharp fall', 'sharp decline', 'sell-off', 'selloff', 'meltdown'], pts: 8 },
	{ terms: ['rally', 'market rally', 'bull run', 'surge', 'strong gains'], pts: 7 },
	{ terms: ['f&o expiry', 'futures expiry', 'options expiry', 'fo expiry'], pts: 7 },
	{ terms: ['upper circuit', 'lower circuit'], pts: 7 },

	// Mutual funds — 7 pts
	{ terms: ['mutual fund', 'sip', 'elss', 'amfi', 'amc', 'fund house', 'nav '], pts: 7 },

	// Personal finance — 5–7 pts
	{ terms: ['income tax', 'itr', 'tax saving', '80c', 'capital gains tax', 'capital gain'], pts: 7 },
	{ terms: ['inflation', 'cpi data', 'wpi data', 'gdp growth', 'economic growth'], pts: 6 },
	{ terms: ['gold price', 'silver price', 'crude oil', 'commodity'], pts: 6 },
	{ terms: ['home loan', 'emi', 'interest rate', 'fixed deposit', 'fd rate'], pts: 6 },
	{ terms: ['insurance', 'epf', 'ppf', 'nps', 'pension fund'], pts: 5 },

	// Market context — 4 pts
	{ terms: ['midcap', 'mid cap', 'smallcap', 'small cap'], pts: 4 },
	{ terms: ['rupee', 'dollar', 'usd inr', 'forex'], pts: 4 },
	{ terms: ['stock market', 'share market', 'equity market', 'stock exchange'], pts: 4 },
];

export function scoreRelevance(headline: string): number {
	const h = headline.toLowerCase();
	let score = 0;
	for (const rule of SCORE_RULES) {
		if (rule.terms.some((t) => h.includes(t))) score += rule.pts;
	}
	return score;
}

// ── Category classification ───────────────────────────────────────────────────

const MF_TERMS = [
	'mutual fund', 'sip', ' nav ', 'elss', 'amc', 'amfi', 'fund house',
	'liquid fund', 'debt fund', 'hybrid fund', 'flexi cap', 'multi cap',
	'exit load', 'expense ratio', 'direct plan', 'regular plan', 'folio',
	'nfo', 'index fund', 'small cap fund', 'large cap fund', 'mid cap fund',
	'multi asset', 'balanced advantage', 'fund manager', 'gilt fund',
	'arbitrage fund', 'target maturity', 'systematic investment', 'lumpsum', 'lump sum'
];

const PF_TERMS = [
	'ppf', 'epf', 'nps', 'provident fund', 'fixed deposit', ' fd ',
	'income tax', 'itr', 'tax saving', '80c', '80d', 'capital gain',
	'gst', 'home loan', 'credit card', ' emi ', 'personal loan',
	'retirement', 'pension', 'life insurance', 'health insurance', 'term plan',
	'savings account', 'inflation', 'repo rate', 'gold price', 'silver price',
	'rupee', 'forex', 'rbi policy',
	// Monetary policy — headlines like "RBI cuts rates" or "MPC holds rate"
	' rbi ', 'rate cut', 'rate hike', 'interest rate', 'monetary policy', ' mpc ',
	// Budget & tax
	'union budget', 'budget 2025', 'budget 2026', 'finance minister', 'direct tax',
	'tax planning', 'advance tax', 'form 16', 'tax return',
	// Wealth & credit
	'credit score', 'cibil', 'wealth management', 'financial planning',
	'demat account', 'savings rate'
];

const STOCKS_TERMS = [
	// Indices & exchanges
	'nifty', 'sensex', 'bse', 'nse', 'sebi', 'fii', 'dii', 'ipo', 'gmp',
	// Corporate actions
	'listing', 'allotment', 'earnings', 'quarterly', 'dividend', 'buyback',
	'bonus share', 'stock split', 'rights issue', 'demerger',
	// Results & financials
	'net profit', 'net loss', 'revenue', 'ebitda', 'pat ', 'q1 ', 'q2 ', 'q3 ', 'q4 ',
	'results', 'quarterly results',
	// Market moves
	'rally', 'crash', 'surge', 'plunge', 'bull run', 'bear', 'sell-off', 'selloff',
	'upper circuit', 'lower circuit', 'all-time high', 'all time high',
	'52-week high', '52 week high', '52-week low', '52 week low', 'record high',
	'circuit breaker', 'meltdown',
	// Derivatives & trading
	'circuit', 'futures', 'options', 'f&o', 'intraday', 'expiry',
	// Segments
	'midcap', 'smallcap', 'largecap', 'demat', 'shares',
	// Market types
	'stock market', 'share market', 'equity market', 'equity', 'capital market',
	// Corporate events
	'merger', 'acquisition', 'takeover', 'stake sale', 'open offer',
	'institutional buying', 'institutional selling',
	// Large caps
	'reliance', 'tcs', 'hdfc', 'icici', 'sbi', 'infosys', 'adani',
	'bajaj', 'wipro', 'hcl', 'maruti', 'ongc', 'ntpc', 'itc',
	'zomato', 'swiggy', 'paytm', 'nykaa', 'zerodha', 'groww',
	'tata motors', 'tata steel', 'sun pharma', 'kotak', 'axis bank',
	'power grid', 'bhel', 'bpcl', 'upl', 'dmart', 'titan', 'asian paints',
	// Generic stock coverage
	'listed', 'investor', 'trade setup', 'technical analysis', 'target price',
	'buy call', 'sell call', 'stop loss', 'support level', 'resistance level'
];

export function classifyCategory(headline: string): NewsCategory {
	const h = ` ${headline.toLowerCase()} `;
	if (MF_TERMS.some((t) => h.includes(t))) return 'mutual-funds';
	if (PF_TERMS.some((t) => h.includes(t))) return 'personal-finance';
	if (STOCKS_TERMS.some((t) => h.includes(t))) return 'stocks';
	// Anything that passed the relevance filter is finance news — default to stocks
	return 'stocks';
}

// ── Content angle generator ───────────────────────────────────────────────────

export function generateAngle(headline: string, category: NewsCategory): string {
	const h = headline.toLowerCase();

	const isIPO = h.includes('ipo') || h.includes('gmp') || h.includes('allotment');
	const isResults = h.includes('results') || h.includes('earnings') || h.includes('net profit') || h.includes('quarterly');
	const isDividend = h.includes('dividend');
	const isSEBI = h.includes('sebi');
	const isFII = h.includes('fii') || h.includes('dii') || h.includes('institutional');
	const isUp = /rise|gain|surge|rally|jump|soar|high|record|breakout/.test(h);
	const isDown = /fall|drop|crash|plunge|decline|slip|sell.?off|correction|meltdown/.test(h);
	const isRBI = h.includes('rbi') || h.includes('repo rate') || h.includes('monetary policy');
	const isTax = h.includes('tax') || h.includes('itr') || h.includes('80c') || h.includes('capital gain');
	const isInflation = h.includes('inflation') || h.includes('cpi') || h.includes('repo rate');
	const isInsurance = h.includes('insurance');
	const isGold = h.includes('gold') || h.includes('silver');
	const isSIP = h.includes('sip');

	if (category === 'stocks') {
		if (isIPO) return '📹 "Should you apply?" — Cover GMP, subscription status & company fundamentals in 5 mins.';
		if (isResults) return '📹 "Earnings decoded" — Break down the numbers: should viewers hold, add, or exit?';
		if (isDividend) return '📹 "Free money or trap?" — Explain dividend vs growth stocks for beginners.';
		if (isSEBI) return '📹 "SEBI just changed the rules" — Explain the move & what retail investors must do now.';
		if (isFII) return '📹 "Smart money is moving" — Decode why institutions bought/sold and what retail should follow.';
		if (isUp) return '📹 "Why is it pumping?" — Cover the catalyst & whether retail should buy now or wait for a dip.';
		if (isDown) return '📹 "Panic or opportunity?" — Help viewers decide: hold, buy the dip, or cut losses.';
		return '📹 "Market update explained" — Break this down simply so viewers know what to do with their portfolio.';
	}
	if (category === 'mutual-funds') {
		if (isSIP) return '📹 "SIP strategy check" — Should viewers pause, increase, or switch? Give a clear action plan.';
		return '📹 "Does this affect your fund?" — Help viewers understand if they need to rebalance or switch.';
	}
	if (category === 'personal-finance') {
		if (isRBI) return '📹 "RBI just moved" — What this means for EMI borrowers and FD investors — keep it practical.';
		if (isTax) return '📹 "Tax made simple" — Give viewers a 3-step action plan before the deadline.';
		if (isInflation) return '📹 "Beat inflation" — Connect this number to real-life savings & investment strategies.';
		if (isInsurance) return '📹 "Insurance decoded" — Help viewers know if they\'re under-covered and what to buy.';
		if (isGold) return '📹 "Gold vs Mutual Fund" — Use this news to settle the debate your viewers keep asking about.';
		return '📹 "Your money, explained" — Turn this into a practical personal finance tip viewers can act on today.';
	}
	if (category === 'economics') {
		if (isInflation) return '📹 "What inflation means for your wallet" — Connect the global numbers to Indian savings, EMIs, and returns.';
		if (isRBI) return '📹 "Central bank watch" — Break down the policy move and what it signals for India\'s economy and your investments.';
		return '📹 "Global economy, Indian impact" — Decode this development and explain who wins or loses in India.';
	}
	return '📹 "Business angle" — Find the investor story: who wins, who loses, what your viewers should watch.';
}
