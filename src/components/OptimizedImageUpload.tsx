import React, { useState, useCallback } from 'react';
import { imageService } from '../api/imageService';
import { useTelegram } from '../hooks/useTelegram';

interface OptimizedImageUploadProps {
	onImageUploaded: (fileKey: string) => void;
	folder?: string;
	accept?: string;
	maxSize?: number;
	className?: string;
	children?: React.ReactNode;
	showProgress?: boolean;
}

export const OptimizedImageUpload: React.FC<OptimizedImageUploadProps> = ({
	onImageUploaded,
	folder = 'uploads',
	accept = 'image/*',
	maxSize = 5 * 1024 * 1024, // 5MB
	className = '',
	children,
	showProgress = true,
}) => {
	const { initData } = useTelegram();
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [preview, setPreview] = useState<string | null>(null);

	const handleFileSelect = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file || !initData) return;

			// Проверяем размер файла
			if (file.size > maxSize) {
				setError(
					`Файл слишком большой. Максимальный размер: ${Math.round(
						maxSize / 1024 / 1024,
					)}MB`,
				);
				return;
			}

			// Проверяем тип файла
			if (!file.type.startsWith('image/')) {
				setError('Выберите файл изображения');
				return;
			}

			setError(null);
			setIsUploading(true);
			setProgress(0);

			try {
				// Создаем превью
				const previewUrl = URL.createObjectURL(file);
				setPreview(previewUrl);

				// Загружаем изображение
				const fileKey = await imageService.uploadImage(
					initData,
					file,
					folder,
					(progressValue) => {
						setProgress(Math.round(progressValue));
					},
				);

				// Успешная загрузка
				onImageUploaded(fileKey);
				setProgress(100);

				// Очищаем превью через секунду
				setTimeout(() => {
					URL.revokeObjectURL(previewUrl);
					setPreview(null);
					setProgress(0);
				}, 1000);
			} catch (err: any) {
				console.error('Ошибка загрузки изображения:', err);
				setError(err.message || 'Ошибка загрузки изображения');

				// Очищаем превью при ошибке
				if (preview) {
					URL.revokeObjectURL(preview);
					setPreview(null);
				}
			} finally {
				setIsUploading(false);
			}
		},
		[initData, folder, maxSize, onImageUploaded, preview],
	);

	const handleDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();

			const file = event.dataTransfer.files[0];
			if (file) {
				// Создаем искусственное событие для обработки файла
				const fakeEvent = {
					target: { files: [file] as any },
					preventDefault: () => {},
					nativeEvent: {} as Event,
					currentTarget: {} as HTMLInputElement,
					bubbles: false,
					cancelable: false,
					defaultPrevented: false,
					eventPhase: 0,
					isTrusted: false,
					stopPropagation: () => {},
					timeStamp: 0,
					type: 'change',
					persist: () => {},
					isDefaultPrevented: () => false,
					isPropagationStopped: () => false,
				} as React.ChangeEvent<HTMLInputElement>;

				handleFileSelect(fakeEvent);
			}
		},
		[handleFileSelect],
	);

	const handleDragOver = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
		},
		[],
	);

	const inputId = `image-upload-${Math.random().toString(36).substring(7)}`;

	return (
		<div className={`relative ${className}`}>
			<div
				className={`
					border-2 border-dashed border-gray-300 rounded-lg p-4 text-center
					hover:border-blue-400 transition-colors cursor-pointer
					${isUploading ? 'pointer-events-none opacity-50' : ''}
				`}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onClick={() =>
					!isUploading && document.getElementById(inputId)?.click()
				}
			>
				{preview && (
					<div className='mb-4'>
						<img
							src={preview}
							alt='Preview'
							className='max-w-full max-h-32 mx-auto rounded'
						/>
					</div>
				)}

				{children || (
					<div className='py-4'>
						<svg
							className='mx-auto h-12 w-12 text-gray-400'
							stroke='currentColor'
							fill='none'
							viewBox='0 0 48 48'
						>
							<path
								d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
						<p className='mt-2 text-sm text-gray-600'>
							Нажмите или перетащите изображение сюда
						</p>
						<p className='text-xs text-gray-500'>
							PNG, JPG, WebP до {Math.round(maxSize / 1024 / 1024)}MB
						</p>
					</div>
				)}

				{isUploading && showProgress && (
					<div className='mt-4'>
						<div className='w-full bg-gray-200 rounded-full h-2'>
							<div
								className='bg-blue-500 h-2 rounded-full transition-all duration-300'
								style={{ width: `${progress}%` }}
							/>
						</div>
						<p className='mt-2 text-sm text-gray-600'>
							Загрузка... {progress}%
						</p>
					</div>
				)}
			</div>

			{error && (
				<div className='mt-2 text-sm text-red-600 text-center'>{error}</div>
			)}

			<input
				id={inputId}
				type='file'
				accept={accept}
				onChange={handleFileSelect}
				className='hidden'
				disabled={isUploading}
			/>
		</div>
	);
};

export default OptimizedImageUpload;
