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

app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
