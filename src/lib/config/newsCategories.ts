export type NewsCategory = 'stocks' | 'mutual-funds' | 'personal-finance' | 'other';

// ── Relevance scoring ─────────────────────────────────────────────────────────
// Each rule adds to the article's score. Higher score = more relevant for
// AngelOne's audience (investing, IPO, RBI, mutual funds, personal finance).
// Articles are ranked by score; only the top MAX_CARDS pass through.

export const MAX_CARDS = 28;
export const MIN_SCORE = 4;

const RULES: Array<{ re: RegExp; pts: number }> = [
	// Critical — always show (15 pts)
	{ re: /\bnifty\b|\bsensex\b|\bbank nifty\b|\bnifty 50\b/, pts: 15 },
	{ re: /\bipo\b|\bgmp\b|grey market premium|oversubscribed|listing gain/, pts: 15 },
	{ re: /\brbi\b|repo rate|monetary policy|mpc meeting/, pts: 15 },
	{ re: /union budget|interim budget|finance minister nirmala/, pts: 15 },

	// High value (10–12 pts)
	{ re: /\bsebi\b/, pts: 12 },
	{ re: /\b(reliance|tcs|hdfc bank|icici bank|sbi|infosys|adani|bajaj finance|maruti|wipro|hcl tech|ongc|ntpc|itc)\b/i, pts: 12 },
	{ re: /quarterly results?|q[1-4] results?|\bearnings\b|net profit|revenue miss|revenue beat/, pts: 10 },
	{ re: /\bdividend\b|bonus share|stock split|buyback|rights issue/, pts: 10 },
	{ re: /\bfii\b|\bdii\b|foreign institutional|institutional (buyin|selling|flows)/, pts: 10 },
	{ re: /merger|acquisition|takeover|demerger|stake sale/, pts: 10 },

	// Important (7–9 pts)
	{ re: /all.time high|52.week high|record high|lifetime high/, pts: 9 },
	{ re: /\bcrash\b|\bplunge\b|market crash|sharp (fall|decline)|sell.?off/, pts: 8 },
	{ re: /\brally\b|market rally|strong gains|bull run/, pts: 7 },
	{ re: /f&o expiry|futures expiry|options expiry|rollover/, pts: 7 },
	{ re: /upper circuit|lower circuit|\bcircuit\b/, pts: 7 },

	// Mutual funds (7 pts)
	{ re: /mutual fund|\bsip\b|\belss\b|\bamfi\b|\bamc\b|fund house/, pts: 7 },

	// Personal finance (5–7 pts)
	{ re: /income tax|\bitr\b|tax saving|80c |capital gains? tax|tax deduction/, pts: 7 },
	{ re: /\binflation\b|\bcpi\b|\bwpi\b|\bgdp\b|economic growth/, pts: 6 },
	{ re: /gold price|silver price|crude oil price/, pts: 6 },
	{ re: /home loan|\bemi\b|interest rate|fixed deposit|\bfd\b/, pts: 6 },
	{ re: /\binsurance\b|\bepf\b|\bppf\b|\bnps\b|\bpension\b/, pts: 5 },

	// Market context (4 pts)
	{ re: /\bmidcap\b|\bsmallcap\b|small.?cap|mid.?cap/, pts: 4 },
	{ re: /\brupee\b|\binr\b|dollar.rupee|usd.inr/, pts: 4 },
];

export function scoreRelevance(headline: string): number {
	const h = ` ${headline.toLowerCase()} `;
	return RULES.reduce((total, rule) => (rule.re.test(h) ? total + rule.pts : total), 0);
}

// ── Category classification ───────────────────────────────────────────────────

const MF_RE = /mutual fund|\bsip\b|\bnav\b|\belss\b|\bamc\b|\bamfi\b|liquid fund|debt fund|hybrid fund|flexi cap|exit load|expense ratio/;
const PF_RE = /\bppf\b|\bepf\b|\bnps\b|provident fund|fixed deposit|\bfd\b|income tax|\bitr\b|tax saving|80c|80d|gst|home loan|credit card|\bemi\b|retirement|pension|life insurance|health insurance|term plan|savings account|inflation|repo rate|gold price|silver price|forex|\brupee\b/;
const STOCKS_RE = /\bnifty\b|\bsensex\b|\bbse\b|\bnse\b|\bsebi\b|\bfii\b|\bdii\b|\bipo\b|gmp|listing|allotment|earnings|quarterly results?|dividend|buyback|bonus share|stock split|bull|bear|rally|crash|circuit|futures|options|f&o|intraday|midcap|smallcap|demat|zerodha|groww|upstox|angelone|stock market|share market|equity market|market cap|reliance|tcs|hdfc|icici|sbi|infosys|adani|bajaj|wipro|hcl|maruti|ongc|ntpc|itc|zomato|swiggy|paytm|nykaa/;

export function classifyCategory(headline: string): NewsCategory {
	const h = ` ${headline.toLowerCase()} `;
	if (MF_RE.test(h)) return 'mutual-funds';
	if (PF_RE.test(h)) return 'personal-finance';
	if (STOCKS_RE.test(h)) return 'stocks';
	return 'other';
}

// ── Content angle generator ───────────────────────────────────────────────────

export function generateAngle(headline: string, category: NewsCategory): string {
	const h = headline.toLowerCase();

	const isUp = /\b(rise|rises|rising|gain|gains|surge|surges|rally|rallies|jump|jumps|soar|soars|high|record|breakout)\b/.test(h);
	const isDown = /\b(fall|falls|drop|drops|crash|crashes|plunge|plunges|decline|declines|slip|slips|low|sell.?off|correction|meltdown)\b/.test(h);
	const isIPO = /\bipo\b/.test(h);
	const isResults = /\b(results|earnings|quarterly|q[1-4] |net profit|revenue)\b/.test(h);
	const isDividend = /\bdividend\b/.test(h);
	const isSEBI = /\bsebi\b/.test(h);
	const isFII = /\b(fii|dii|institutional|foreign investor)\b/.test(h);
	const isRBI = /\brbi\b/.test(h);
	const isTax = /\b(tax|itr|80c|gst|income tax|capital gain)\b/.test(h);
	const isInflation = /\b(inflation|cpi|wpi|repo rate|interest rate)\b/.test(h);
	const isInsurance = /\binsurance\b/.test(h);
	const isGold = /\b(gold|silver)\b/.test(h);
	const isSIP = /\bsip\b/.test(h);

	if (category === 'stocks') {
		if (isIPO) return '📹 "Should you apply?" — Cover GMP, subscription status & company fundamentals in 5 mins.';
		if (isResults) return '📹 "Earnings decoded" — Break down what the numbers mean: should viewers hold, add, or exit?';
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
	return '📹 "Business angle" — Find the investor story: who wins, who loses, what your viewers should watch.';
}
