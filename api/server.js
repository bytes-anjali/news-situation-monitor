import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY ?? '').trim().replace(/^["']|["']$/g, '');

const FETCH_HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'en-IN,en;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Cache-Control': 'no-cache',
	'Upgrade-Insecure-Requests': '1'
};

function stripHtml(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function fetchArticleText(urls) {
	for (const url of urls) {
		if (!url) continue;
		try {
			const r = await fetch(url, {
				headers: FETCH_HEADERS,
				redirect: 'follow',
				signal: AbortSignal.timeout(10000)
			});
			if (r.ok) {
				const text = stripHtml(await r.text());
				if (text.length > 200) return text.slice(0, 5000);
			}
		} catch { /* try next */ }
	}
	return '';
}

// CORS — allow requests from the static site
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') return res.sendStatus(204);
	next();
});

app.get('/summarize', async (req, res) => {
	const articleUrl = req.query.url;
	const headline = (req.query.headline ?? '').slice(0, 300);
	if (!articleUrl) return res.status(400).json({ error: 'url param required' });
	if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

	const articleText = await fetchArticleText([articleUrl]);

	try {
		const context = articleText
			? `Headline: ${headline}\nArticle text: ${articleText}`
			: `Headline: ${headline}\n(Full article text unavailable — summarise based on the headline.)`;

		const r = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				max_tokens: 300,
				temperature: 0.2,
				messages: [
					{
						role: 'system',
						content: 'You are a financial news summarizer for AngelOne, an Indian stock market YouTube channel network. Be factual, include key numbers, explain why Indian retail investors should care. Respond only with valid JSON. CRITICAL: Only use numbers and facts explicitly present in the provided text. Never invent specific figures.'
					},
					{
						role: 'user',
						content: `Summarize as JSON: {"title":"Clean factual headline (8-12 words)","summary":"2-3 sentences: what happened + key numbers + impact for Indian retail investors"}\n\n${context}`
					}
				]
			})
		});

		if (!r.ok) {
			const err = await r.text();
			console.error('[summarize] OpenAI', r.status, err.slice(0, 200));
			return res.status(502).json({ error: `OpenAI error ${r.status}: ${err.slice(0, 100)}` });
		}

		const data = await r.json();
		const content = data.choices?.[0]?.message?.content ?? '';
		const match = content.match(/\{[\s\S]*\}/);
		const parsed = JSON.parse(match?.[0] ?? content);
		res.json(parsed);
	} catch (e) {
		console.error('[summarize]', e.message);
		res.status(502).json({ error: e.message });
	}
});

app.get('/health', (_, res) => res.json({ ok: true }));

// ── Server-side RSS news fetching ────────────────────────────────────────────

const NEWS_FEEDS_BY_CATEGORY = {
	stocks: [
		{ id: 'et-markets',   name: 'ET Markets',         color: '#ff6b2b', url: 'https://economictimes.indiatimes.com/markets/rss.cms' },
		{ id: 'moneycontrol', name: 'MoneyControl',        color: '#9c27b0', url: 'https://news.google.com/rss/search?q=site:moneycontrol.com+stock+OR+market+OR+nifty+OR+sensex&hl=en-IN&gl=IN&ceid=IN:en' },
		{ id: 'ndtv-profit',  name: 'NDTV Profit',         color: '#e91e63', url: 'https://news.google.com/rss/search?q=site:ndtvprofit.com+stock+OR+market+OR+sensex+OR+nifty&hl=en-IN&gl=IN&ceid=IN:en' },
		{ id: 'bs-markets',   name: 'Business Standard',   color: '#4488ff', url: 'https://news.google.com/rss/search?q=site:business-standard.com+(market+OR+nifty+OR+sensex+OR+ipo+OR+results)&hl=en-IN&gl=IN&ceid=IN:en' }
	],
	'mutual-funds': [
		{ id: 'cafemutual',   name: 'Cafe Mutual',         color: '#00bcd4', url: 'https://news.google.com/rss/search?q=site:cafemutual.com&hl=en-IN&gl=IN&ceid=IN:en', forceCategory: 'mutual-funds' }
	],
	'personal-finance': [
		{ id: 'mint-money',   name: 'Mint Money',          color: '#4caf50', url: 'https://news.google.com/rss/search?q=site:livemint.com/money&hl=en-IN&gl=IN&ceid=IN:en', forceCategory: 'personal-finance' },
		{ id: 'et-wealth',    name: 'ET Wealth',           color: '#ff9800', url: 'https://news.google.com/rss/search?q=site:economictimes.indiatimes.com/wealth&hl=en-IN&gl=IN&ceid=IN:en', forceCategory: 'personal-finance' },
		{ id: 'bs-pf',        name: 'BS Personal Finance', color: '#607d8b', url: 'https://news.google.com/rss/search?q=site:business-standard.com/personal-finance&hl=en-IN&gl=IN&ceid=IN:en', forceCategory: 'personal-finance' }
	],
	economics: [
		{ id: 'ft',           name: 'FT',                  color: '#ff1744', url: 'https://news.google.com/rss/search?q=site:ft.com+(india+OR+economy+OR+inflation+OR+fed+OR+rbi+OR+markets+OR+gdp)&hl=en-IN&gl=IN&ceid=IN:en', forceCategory: 'economics' }
	]
};

