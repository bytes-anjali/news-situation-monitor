import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY ?? '').trim().replace(/^["']|["']$/g, '');

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function stripHtml(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
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

	let articleText = '';
	try {
		const r = await fetch(articleUrl, {
			headers: { 'User-Agent': BROWSER_UA },
			signal: AbortSignal.timeout(8000)
		});
		if (r.ok) articleText = stripHtml(await r.text()).slice(0, 4000);
	} catch { /* proceed with headline only */ }

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
						content: 'You are a financial news summarizer for AngelOne, an Indian stock market YouTube channel network. Be factual, include key numbers, explain why Indian retail investors should care. Respond only with valid JSON.'
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

const SCRIPT_SYSTEM = `You write 20-second YouTube Shorts scripts for Angel One Bytes — an Indian markets and personal finance channel. Audience: retail investors who understand basic finance but not jargon.

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

SECTOR METRICS (include where available):
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
	if (!headline) return res.status(400).json({ error: 'headline param required' });
	if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

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
					{ role: 'user', content: `Category: ${category}\nHeadline: ${headline}\nSummary: ${summary || '(not available)'}` }
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
