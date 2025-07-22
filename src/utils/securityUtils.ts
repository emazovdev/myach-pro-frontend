export const securityUtils = {
	// Проверка на бота по поведению пользователя
	botDetection: {
		clicks: [] as number[],
		maxClicksPerSecond: 10,

		track() {
			const now = Date.now();
			this.clicks = [...this.clicks.filter((time) => now - time < 1000), now];

			if (this.clicks.length > this.maxClicksPerSecond) {
				throw new Error('Подозрительная активность. Пожалуйста, подождите.');
			}
		},
	},

	// Защита от XSS
	sanitizeInput(input: string): string {
		return input.replace(/[<>]/g, '');
	},

	// Проверка origin для защиты от CSRF
	checkOrigin(origin: string): boolean {
		const allowedOrigins = ['https://t.me', window.location.origin];
		return allowedOrigins.includes(origin);
	},
};
