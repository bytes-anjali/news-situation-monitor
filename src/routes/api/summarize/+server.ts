import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const BROWSER_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export const GET: RequestHandler = async ({ url }) => {
	const articleUrl = url.searchParams.get('url');
	if (!articleUrl) throw error(400, 'url param required');

	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) throw error(500, 'OPENAI_API_KEY not configured');

	// Fetch article server-side — no CORS issues here
	let articleText = '';
	try {
		const res = await fetch(articleUrl, {
			headers: { 'User-Agent': BROWSER_UA },
			signal: AbortSignal.timeout(8000)
		});
		if (res.ok) articleText = stripHtml(await res.text()).slice(0, 4000);
	} catch {
		// proceed with empty — OpenAI uses URL context
	}

	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			max_tokens: 300,
			temperature: 0.2,
			messages: [
				{
					role: 'system',
					content:
						'You are a financial news summarizer for AngelOne, an Indian stock market YouTube channel network covering investing, mutual funds, personal finance, and trading. Be factual, include key numbers, and explain why Indian retail investors should care. Respond only with valid JSON.'
				},
				{
					role: 'user',
					content: `Summarize this article as JSON:
{"title": "Clean factual headline (8-12 words, not clickbait)", "summary": "2-3 sentences: what happened + key numbers/figures + impact for Indian retail investors"}

Article URL: ${articleUrl}
Article text: ${articleText || '(Could not fetch — use URL context only)'}`
				}
			]
		})
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error('[summarize] OpenAI error', res.status, body.slice(0, 200));
		throw error(502, `OpenAI error ${res.status}: ${body.slice(0, 100)}`);
	}

	const data = await res.json();
	const content: string = data.choices?.[0]?.message?.content ?? '';

	try {
		const match = content.match(/\{[\s\S]*\}/);
		const parsed = JSON.parse(match?.[0] ?? content);
		return json(parsed);
	} catch {
		throw error(502, 'Failed to parse OpenAI response');
	}
};
