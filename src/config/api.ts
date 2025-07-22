/**
 * Конфигурация API
 */

// Проверяем наличие обязательных environment переменных
const requiredEnvVars = {
	API_URL: import.meta.env.VITE_API_URL,
	TELEGRAM_BOT_USERNAME: import.meta.env.VITE_TELEGRAM_BOT_USERNAME,
} as const;

// Валидация environment переменных
function validateEnvVars() {
	const missing: string[] = [];

	Object.entries(requiredEnvVars).forEach(([key, value]) => {
		if (!value || value.trim() === '') {
			missing.push(`VITE_${key}`);
		}
	});

	if (missing.length > 0) {
		console.warn(
			`⚠️  Отсутствуют environment переменные: ${missing.join(', ')}\n` +
				`Создайте файл .env.local на основе .env.example`,
		);
	}
}

/**
 * Нормализует URL для API, предотвращая дублирование доменов
 */
function normalizeApiUrl(url: string): string {
	if (!url) return '';

	// Убираем лишние слеши в конце
	const cleanUrl = url.replace(/\/+$/, '');

	// Если URL уже полный (с протоколом), возвращаем как есть
	if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
		return cleanUrl;
	}

	// Проверяем на дублирование домена в URL
	const urlParts = cleanUrl.split('/');
	const uniqueParts = [];
	const seenDomains = new Set();

	for (const part of urlParts) {
		// Если это домен (содержит точку) и мы его уже видели, пропускаем
		if (part.includes('.') && seenDomains.has(part)) {
			console.warn(`⚠️  Обнаружено дублирование домена в API_URL: ${part}`);
			continue;
		}

		if (part.includes('.')) {
			seenDomains.add(part);
		}

		if (part) {
			// Убираем пустые части
			uniqueParts.push(part);
		}
	}

	const normalizedUrl = uniqueParts.join('/');

	// Если URL содержит домен, но нет протокола, добавляем https
	if (normalizedUrl.includes('.') && !normalizedUrl.startsWith('http')) {
		return `https://${normalizedUrl}`;
	}

	// Для локальной разработки или относительных путей
	return normalizedUrl;
}

// Запускаем валидацию только в development mode
if (import.meta.env.DEV) {
	validateEnvVars();
}

// Определяем базовый URL для API с нормализацией
const rawApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = normalizeApiUrl(rawApiUrl);

// Telegram Bot Username с fallback
export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

// Экспортируем для использования в других файлах
export const API_CONFIG = {
	baseUrl: API_BASE_URL,
	timeout: 10000, // 10 секунд
	telegramBot: TELEGRAM_BOT_USERNAME,
} as const;

// Экспортируем функцию для проверки готовности API
export const isApiConfigured = () => {
	return Boolean(API_BASE_URL && TELEGRAM_BOT_USERNAME);
};

// Функция для логирования конфигурации в development режиме
if (import.meta.env.DEV) {
	console.log('🔧 API Configuration:', {
		rawUrl: rawApiUrl,
		normalizedUrl: API_BASE_URL,
		telegramBot: TELEGRAM_BOT_USERNAME,
		isConfigured: isApiConfigured(),
	});

	// Предупреждаем о потенциальных проблемах
	if (rawApiUrl !== API_BASE_URL) {
		console.warn('⚠️  API URL был нормализован:', {
			original: rawApiUrl,
			normalized: API_BASE_URL,
		});
	}
}