// Flat list for any code that needs all feeds
const NEWS_FEEDS_SERVER = Object.values(NEWS_FEEDS_BY_CATEGORY).flat();

function parseRSSServer(xml, feed) {
	const items = [];
	const itemRx = /<item[^>]*>([\s\S]*?)<\/item>/gi;
	let m;
	while ((m = itemRx.exec(xml)) !== null) {
		const body = m[1];
		const rawTitle = (/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(body) || [])[1]?.trim() || '';
		const title = rawTitle.replace(/\s+-\s+[^-]+$/, '').trim();
		const link =
			(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(body) || [])[1]?.trim() ||
			(/<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(body) || [])[1]?.trim() || '';
		const pubDate = (/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i.exec(body) || [])[1]?.trim() || '';
		if (title && link) items.push({ title, link, pubDate, feedId: feed.id, feedName: feed.name, feedColor: feed.color, forceCategory: feed.forceCategory ?? null });
	}
	return items;
}

const NEWS_CACHE_TTL = 5 * 60 * 1000;
const newsCacheByCategory = {
	stocks:             { items: [], fetchedAt: 0 },
	'mutual-funds':     { items: [], fetchedAt: 0 },
	'personal-finance': { items: [], fetchedAt: 0 },
	economics:          { items: [], fetchedAt: 0 }
};

app.get('/news', async (req, res) => {
	const category = req.query.category;
	const feeds = NEWS_FEEDS_BY_CATEGORY[category] ?? NEWS_FEEDS_SERVER;
	const cache = newsCacheByCategory[category] ?? newsCacheByCategory['stocks'];

	if (Date.now() - cache.fetchedAt < NEWS_CACHE_TTL && cache.items.length > 0) {
		return res.json({ items: cache.items, cached: true });
	}

	const results = await Promise.allSettled(
		feeds.map(async (feed) => {
			const r = await fetch(feed.url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(12000) });
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const xml = await r.text();
			return parseRSSServer(xml, feed);
		})
	);
	const items = [];
	for (const result of results) {
		if (result.status === 'fulfilled') items.push(...result.value);
	}
	if (items.length > 0) {
		cache.items = items;
		cache.fetchedAt = Date.now();
	}
	res.json({ items, cached: false });
});

