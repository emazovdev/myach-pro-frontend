import { API_BASE_URL } from '../config/api';

interface UploadUrlResponse {
	ok: boolean;
	uploadUrl: string;
	fileKey: string;
}

interface BatchUrlsResponse {
	ok: boolean;
	urls: Record<string, string>;
}

/**
 * Оптимизированный сервис для работы с изображениями
 */
export class ImageService {
	private static instance: ImageService;
	private urlCache = new Map<string, { url: string; expires: number }>();

	static getInstance(): ImageService {
		if (!ImageService.instance) {
			ImageService.instance = new ImageService();
		}
		return ImageService.instance;
	}

	/**
	 * Получает URL для прямой загрузки файла
	 */
	async getUploadUrl(
		initData: string,
		fileName: string,
		contentType: string,
		folder?: string,
	): Promise<UploadUrlResponse> {
		const response = await fetch(`${API_BASE_URL}/upload/url`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `tma ${initData}`,
			},
			body: JSON.stringify({ fileName, contentType, folder }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Ошибка получения URL для загрузки');
		}

		return await response.json();
	}

	/**
	 * Загружает файл напрямую в облако
	 */
	async uploadFileDirect(
		file: File,
		uploadUrl: string,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			if (onProgress) {
				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable) {
						const progress = (e.loaded / e.total) * 100;
						onProgress(progress);
					}
				});
			}

			xhr.addEventListener('load', () => {
				if (xhr.status === 200) {
					resolve();
				} else {
					reject(new Error(`Ошибка загрузки: ${xhr.status}`));
				}
			});

			xhr.addEventListener('error', () => {
				reject(new Error('Ошибка сети при загрузке файла'));
			});

			xhr.open('PUT', uploadUrl);
			xhr.setRequestHeader('Content-Type', file.type);
			xhr.send(file);
		});
	}

	/**
	 * Полный процесс загрузки файла с оптимизацией
	 */
	async uploadImage(
		initData: string,
		file: File,
		folder?: string,
		onProgress?: (progress: number) => void,
	): Promise<string> {
		// Сжимаем изображение перед загрузкой
		const compressedFile = await this.compressImage(file);

		// Получаем URL для загрузки
		const { uploadUrl, fileKey } = await this.getUploadUrl(
			initData,
			compressedFile.name,
			compressedFile.type,
			folder,
		);

		// Загружаем файл
		await this.uploadFileDirect(compressedFile, uploadUrl, onProgress);

		return fileKey;
	}

	/**
	 * Получает оптимизированные URL для изображений батчем
	 */
	async getOptimizedUrls(
		initData: string,
		fileKeys: string[],
		options: {
			width?: number;
			height?: number;
			format?: 'webp' | 'jpeg' | 'png';
			quality?: number;
		} = {},
	): Promise<Record<string, string>> {
		if (!fileKeys.length) {
			return {};
		}

		// Проверяем кэш для каждого файла отдельно
		const cachedResults: Record<string, string> = {};
		const uncachedFileKeys: string[] = [];

		fileKeys.forEach((key) => {
			if (key) {
				const cacheKey = `${key}_${JSON.stringify(options)}`;
				const cached = this.urlCache.get(cacheKey);

				if (cached && cached.expires > Date.now() && cached.url) {
					cachedResults[key] = cached.url;
				} else {
					uncachedFileKeys.push(key);
				}
			}
		});

		// Если все файлы есть в кэше, возвращаем результат
		if (uncachedFileKeys.length === 0) {
			return cachedResults;
		}

		try {
			// Разбиваем на батчи по 10 файлов для оптимизации
			const batchSize = 10;
			const batches: string[][] = [];

			for (let i = 0; i < uncachedFileKeys.length; i += batchSize) {
				batches.push(uncachedFileKeys.slice(i, i + batchSize));
			}

			// Обрабатываем все батчи параллельно
			const batchPromises = batches.map(async (batch) => {
				const response = await fetch(`${API_BASE_URL}/upload/batch-urls`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `tma ${initData}`,
					},
					body: JSON.stringify({ fileKeys: batch, ...options }),
				});

				if (!response.ok) {
					// Fallback на пустые URL для некэшированных файлов
					const result: Record<string, string> = {};
					batch.forEach((key) => {
						result[key] = '';
					});
					return result;
				}

				const result: BatchUrlsResponse = await response.json();
				return result.urls || {};
			});

			const batchResults = await Promise.all(batchPromises);

			// Объединяем результаты всех батчей
			const allUrls = batchResults.reduce((acc, batchResult) => {
				return { ...acc, ...batchResult };
			}, {});

			// Кэшируем каждый URL отдельно
			Object.entries(allUrls).forEach(([key, url]) => {
				if (url) {
					const cacheKey = `${key}_${JSON.stringify(options)}`;
					this.urlCache.set(cacheKey, {
						url: url,
						expires: Date.now() + 22 * 60 * 60 * 1000,
					});
				}
			});

			// Объединяем кэшированные и новые результаты
			return { ...cachedResults, ...allUrls };
		} catch (error) {
			console.error('Ошибка получения URL изображений:', error);
			// Возвращаем кэшированные URL и пустые для некэшированных как fallback
			const result: Record<string, string> = { ...cachedResults };
			uncachedFileKeys.forEach((key) => {
				result[key] = '';
			});
			return result;
		}
	}

	/**
	 * Получает одиночный оптимизированный URL
	 */
	async getOptimizedUrl(
		initData: string,
		fileKey: string,
		options: {
			width?: number;
			height?: number;
			format?: 'webp' | 'jpeg' | 'png';
			quality?: number;
		} = {},
	): Promise<string> {
		if (!fileKey) return '';

		const urls = await this.getOptimizedUrls(initData, [fileKey], options);
		return urls[fileKey] || '';
	}

	/**
	 * Сжимает изображение перед загрузкой
	 */
	private async compressImage(
		file: File,
		quality: number = 0.8,
	): Promise<File> {
		// Если файл уже WebP и небольшой, не сжимаем
		if (file.type === 'image/webp' && file.size < 500000) {
			return file;
		}

		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			const img = new Image();

			img.onload = () => {
				// Ограничиваем максимальные размеры
				const maxWidth = 1920;
				const maxHeight = 1080;

				let { width, height } = img;

				if (width > maxWidth || height > maxHeight) {
					const ratio = Math.min(maxWidth / width, maxHeight / height);
					width *= ratio;
					height *= ratio;
				}

				canvas.width = width;
				canvas.height = height;

				// Включаем сглаживание для лучшего качества
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';

				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							const compressedFile = new File(
								[blob],
								file.name.replace(/\.[^/.]+$/, '.webp'),
								{
									type: 'image/webp',
									lastModified: Date.now(),
								},
							);
							resolve(compressedFile);
						} else {
							resolve(file); // Fallback на оригинальный файл
						}
					},
					'image/webp',
					quality,
				);
			};

			img.onerror = () => {
				// Если не удалось загрузить изображение, возвращаем оригинал
				resolve(file);
			};

			img.src = URL.createObjectURL(file);
		});
	}

	/**
	 * Создает превью изображения
	 */
	async createThumbnail(file: File, maxSize: number = 150): Promise<File> {
		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			const img = new Image();

			img.onload = () => {
				const { width, height } = img;
				const ratio = Math.min(maxSize / width, maxSize / height);

				canvas.width = width * ratio;
				canvas.height = height * ratio;

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							const thumbnailFile = new File([blob], `thumb_${file.name}`, {
								type: 'image/webp',
								lastModified: Date.now(),
							});
							resolve(thumbnailFile);
						} else {
							resolve(file);
						}
					},
					'image/webp',
					0.6,
				);
			};

			img.onerror = () => resolve(file);
			img.src = URL.createObjectURL(file);
		});
	}

	/**
	 * Очищает кэш
	 */
	clearCache(): void {
		this.urlCache.clear();
	}

	/**
	 * Очищает просроченные записи кэша
	 */
	cleanExpiredCache(): void {
		const now = Date.now();
		for (const [key, cached] of this.urlCache) {
			if (cached.expires <= now) {
				this.urlCache.delete(key);
			}
		}
	}
}

// Экспортируем singleton
export const imageService = ImageService.getInstance();

// Автоматическая очистка кэша каждые 30 минут
setInterval(() => {
	imageService.cleanExpiredCache();
}, 30 * 60 * 1000);
