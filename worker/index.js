/**
 * Cloudflare Worker — Google Trends B&F proxy for AngelOne Bytes
 * Tries realtime B&F API first, falls back to daily trending RSS filtered by finance keywords
 */

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

const BROWSER_HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
	'Referer': 'https://trends.google.com/'
};

const FINANCE_KEYWORDS = [
	'nifty', 'sensex', 'bse', 'nse', 'stock', 'share', 'market', 'ipo', 'sebi',
	'rbi', 'rupee', 'inr', 'bank', 'finance', 'mutual fund', 'sip', 'etf',
	'gold', 'silver', 'crude', 'oil', 'gdp', 'inflation', 'repo', 'budget',
	'reliance', 'tcs', 'infosys', 'hdfc', 'icici', 'sbi', 'axis', 'kotak',
	'bajaj', 'adani', 'tata', 'wipro', 'hcl', 'maruti', 'ongc', 'ntpc', 'itc',
	'zomato', 'swiggy', 'paytm', 'nykaa', 'ola', 'zerodha',
	'dividend', 'results', 'quarterly', 'profit', 'revenue', 'earnings',
	'bull', 'bear', 'rally', 'crash', 'correction', 'listing', 'allotment',
	'fii', 'dii', 'pharma', 'realty', 'metal', 'fmcg', 'midcap', 'smallcap',
	'demat', 'trading', 'investor', 'gmp', 'grey market'
];

function isFinance(title) {
	const lower = title.toLowerCase();
	return FINANCE_KEYWORDS.some(k => lower.includes(k));
}

// Parse items from RSS XML using regex (no DOMParser in Workers)
function parseRssItems(xml) {
	const items = [];
	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	let match;
	while ((match = itemRegex.exec(xml)) !== null) {
		const block = match[1];
		const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
		const linkMatch = block.match(/<link>(.*?)<\/link>/);
		const title = titleMatch?.[1]?.trim() ?? '';
		const link = linkMatch?.[1]?.trim() ?? '';
		if (title && title !== 'Google Trends' ) items.push({ title, link });
	}
	return items;
}

async function tryRealtimeApi() {
	const url = 'https://trends.google.com/trends/api/realtimetrends?hl=en-IN&tz=-330&cat=b&fi=0&fs=0&geo=IN&ri=300&rs=20&sort=0';
	const res = await fetch(url, { headers: BROWSER_HEADERS });
	if (!res.ok) throw new Error(`Realtime API returned ${res.status}`);

	const raw = await res.text();
	const json = raw.replace(/^\)\]\}'\n?/, '');
	const data = JSON.parse(json);
	const stories = data?.storySummaries?.trendingStories ?? [];
	if (stories.length === 0) throw new Error('No stories in realtime response');

	return stories.slice(0, 5).map(s => ({
		title: s.title ?? s.entityNames?.[0] ?? '',
		shareUrl: s.shareUrl ?? `https://trends.google.com/trends/explore?cat=b&geo=IN&q=${encodeURIComponent(s.title ?? '')}`
	}));
}

async function tryDailyRss() {
	const url = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN';
	const res = await fetch(url, { headers: BROWSER_HEADERS });
	if (!res.ok) throw new Error(`Daily RSS returned ${res.status}`);

	const xml = await res.text();
	const all = parseRssItems(xml);

	const finance = all.filter(i => isFinance(i.title));
	const source = finance.length > 0 ? finance : all;

	return source.slice(0, 5).map(i => ({
		title: i.title,
		shareUrl: i.link || `https://trends.google.com/trends/explore?geo=IN&q=${encodeURIComponent(i.title)}`
	}));
}

export default {
	async fetch(request) {
		if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

		const { pathname } = new URL(request.url);
		if (pathname !== '/trends') return new Response('Not found', { status: 404, headers: CORS });

		// Try realtime B&F API first, fall back to daily RSS with finance filter
		for (const attempt of [tryRealtimeApi, tryDailyRss]) {
			try {
				const results = await attempt();
				if (results.length > 0) return json(results);
			} catch (e) {
				console.error(attempt.name, e.message);
			}
		}

		return json({ error: 'All Google Trends sources failed' }, 502);
	}
};

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS, 'Content-Type': 'application/json' }
	});
}
