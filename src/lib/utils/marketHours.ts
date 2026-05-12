export type MarketStatus = 'open' | 'closed' | 'weekend';

function getISTDate(): Date {
	// IST = UTC+5:30
	return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

export function isMarketOpen(): boolean {
	return getMarketStatus() === 'open';
}

export function getMarketStatus(): MarketStatus {
	const ist = getISTDate();
	const day = ist.getUTCDay(); // 0=Sun, 6=Sat in UTC, but IST date may differ
	if (day === 0 || day === 6) return 'weekend';

	const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
	const open = 9 * 60 + 15;  // 9:15 AM IST
	const close = 15 * 60 + 30; // 3:30 PM IST

	if (minutes >= open && minutes < close) return 'open';
	return 'closed';
}

export function getNewsRefreshInterval(): number {
	return isMarketOpen() ? 15 * 60 * 1000 : 60 * 60 * 1000;
}

export function marketStatusLabel(status: MarketStatus): string {
	if (status === 'open') return 'Market Open';
	if (status === 'weekend') return 'Weekend';
	return 'Market Closed';
}