// RSS proxy — fetches any RSS/XML feed server-side, bypassing browser CORS restrictions
app.get('/rss-proxy', async (req, res) => {
	const url = req.query.url;
	if (!url || !/^https?:\/\//.test(url)) return res.status(400).send('');
	try {
		const r = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
		const text = await r.text();
		res.setHeader('Content-Type', r.headers.get('content-type') || 'application/xml; charset=utf-8');
		res.status(r.ok ? 200 : r.status).send(text);
	} catch (e) {
		console.warn('[rss-proxy]', e.message);
		res.status(502).send('');
	}
});

// NSE bulk deals — returns today's bulk deals as card-ready items
app.get('/data/bulk-deals', async (req, res) => {
	try {
		const r = await fetch('https://www.nseindia.com/api/bulk-deals', {
			headers: {
				...FETCH_HEADERS,
				'Referer': 'https://www.nseindia.com/market-data/bulk-deals',
				'X-Requested-With': 'XMLHttpRequest'
			},
			signal: AbortSignal.timeout(10000)
		});
		if (!r.ok) return res.status(502).json({ items: [] });
		const data = await r.json();
		const deals = (data?.data ?? []).slice(0, 20).map((d) => ({
			symbol: d.symbol ?? '',
			name: d.mktCapType ?? d.symbol ?? '',
			client: d.clientName ?? '',
			buySell: d.buySell ?? '',
			qty: d.tradedQty ?? 0,
			price: d.tradePrice ?? 0,
			headline: `${d.buySell === 'BUY' ? '▲' : '▼'} ${d.symbol} bulk deal — ${d.clientName ?? 'institution'} ${d.buySell?.toLowerCase() ?? ''} ${Number(d.tradedQty ?? 0).toLocaleString('en-IN')} shares at ₹${d.tradePrice}`
		}));
		res.json({ items: deals });
	} catch (e) {
		console.warn('[bulk-deals]', e.message);
		res.json({ items: [] });
	}
});


const SCRIPT_SYSTEM = `You write 20-second YouTube Shorts scripts for Angel One Bytes — an Indian markets and personal finance channel. Audience: retail investors who understand basic finance but not jargon.

CRITICAL RULE: Only use numbers, percentages, and financial figures that are EXPLICITLY provided in the input context. If a specific number is not in the input, do NOT invent it. Describe direction and scale in words if needed.

STRUCTURE (6 lines, each on its own line):
Line 1 — Hook: The most surprising, contrasting, or urgent fact. Lead with a stock move + contrast, a milestone, a policy change, or a human impact. Never start with context or a company description. Make the viewer stop scrolling.
Lines 2-3 — The What: Clearest version of what happened. Numbers only where they add real weight. Explain any jargon in plain language in the same sentence.
Line 4 — The Why/Driver: One factual line on what's actually causing this.
Line 5 — Insight/Tension: A contrast, risk, forward signal, irony, or human impact. Factual only — no speculation.
Line 6 — CTA: Rotate between these exactly as written:
  "Stay in the loop with Angel One Bytes for more updates."
  "Subscribe to Angel One Bytes for more updates."
  "Stay in the loop with Angel One Bytes to find out."
  "Stay tuned with Angel One Bytes for more market updates."
  "Got questions about this topic? Just Ask Angel on the Angel One app and subscribe to Angel One Bytes for more updates."

COMPLIANCE (strict):
- Use could/can/seems/may — never forward-looking claims as facts
- No buy/sell signals ever
- No brokerage recommendations
- No advisory tone — report, don't recommend

FORMAT:
- 70–95 words total
- Numbers spoken as words in script (e.g. "twenty-four thousand" not "24,000")
- No slash / for line breaks — actual line breaks
- Every sentence needs a subject
- No fluff phrases like "Here's what happened"
- No philosophical conclusions
- No words: straightforward, genuinely, honestly, unexpected — unless factually true
- Simple conversational language

RECURRING CONTEXT (use where relevant):
- FPI outflows 2026: ₹2.2 lakh crore YTD; domestic MFs absorbing via SIP at record ₹32,087 crore
- RBI repo rate: 5.25%, neutral stance, FY27 GDP at 6.9%
- Rupee at all-time low: 96.38 vs USD
- Petrol hiked ₹3 on May 15, second hike ₹0.90 on May 19
- West Asia: US-Iran ceasefire April 8, 2-week suspension, crude above $100 — relevant to aviation, OMCs, auto, energy, power, chemicals, pharma

SECTOR METRICS (include where available in the input):
IT: TCV, Deal Wins, Forward Guidance
Banks/NBFC: AUM/Loan Growth, NPA, ROE, ROA, Forward Guidance
Insurance: AUM, VNB Margin, RoEV, Solvency Ratio, Forward Guidance
AMC/Broker: AUM Growth, Yield, ARPU, Revenue Mix, Forward Guidance
Retail: SSSG Growth, Store Count, AOV, Asset Turnover, Forward Guidance
Real Estate: Pre-sales, Collection, Forward Guidance
Food/QC: AOV, Revenue Mix, EBITDA Margin, Forward Guidance
Auto: Volume Growth, Price Growth, Revenue Mix, Forward Guidance
Hospitals: ARPOB, Occupancy Rate, Payor Mix, Forward Guidance

Respond with ONLY the script — 6 lines, no labels, no JSON, no extra text.`;

app.get('/script', async (req, res) => {
	const headline = (req.query.headline ?? '').slice(0, 300);
	const summary = (req.query.summary ?? '').slice(0, 600);
	const category = (req.query.category ?? '').slice(0, 50);
	// Accept comma-separated list of source URLs to try fetching article text
	const sourceUrls = (req.query.urls ?? req.query.url ?? '').split(',').filter(Boolean);

	if (!headline) return res.status(400).json({ error: 'headline param required' });
	if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

	const articleText = await fetchArticleText(sourceUrls);

	const context = [
		`Headline: ${headline}`,
		summary ? `Summary: ${summary}` : '',
		articleText ? `Article text: ${articleText}` : ''
	].filter(Boolean).join('\n');

	try {
		const r = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				max_tokens: 400,
				temperature: 0.4,
				messages: [
					{ role: 'system', content: SCRIPT_SYSTEM },
					{ role: 'user', content: `Category: ${category}\n${context}` }
				]
			})
		});

		if (!r.ok) {
			const err = await r.text();
			return res.status(502).json({ error: `OpenAI error ${r.status}: ${err.slice(0, 100)}` });
		}

		const data = await r.json();
		const script = data.choices?.[0]?.message?.content?.trim() ?? '';
		res.json({ script });
	} catch (e) {
		console.error('[script]', e.message);
		res.status(502).json({ error: e.message });
	}
});

app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
