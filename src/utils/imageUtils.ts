/**
 * Генерирует стабильный цвет на основе строки
 */
function generateColorFromString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Генерируем приятные цвета в диапазоне HSL
	const hue = Math.abs(hash) % 360;
	const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
	const lightness = 45 + (Math.abs(hash) % 20); // 45-65%

	// Конвертируем HSL в HEX
	const hslToHex = (h: number, s: number, l: number) => {
		l /= 100;
		const a = (s * Math.min(l, 1 - l)) / 100;
		const f = (n: number) => {
			const k = (n + h / 30) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color)
				.toString(16)
				.padStart(2, '0');
		};
		return `${f(0)}${f(8)}${f(4)}`;
	};

	return hslToHex(hue, saturation, lightness);
}

/**
 * Создает SVG плейсхолдер для изображения игрока в портретном формате
 */
export function createPlayerImagePlaceholder(
	playerName: string,
	width: number = 32,
	height: number = 42,
): string {
	const color = generateColorFromString(playerName);
	const initial = playerName.charAt(0).toUpperCase();
	const fontSize = Math.min(width, height) * 0.35;

	return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${color}' rx='4'/%3E%3Ctext x='50%25' y='50%25' font-size='${fontSize}' text-anchor='middle' dy='.3em' fill='white' font-family='Arial, sans-serif' font-weight='500'%3E${initial}%3C/text%3E%3C/svg%3E`;
}

/**
 * Создает SVG плейсхолдер для логотипа клуба
 */
export function createClubLogoPlaceholder(
	clubName: string,
	width: number = 24,
	height: number = 24,
): string {
	const color = generateColorFromString(clubName);
	const initial = clubName.charAt(0).toUpperCase();
	const fontSize = Math.min(width, height) * 0.5;

	return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${color}' rx='2'/%3E%3Ctext x='50%25' y='50%25' font-size='${fontSize}' text-anchor='middle' dy='.3em' fill='white' font-family='Arial, sans-serif' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
}

/**
 * Создает SVG скелетон для пустого слота игрока в портретном формате
 */
export function createPlayerSkeleton(
	width: number = 32,
	height: number = 42,
): string {
	return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Cdefs%3E%3ClinearGradient id='shimmer' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%23f3f4f6;stop-opacity:1' /%3E%3Cstop offset='50%25' style='stop-color:%23e5e7eb;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23f3f4f6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='${width}' height='${height}' fill='url(%23shimmer)' rx='4'/%3E%3Cpath d='M${
		width / 2 - 4
	} ${
		height * 0.35
	}a4 4 0 1 1 8 0a4 4 0 0 1-8 0' fill='%23d1d5db'/%3E%3Cpath d='M${
		width * 0.25
	} ${height * 0.75}c0-${height * 0.15} ${width * 0.125}-${height * 0.2} ${
		width * 0.25
	}-${height * 0.2}s${width * 0.25} ${height * 0.05} ${width * 0.25} ${
		height * 0.2
	}' fill='%23d1d5db'/%3E%3C/svg%3E`;
}

/**
 * Преобразует URL изображения для решения проблем с CORS
 */
export function getProxyImageUrl(
	originalUrl: string | null | undefined,
): string {
	if (!originalUrl) {
		return createPlayerSkeleton();
	}

	// Если URL уже является data URL или относительным путем, возвращаем как есть
	if (
		originalUrl.startsWith('data:') ||
		originalUrl.startsWith('./') ||
		originalUrl.startsWith('/')
	) {
		return originalUrl;
	}

	try {
		// Пытаемся использовать оригинальный URL
		// Если есть проблемы с CORS, изображение будет обработано в onError
		return originalUrl;
	} catch (error) {
		console.error('Error processing image URL:', error);
		return createPlayerSkeleton();
	}
}

/**
 * Создает плейсхолдер на основе имени игрока для использования в onError
 */
export function createPlayerPlaceholder(playerName: string): string {
	return createPlayerImagePlaceholder(playerName);
}
