export type PanelId = 'markets' | 'gainers' | 'news';

export const PANELS: Record<PanelId, { name: string }> = {
	markets: { name: 'Indian Market Overview' },
	gainers: { name: 'Top Gainers / Losers' },
	news: { name: 'Content Spotting' }
};
