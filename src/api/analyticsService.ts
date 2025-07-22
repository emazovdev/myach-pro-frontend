import { API_BASE_URL } from '../config/api';

export enum EventType {
	APP_START = 'app_start',
	GAME_START = 'game_start',
	GAME_COMPLETED = 'game_completed',
	IMAGE_SHARED = 'image_shared',
}

export interface AnalyticsStats {
	totalUsers: number;
	totalAppStarts: number;
	totalGameCompletions: number;
	totalImageShares: number;
	conversionRate: number;
	shareRate: number;
	recentStats: {
		usersToday: number;
		appStartsToday: number;
		gameCompletionsToday: number;
		imageSharesToday: number;
	};
}

export interface DetailedStats {
	dailyStats: Array<{
		date: string;
		app_starts: number;
		game_completions: number;
		image_shares: number;
	}>;
	topClubs: Array<{
		clubId: string;
		clubName: string;
		gameCount: number;
	}>;
}

/**
 * Логирует событие пользователя
 */
export const logEvent = async (
	initData: string,
	eventType: EventType,
	metadata?: any,
): Promise<void> => {
	try {
		const response = await fetch(`${API_BASE_URL}/analytics/event`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `tma ${initData}`,
			},
			body: JSON.stringify({
				eventType,
				metadata: metadata || {},
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	} catch (error) {
		console.error('Ошибка при логировании события:', error);
		// Не прерываем основной поток при ошибке аналитики
	}
};

/**
 * Начинает игровую сессию
 */
export const startGameSession = async (
	initData: string,
	clubId: string,
): Promise<string | null> => {
	try {
		const response = await fetch(`${API_BASE_URL}/analytics/game/start`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `tma ${initData}`,
			},
			body: JSON.stringify({
				clubId,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return data.sessionId || null;
	} catch (error) {
		console.error('Ошибка при начале игровой сессии:', error);
		return null;
	}
};

/**
 * Завершает игровую сессию
 */
export const completeGameSession = async (initData: string): Promise<void> => {
	try {
		const response = await fetch(`${API_BASE_URL}/analytics/game/complete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `tma ${initData}`,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	} catch (error) {
		console.error('Ошибка при завершении игровой сессии:', error);
		// Не прерываем основной поток при ошибке аналитики
	}
};

/**
 * Получает общую статистику (только для админов)
 */
export const getStats = async (initData: string): Promise<AnalyticsStats> => {
	const response = await fetch(`${API_BASE_URL}/analytics/stats`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `tma ${initData}`,
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = await response.json();
	return data.stats;
};

/**
 * Получает детальную статистику (только для админов)
 */
export const getDetailedStats = async (
	initData: string,
	days: number = 7,
): Promise<DetailedStats> => {
	const response = await fetch(
		`${API_BASE_URL}/analytics/stats/detailed?days=${days}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `tma ${initData}`,
			},
		},
	);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = await response.json();
	return data.stats;
};

/**
 * Сбрасывает всю аналитику (только для админов)
 */
export const resetAnalytics = async (
	initData: string,
): Promise<{
	deletedUserEvents: number;
	deletedGameSessions: number;
	deletedUsers: number;
}> => {
	const response = await fetch(`${API_BASE_URL}/analytics/reset`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `tma ${initData}`,
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = await response.json();
	return data.data;
};
