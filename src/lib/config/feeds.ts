export interface NewsFeed {
	id: string;
	name: string;
	url: string;
	color: string;
}

export const INDIAN_NEWS_FEEDS: NewsFeed[] = [
	{
		id: 'et-markets',
		name: 'ET Markets',
		url: 'https://economictimes.indiatimes.com/markets/rss.cms',
		color: '#ff6b2b'
	},
	{
		id: 'et',
		name: 'Economic Times',
		url: 'https://economictimes.indiatimes.com/rssfeedsdefault.cms',
		color: '#ff9800'
	},
	{
		id: 'mint',
		name: 'Mint',
		url: 'https://www.livemint.com/rss/news',
		color: '#4caf50'
	},
	{
		id: 'bs',
		name: 'Business Standard',
		url: 'https://www.business-standard.com/rss/home_page_top_stories.rss',
		color: '#4488ff'
	}
];
