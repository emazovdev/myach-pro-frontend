import type { CategorizedPlayers, Category } from '../types';
import { TELEGRAM_BOT_USERNAME } from '../config/api';
import { useTelegram } from '../hooks/useTelegram';

interface ShareData {
	categorizedPlayers: CategorizedPlayers;
	categories: Category[];
	clubName: string;
}

export const generateShareText = ({
	categorizedPlayers,
	categories,
	clubName,
}: ShareData): string => {
	let text = `🏆 ТИР-ЛИСТ ИГРОКОВ "${clubName.toUpperCase()}"\n\n`;

	categories.forEach((category) => {
		const players = categorizedPlayers[category.name] || [];
		const emoji = getCategoryEmoji(category.name);

		text += `${emoji} ${category.name.toUpperCase()} (${players.length}/${
			category.slots
		}):\n`;

		if (players.length > 0) {
			players.forEach((player, index) => {
				text += `${index + 1}. ${player.name}\n`;
			});
		} else {
			text += '— Пусто\n';
		}
		text += '\n';
	});

	text += '⚽ Создано в боте @myach_pro_bot';
	return text;
};

export const generateShareImage = async (
	shareData: ShareData,
): Promise<string | null> => {
	try {
		// Создаем Canvas для генерации изображения
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (!ctx) return null;

		// Настройки canvas
		canvas.width = 800;
		canvas.height = 1000;

		// Фон с градиентом
		const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
		gradient.addColorStop(0, '#EC3381');
		gradient.addColorStop(1, '#FF6B9D');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Заголовок
		ctx.fillStyle = 'white';
		ctx.font = 'bold 48px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('ТИР-ЛИСТ ИГРОКОВ', canvas.width / 2, 80);

		// Название клуба
		ctx.font = 'bold 36px Arial';
		ctx.fillText(shareData.clubName.toUpperCase(), canvas.width / 2, 140);

		// Рендерим категории
		let yPos = 200;
		shareData.categories.forEach((category) => {
			const players = shareData.categorizedPlayers[category.name] || [];

			// Фон категории
			ctx.fillStyle = category.color;
			ctx.fillRect(50, yPos, canvas.width - 100, 60);

			// Название категории
			ctx.fillStyle = 'white';
			ctx.font = 'bold 28px Arial';
			ctx.textAlign = 'left';
			ctx.fillText(
				`${category.name.toUpperCase()} (${players.length}/${category.slots})`,
				70,
				yPos + 40,
			);

			yPos += 80;

			// Игроки
			if (players.length > 0) {
				ctx.fillStyle = 'white';
				ctx.font = '24px Arial';
				players.forEach((player, index) => {
					ctx.fillText(`${index + 1}. ${player.name}`, 70, yPos);
					yPos += 35;
				});
			} else {
				ctx.fillStyle = '#cccccc';
				ctx.font = 'italic 20px Arial';
				ctx.fillText('— Пусто', 70, yPos);
				yPos += 35;
			}

			yPos += 20;
		});

		// Логотип бота внизу
		ctx.fillStyle = 'white';
		ctx.font = '20px Arial';
		ctx.textAlign = 'center';
		ctx.fillText(
			'⚽ Создано в @myach_pro_bot',
			canvas.width / 2,
			canvas.height - 40,
		);

		// Конвертируем в base64
		return canvas.toDataURL('image/png');
	} catch (error) {
		console.error('Ошибка при создании изображения:', error);
		return null;
	}
};

const getCategoryEmoji = (categoryName: string): string => {
	const emojiMap: Record<string, string> = {
		goat: '🐐',
		хорош: '👍',
		норм: '👌',
		бездарь: '👎',
	};

	return emojiMap[categoryName.toLowerCase()] || '⚽';
};

// Типы платформ
export type PlatformType = 'ios' | 'android' | 'windows' | 'macos' | 'unknown';

// Интерфейс для данных шэринга
export interface ShareOptions {
	imageBlob: Blob;
	text: string;
	clubName: string;
}

/**
 * Определяет платформу пользователя
 */
export function detectPlatform(): PlatformType {
	const userAgent = navigator.userAgent.toLowerCase();

	if (/iphone|ipad|ipod/.test(userAgent)) {
		return 'ios';
	}

	if (/android/.test(userAgent)) {
		return 'android';
	}

	if (/windows/.test(userAgent)) {
		return 'windows';
	}

	if (/macintosh|mac os x/.test(userAgent)) {
		return 'macos';
	}

	return 'unknown';
}

/**
 * Проверяет поддержку Web Share API
 */
export function supportsWebShare(): boolean {
	return 'share' in navigator && 'canShare' in navigator;
}

/**
 * Проверяет поддержку шэринга файлов
 */
export function supportsFileSharing(): boolean {
	return supportsWebShare() && 'canShare' in navigator;
}

