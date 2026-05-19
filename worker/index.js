/**
 * Cloudflare Worker — AngelOne Bytes proxy
 * Routes:
 *   GET /trends   — Google Trends B&F India (no auth)
 *   GET /summarize?url=<encoded> — AI summary via OpenAI (requires OPENAI_API_KEY secret)
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
	'Referer': 'https://www.google.com/'
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
		if (title && title !== 'Google Trends') items.push({ title, link });
	}
	return items;
}

async function tryRealtimeApi() {
	const url = 'https://trends.google.com/trends/api/realtimetrends?hl=en-IN&tz=-330&cat=b&fi=0&fs=0&geo=IN&ri=300&rs=20&sort=0';
	const res = await fetch(url, { headers: BROWSER_HEADERS });
	if (!res.ok) throw new Error(`Realtime API returned ${res.status}`);
	const raw = await res.text();
	const data = JSON.parse(raw.replace(/^\)\]\}'\n?/, ''));
	const stories = data?.storySummaries?.trendingStories ?? [];
	if (stories.length === 0) throw new Error('No stories');
	return stories.slice(0, 5).map(s => ({
		title: s.title ?? s.entityNames?.[0] ?? '',
		shareUrl: s.shareUrl ?? `https://trends.google.com/trends/explore?cat=b&geo=IN&q=${encodeURIComponent(s.title ?? '')}`
	}));
}

async function tryDailyRss() {
	const url = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN';
	const res = await fetch(url, { headers: BROWSER_HEADERS });
	if (!res.ok) throw new Error(`Daily RSS returned ${res.status}`);
	const all = parseRssItems(await res.text());
	const finance = all.filter(i => isFinance(i.title));
	const source = finance.length > 0 ? finance : all;
	return source.slice(0, 5).map(i => ({
		title: i.title,
		shareUrl: i.link || `https://trends.google.com/trends/explore?geo=IN&q=${encodeURIComponent(i.title)}`
	}));
}

// ── /summarize ────────────────────────────────────────────────────────────────

function stripHtml(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function handleSummarize(request, env) {
	const apiKey = env?.OPENAI_API_KEY;
	if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

	const url = new URL(request.url).searchParams.get('url');
	if (!url) return json({ error: 'url param required' }, 400);

	// Check Cloudflare cache first
	const cache = caches.default;
	const cacheKey = new Request(`https://summary-cache/${encodeURIComponent(url)}`);
	const cached = await cache.match(cacheKey);
	if (cached) return new Response(cached.body, { headers: { ...CORS, 'Content-Type': 'application/json' } });

	// Fetch article
	let articleText = '';
	try {
		const articleRes = await fetch(url, {
			headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.google.com/' },
			cf: { timeout: 8000 }
		});
		if (articleRes.ok) {
			articleText = stripHtml(await articleRes.text()).slice(0, 4000);
		}
	} catch {
		// proceed with empty text — OpenAI will use URL context
	}

	// Call OpenAI
	const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			max_tokens: 300,
			temperature: 0.2,
			messages: [
				{
					role: 'system',
					content: 'You are a financial news summarizer for AngelOne, an Indian stock market YouTube channel network covering investing, mutual funds, personal finance, and trading. Be factual, include key numbers, and explain why Indian retail investors should care. Respond only with valid JSON.'
				},
				{
					role: 'user',
					content: `Summarize this article as JSON:
{"title": "Clean factual headline (8-12 words, not clickbait)", "summary": "2-3 sentences: what happened + key numbers/figures + impact for Indian retail investors"}

Article URL: ${url}
Article text: ${articleText || '(Could not fetch — use URL context only)'}`
				}
			]
		})
	});

	if (!openaiRes.ok) {
		const err = await openaiRes.text();
		return json({ error: `OpenAI error: ${openaiRes.status}`, detail: err }, 502);
	}

	const openaiData = await openaiRes.json();
	const content = openaiData.choices?.[0]?.message?.content ?? '';

	let result;
	try {
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		result = JSON.parse(jsonMatch?.[0] ?? content);
	} catch {
		return json({ error: 'Failed to parse OpenAI response', raw: content }, 502);
	}

	// Cache for 6 hours
	const responseBody = JSON.stringify(result);
	const toCache = new Response(responseBody, {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=21600' }
	});
	await cache.put(cacheKey, toCache);

	return json(result);
}

// ── Router ────────────────────────────────────────────────────────────────────

export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

		const { pathname } = new URL(request.url);

		if (pathname === '/trends') {
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

		if (pathname === '/summarize') {
			return handleSummarize(request, env);
		}

		return new Response('Not found', { status: 404, headers: CORS });
	}
};

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS, 'Content-Type': 'application/json' }
	});
}
