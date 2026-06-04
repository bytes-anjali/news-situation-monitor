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
		url: 'https://news.google.com/rss/search?q=site:livemint.com+finance+OR+market+OR+stock&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#4caf50'
	},
	{
		id: 'bs',
		name: 'Business Standard',
		url: 'https://news.google.com/rss/search?q=site:business-standard.com+market+OR+stock+OR+finance&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#4488ff'
	},
	{
		id: 'moneycontrol',
		name: 'MoneyControl',
		url: 'https://news.google.com/rss/search?q=site:moneycontrol.com+stock+OR+market+OR+nifty&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#9c27b0'
	},
	{
		id: 'ndtv-profit',
		name: 'NDTV Profit',
		url: 'https://news.google.com/rss/search?q=site:ndtvprofit.com+stock+OR+market+OR+sensex&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#e91e63'
	},
	{
		id: 'et-wealth',
		name: 'ET Wealth',
		url: 'https://news.google.com/rss/search?q=site:economictimes.indiatimes.com/wealth&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#00897b'
	},
	{
		id: 'mf-news',
		name: 'MF / PF',
		url: 'https://news.google.com/rss/search?q=india+("mutual+fund"+OR+SIP+OR+NFO+OR+EPF+OR+PPF+OR+"income+tax"+OR+"home+loan")&hl=en-IN&gl=IN&ceid=IN:en',
		color: '#3fb950'
	}
];
