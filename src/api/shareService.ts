import { api } from './apiService';

// Новая структура - передаем только IDs игроков по категориям
export interface ShareData {
	categorizedPlayerIds: { [categoryName: string]: string[] };
	categories: Array<{ name: string; color: string; slots: number }>;
	clubId: string; // Передаем ID клуба вместо названия и URL
}

// Интерфейс для статистики лимитов пользователя
export interface UserShareStats {
	dailyUsed: number; // Количество использований за день
	dailyLimit: number; // Дневной лимит (5)
	dailyRemaining: number; // Оставшиеся попытки за день
	consecutiveCount: number; // Количество последовательных запросов
	consecutiveLimit: number; // Лимит последовательных запросов (2)
	nextAvailableAt: string | null; // Время, когда будет доступен следующий запрос
	intervalMinutes: number; // Интервал в минутах (10)
	canUse: boolean; // Можно ли использовать прямо сейчас
}

// Интерфейс для ответа shareResults с информацией о лимитах
export interface ShareResponse {
	success: boolean;
	message: string;
	closeWebApp?: boolean;
	rateLimitInfo?: {
		dailyUsed: number;
		dailyRemaining: number;
		consecutiveCount: number;
		nextAvailableAt: string | null;
		intervalMinutes: number;
	};
}

// Интерфейс для детальной ошибки лимитов
export interface RateLimitError extends Error {
	isRateLimit: true;
	type: 'daily' | 'consecutive';
	dailyUsed: number;
	dailyLimit: number;
	dailyRemaining: number;
	consecutiveCount: number;
	nextAvailableAt: string | null;
	intervalMinutes: number;
	retryAfterSeconds?: number;
}

/**
 * Получает статистику лимитов пользователя
 */
export const getUserShareStats = async (
	initData: string,
): Promise<UserShareStats> => {
	try {
		const response = await api.get('/share/stats', {
			headers: {
				Authorization: `tma ${initData}`,
			},
		});

		return response.data;
	} catch (error: any) {
		console.error('Ошибка при получении статистики лимитов:', error);

		// Возвращаем дефолтные значения в случае ошибки
		return {
			dailyUsed: 0,
			dailyLimit: 5,
			dailyRemaining: 5,
			consecutiveCount: 0,
			consecutiveLimit: 2,
			nextAvailableAt: null,
			intervalMinutes: 10,
			canUse: true,
		};
	}
};

/**
 * Извлекает информацию о лимитах из заголовков ответа
 */
const extractRateLimitInfo = (headers: any) => {
	return {
		dailyUsed: parseInt(headers['x-ratelimit-daily-used'] || '0'),
		dailyRemaining: parseInt(headers['x-ratelimit-daily-remaining'] || '5'),
		consecutiveCount: parseInt(headers['x-ratelimit-consecutive-count'] || '0'),
		nextAvailableAt: headers['x-ratelimit-next-available'] || null,
		intervalMinutes: parseInt(headers['x-ratelimit-interval-minutes'] || '10'),
	};
};

/**
 * Создает детальную ошибку лимитов из ответа API
 */
const createRateLimitError = (error: any): RateLimitError => {
	const data = error.response?.data || {};
	const headers = error.response?.headers || {};

	const rateLimitError = new Error(
		data.error || 'Превышен лимит запросов',
	) as RateLimitError;
	rateLimitError.name = 'RateLimitError';
	rateLimitError.isRateLimit = true;
	rateLimitError.type = data.type || 'daily';
	rateLimitError.dailyUsed = parseInt(headers['x-ratelimit-daily-used'] || '0');
	rateLimitError.dailyLimit = parseInt(
		headers['x-ratelimit-daily-limit'] || '5',
	);
	rateLimitError.dailyRemaining = parseInt(
		headers['x-ratelimit-daily-remaining'] || '0',
	);
	rateLimitError.consecutiveCount = parseInt(
		headers['x-ratelimit-consecutive-count'] || '0',
	);
	rateLimitError.nextAvailableAt =
		headers['x-ratelimit-next-available'] || null;
	rateLimitError.intervalMinutes = parseInt(
		headers['x-ratelimit-interval-minutes'] || '10',
	);
	rateLimitError.retryAfterSeconds = parseInt(headers['retry-after'] || '0');

	return rateLimitError;
};

