export type NewsCategory = 'stocks' | 'mutual-funds' | 'personal-finance' | 'other';

// ── Category keyword sets ─────────────────────────────────────────────────────

const STOCKS_KW = [
	'nifty', 'sensex', 'bse', 'nse', 'sebi', 'fii', 'dii',
	'ipo', 'listing', 'allotment', 'gmp', 'grey market', 'oversubscribed',
	'earnings', 'quarterly results', 'q1', 'q2', 'q3', 'q4', 'ebitda',
	'dividend', 'buyback', 'bonus share', 'stock split', 'rights issue',
	'bull run', 'bear market', 'rally', 'crash', 'correction', 'circuit breaker',
	'upper circuit', 'lower circuit', 'futures', 'options', 'f&o', 'derivative',
	'intraday', 'delivery', 'midcap', 'smallcap', 'largecap', 'blue chip',
	'demat', 'zerodha', 'groww', 'upstox', 'angelone', 'angle one',
	'stock market', 'share market', 'equity market', 'capital market',
	'market cap', 'pe ratio', 'book value', 'eps', 'roce',
	'reliance', 'tcs', 'infosys', 'hdfc', 'icici', 'sbi', 'axis', 'kotak',
	'bajaj', 'adani', 'tata', 'wipro', 'hcl', 'maruti', 'ongc', 'ntpc', 'itc',
	'zomato', 'swiggy', 'paytm', 'nykaa', 'ola', 'vedanta', 'hindalco',
	'jswsteel', 'tatasteel', 'bhel', 'sail', 'britannia', 'nestle', 'dabur',
	'hul', 'hindustan unilever', 'sun pharma', 'cipla', 'dmart', 'titan',
];

const MF_KW = [
	'mutual fund', 'sip', ' nav ', 'folio', 'amc', 'amfi',
	'elss', 'liquid fund', 'debt fund', 'hybrid fund', 'balanced fund',
	'thematic fund', 'sectoral fund', 'flexi cap', 'multi cap',
	'redemption', 'lumpsum', 'systematic investment plan', 'systematic withdrawal',
	'large cap fund', 'mid cap fund', 'small cap fund',
	'exit load', 'expense ratio', 'direct plan', 'regular plan',
];

const PF_KW = [
	'ppf', 'epf', 'nps', 'provident fund',
	'fixed deposit', ' fd ', 'recurring deposit',
	'income tax', 'itr', 'tax saving', 'tax deduction', '80c', '80d',
	'gst', 'home loan', 'credit card', ' emi ', 'personal loan',
	'retirement', 'pension', 'annuity',
	'life insurance', 'health insurance', 'term plan',
	'savings account', 'kyc', 'pan card',
	'inflation', 'repo rate', 'rbi rate', 'monetary policy',
	'rupee', 'dollar', 'forex', 'currency',
	'gold price', 'silver price',
];

// ── Finance gate — article must match at least 1 to pass ─────────────────────

export const FINANCE_GATE_KW = [
	...STOCKS_KW, ...MF_KW, ...PF_KW,
	'market', 'stock', 'share', 'invest', 'finance', 'financial',
	'fund', 'economy', 'economic', 'budget', 'monetary',
	'interest rate', 'wealth', 'asset', 'portfolio', 'commodity',
	'crypto', 'bitcoin', 'rbi', 'sebi',
];

// ── Classification ────────────────────────────────────────────────────────────

export function classifyCategory(headline: string): NewsCategory {
	const h = ` ${headline.toLowerCase()} `;

	// Mutual Funds first (more specific, overlap with stocks)
	if (MF_KW.some((k) => h.includes(k))) return 'mutual-funds';
	if (PF_KW.some((k) => h.includes(k))) return 'personal-finance';
	if (STOCKS_KW.some((k) => h.includes(k))) return 'stocks';

	// Generic finance terms that are clearly stock-market-adjacent
	if (/\b(stock|share|equity|index|market|nifty|sensex)\b/.test(h)) return 'stocks';

	return 'other';
}

// ── Finance gate ──────────────────────────────────────────────────────────────

export function isFinanceRelevant(headline: string): boolean {
	const h = ` ${headline.toLowerCase()} `;
	return FINANCE_GATE_KW.some((k) => h.includes(k));
}

// ── Content angle generator ───────────────────────────────────────────────────

export function generateAngle(headline: string, category: NewsCategory): string {
	const h = headline.toLowerCase();

	const isUp = /\b(rise|rises|rising|gain|gains|surge|surges|rally|rallies|jump|jumps|soar|soars|high|record|breakout)\b/.test(h);
	const isDown = /\b(fall|falls|drop|drops|crash|crashes|plunge|plunges|decline|declines|slip|slips|low|sell.?off|correction|meltdown)\b/.test(h);
	const isIPO = /\bipo\b/.test(h);
	const isResults = /\b(results|earnings|quarterly|q[1-4] |profit|revenue|ebitda)\b/.test(h);
	const isDividend = /\bdividend\b/.test(h);
	const isSEBI = /\bsebi\b/.test(h);
	const isFII = /\b(fii|dii|institutional|foreign investor)\b/.test(h);
	const isRBI = /\brbi\b/.test(h);
	const isTax = /\b(tax|itr|80c|gst|income tax)\b/.test(h);
	const isInflation = /\b(inflation|cpi|wpi|repo rate|interest rate)\b/.test(h);
	const isInsurance = /\binsurance\b/.test(h);
	const isGold = /\b(gold|silver)\b/.test(h);
	const isSIP = /\bsip\b/.test(h);

	if (category === 'stocks') {
		if (isIPO) return '📹 "Should you apply?" — Cover GMP, subscription status & company fundamentals in 5 mins.';
		if (isResults) return '📹 "Earnings decoded" — Break down what the numbers mean: should viewers hold, add, or exit?';
		if (isDividend) return '📹 "Free money or trap?" — Explain dividend vs growth stocks for beginners.';
		if (isSEBI) return '📹 "SEBI just changed the rules" — Explain the regulatory move & what retail investors must do.';
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
		return '📹 "Your money, explained" — Turn this into a practical personal finance tip your viewers can act on today.';
	}

	return '📹 "Business angle" — Find the investor story here: who wins, who loses, and what your viewers should watch.';
}