/**
 * Шэринг через Web Share API
 */
async function shareViaWebShare(options: ShareOptions): Promise<boolean> {
	try {
		const imageFile = new File(
			[options.imageBlob],
			`tier-list-${options.clubName}.jpg`,
			{
				type: 'image/jpeg',
			},
		);

		const shareData = {
			text: options.text,
			files: [imageFile],
		};

		// Проверяем возможность шэринга
		if (navigator.canShare && !navigator.canShare(shareData)) {
			console.warn('Файлы не поддерживаются для шэринга на этой платформе');
			// Пробуем без файла
			await navigator.share({ text: options.text });
			return true;
		}

		await navigator.share(shareData);
		return true;
	} catch (error: any) {
		if (error.name === 'AbortError') {
			console.log('Пользователь отменил шэринг');
			return true; // Не считаем ошибкой
		}
		console.error('Ошибка Web Share API:', error);
		return false;
	}
}

/**
 * Шэринг через Telegram WebApp API
 */
async function shareViaTelegram(options: ShareOptions): Promise<boolean> {
	try {
		const { tg } = useTelegram();

		if (!tg) {
			return false;
		}

		// Создаем временный URL для изображения
		const imageUrl = URL.createObjectURL(options.imageBlob);

		// Для Telegram используем метод открытия ссылки
		const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
			`${options.text} - @${TELEGRAM_BOT_USERNAME}`,
		)}`;

		tg.openTelegramLink(shareUrl);

		// Очищаем временный URL
		setTimeout(() => URL.revokeObjectURL(imageUrl), 5000);

		return true;
	} catch (error) {
		console.error('Ошибка Telegram шэринга:', error);
		return false;
	}
}

/**
 * Скачивание изображения
 */
async function downloadImage(options: ShareOptions): Promise<boolean> {
	try {
		const url = URL.createObjectURL(options.imageBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `tier-list-${options.clubName}.jpg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Очищаем URL через 1 секунду
		setTimeout(() => URL.revokeObjectURL(url), 1000);

		return true;
	} catch (error) {
		console.error('Ошибка скачивания:', error);
		return false;
	}
}

/**
 * Копирование в буфер обмена
 */
async function copyToClipboard(options: ShareOptions): Promise<boolean> {
	try {
		// Пробуем скопировать изображение в буфер обмена
		if ('clipboard' in navigator && 'write' in navigator.clipboard) {
			const clipboardItem = new ClipboardItem({
				'image/jpeg': options.imageBlob,
			});

			await navigator.clipboard.write([clipboardItem]);
			return true;
		}

		// Fallback - копируем текст
		if ('clipboard' in navigator && 'writeText' in navigator.clipboard) {
			await navigator.clipboard.writeText(options.text);
			return true;
		}

		return false;
	} catch (error) {
		console.error('Ошибка копирования:', error);
		return false;
	}
}

/**
 * Универсальная функция шэринга
 */
export async function universalShare(options: ShareOptions): Promise<{
	success: boolean;
	method: string;
	error?: string;
}> {
	const platform = detectPlatform();

	console.log(`Попытка шэринга на платформе: ${platform}`);

	// 1. Пробуем Web Share API (приоритет для iOS и Android)
	if ((platform === 'ios' || platform === 'android') && supportsWebShare()) {
		const webShareSuccess = await shareViaWebShare(options);
		if (webShareSuccess) {
			return { success: true, method: 'webShare' };
		}
	}

	// 2. Пробуем Telegram нативный шэринг
	const telegramSuccess = await shareViaTelegram(options);
	if (telegramSuccess) {
		return { success: true, method: 'telegram' };
	}

	// 3. Пробуем копирование в буфер обмена
	const clipboardSuccess = await copyToClipboard(options);
	if (clipboardSuccess) {
		return { success: true, method: 'clipboard' };
	}

	// 4. Fallback - скачивание файла
	const downloadSuccess = await downloadImage(options);
	if (downloadSuccess) {
		return { success: true, method: 'download' };
	}

	return {
		success: false,
		method: 'none',
		error: 'Не удалось поделиться ни одним из доступных способов',
	};
}

/**
 * Получает список доступных методов шэринга для текущей платформы
 */
export function getAvailableShareMethods(): Array<{
	method: string;
	name: string;
	available: boolean;
}> {
	const platform = detectPlatform();

	return [
		{
			method: 'webShare',
			name: 'Системный шэринг',
			available:
				supportsWebShare() && (platform === 'ios' || platform === 'android'),
		},
		{
			method: 'telegram',
			name: 'Поделиться в Telegram',
			available: true,
		},
		{
			method: 'clipboard',
			name: 'Скопировать',
			available: 'clipboard' in navigator,
		},
		{
			method: 'download',
			name: 'Скачать',
			available: true,
		},
	];
}
