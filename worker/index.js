/**
 * Cloudflare Worker — Google Trends B&F proxy for AngelOne Bytes dashboard
 *
 * Deploy:
 *   cd worker
 *   npx wrangler deploy
 *
 * Then paste the deployed URL into src/lib/config/api.ts → TRENDS_WORKER_URL
 */

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
	async fetch(request) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: CORS });
		}

		const url = new URL(request.url);

		if (url.pathname !== '/trends') {
			return new Response('Not found', { status: 404, headers: CORS });
		}

		const trendsUrl =
			'https://trends.google.com/trends/api/realtimetrends' +
			'?hl=en-IN&tz=-330&cat=b&fi=0&fs=0&geo=IN&ri=300&rs=20&sort=0';

		let response;
		try {
			response = await fetch(trendsUrl, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8'
				}
			});
		} catch (err) {
			return json({ error: `Fetch failed: ${err.message}` }, 502);
		}

		if (!response.ok) {
			return json({ error: `Google returned ${response.status}` }, 502);
		}

		const raw = await response.text();

		// Strip Google's anti-JSON-hijacking prefix  ")]}'\n"
		const cleaned = raw.replace(/^\)\]\}'\n?/, '');

		let data;
		try {
			data = JSON.parse(cleaned);
		} catch {
			return json({ error: 'Failed to parse Google Trends response' }, 502);
		}

		const stories = data?.storySummaries?.trendingStories ?? [];

		const result = stories.slice(0, 5).map((s) => ({
			title: s.title ?? s.entityNames?.[0] ?? '',
			shareUrl:
				s.shareUrl ??
				`https://trends.google.com/trends/explore?cat=b&geo=IN&q=${encodeURIComponent(s.title ?? '')}`
		}));

		return json(result, 200);
	}
};

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS, 'Content-Type': 'application/json' }
	});
}