/**
 * Отправляет данные результатов на сервер для генерации и отправки изображения в Telegram
 */
export const shareResults = async (
	initData: string,
	shareData: ShareData,
): Promise<ShareResponse> => {
	try {
		const response = await api.post(
			'/share/results',
			{
				shareData,
			},
			{
				headers: {
					Authorization: `tma ${initData}`,
				},
			},
		);

		// Извлекаем информацию о лимитах из заголовков
		const rateLimitInfo = extractRateLimitInfo(response.headers);

		return {
			...response.data,
			rateLimitInfo,
		};
	} catch (error: any) {
		console.error('Ошибка при отправке результатов:', error);

		// Если это ошибка лимитов (429), создаем детальную ошибку
		if (error.response?.status === 429) {
			throw createRateLimitError(error);
		}

		// Для других ошибок возвращаем стандартное сообщение
		throw new Error(
			error.response?.data?.error ||
				'Произошла ошибка при отправке результатов',
		);
	}
};

/**
 * Получение изображения для предварительного просмотра (сжатое)
 */
export async function previewResultsImage(
	initData: string,
	data: ShareData,
): Promise<Blob> {
	try {
		const response = await api.post('/share/preview', data, {
			responseType: 'blob',
			timeout: 30000, // 30 секунд таймаут
			headers: {
				Authorization: `tma ${initData}`,
			},
		});

		if (response.data instanceof Blob) {
			return response.data;
		}

		throw new Error('Неверный формат ответа сервера');
	} catch (error: any) {
		console.error('Ошибка при получении превью изображения:', error);

		if (error.code === 'ECONNABORTED') {
			throw new Error('Превышено время ожидания генерации изображения');
		}

		if (error.response?.status === 400) {
			throw new Error('Неверные данные для генерации изображения');
		}

		if (error.response?.status >= 500) {
			throw new Error('Ошибка сервера при генерации изображения');
		}

		throw new Error('Не удалось сгенерировать изображение');
	}
}

/**
 * Получение изображения в высоком качестве для шэринга/скачивания
 */
export async function downloadResultsImage(
	initData: string,
	data: ShareData,
): Promise<{
	blob: Blob;
	filename: string;
}> {
	try {
		const response = await api.post('/share/download', data, {
			responseType: 'blob',
			timeout: 60000, // 60 секунд таймаут для высокого качества
			headers: {
				Authorization: `tma ${initData}`,
			},
		});

		if (!(response.data instanceof Blob)) {
			throw new Error('Неверный формат ответа сервера');
		}

		// Извлекаем имя файла из заголовков
		const contentDisposition = response.headers['content-disposition'];
		let filename = 'tier-list.jpg';

		if (contentDisposition) {
			const filenameMatch = contentDisposition.match(
				/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
			);
			if (filenameMatch && filenameMatch[1]) {
				filename = filenameMatch[1].replace(/['"]/g, '');
			}
		}

		return {
			blob: response.data,
			filename,
		};
	} catch (error: any) {
		console.error('Ошибка при скачивании изображения:', error);

		if (error.code === 'ECONNABORTED') {
			throw new Error('Превышено время ожидания генерации изображения');
		}

		if (error.response?.status === 400) {
			throw new Error('Неверные данные для генерации изображения');
		}

		if (error.response?.status >= 500) {
			throw new Error('Ошибка сервера при генерации изображения');
		}

		throw new Error('Не удалось сгенерировать изображение');
	}
}

/**
 * Проверка доступности сервиса шэринга
 */
export async function checkShareServiceHealth(): Promise<boolean> {
	try {
		// Делаем легкий запрос для проверки доступности
		await api.get('/health');
		return true;
	} catch (error) {
		console.warn('Сервис шэринга недоступен:', error);
		return false;
	}
}
