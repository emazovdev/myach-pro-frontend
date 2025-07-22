import React, { useState, useEffect, useRef } from 'react';
import { imageService } from '../api/imageService';
import { useTelegram } from '../hooks/useTelegram';
import {
	createPlayerImagePlaceholder,
	createClubLogoPlaceholder,
} from '../utils/imageUtils';

interface OptimizedImageProps {
	fileKey?: string | null;
	alt: string;
	className?: string;
	width?: number;
	height?: number;
	fallbackType?: 'player' | 'club';
	fallbackName?: string;
	quality?: number;
	format?: 'webp' | 'jpeg' | 'png';
	lazy?: boolean;
	priority?: boolean; // Для критически важных изображений
	prefetch?: boolean; // Предзагрузка
	onLoad?: () => void;
	onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
	fileKey,
	alt,
	className = '',
	width,
	height,
	fallbackType = 'player',
	fallbackName = '',
	quality = 80,
	format = 'webp',
	lazy = true,
	priority = false,
	prefetch = false,
	onLoad,
	onError,
}) => {
	const { initData } = useTelegram();
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [isInView, setIsInView] = useState(!lazy || priority);
	const imgRef = useRef<HTMLImageElement>(null);
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Intersection Observer для lazy loading с улучшенной конфигурацией
	useEffect(() => {
		if (!lazy || isInView || priority) return;

		observerRef.current = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setIsInView(true);
					observerRef.current?.disconnect();
				}
			},
			{
				threshold: 0.1,
				rootMargin: prefetch ? '50px' : '10px', // Увеличиваем область для prefetch
			},
		);

		if (imgRef.current) {
			observerRef.current.observe(imgRef.current);
		}

		return () => {
			observerRef.current?.disconnect();
		};
	}, [lazy, isInView, priority, prefetch]);

	// Загрузка оптимизированного URL с улучшенным кэшированием
	useEffect(() => {
		if (!isInView || !fileKey || !initData) {
			if (!fileKey) {
				// Сразу показываем fallback если нет fileKey
				setIsLoading(false);
				setHasError(true);
			}
			return;
		}

		let isCancelled = false;

		const loadOptimizedImage = async () => {
			try {
				setIsLoading(true);
				setHasError(false);

				const optimizedUrl = await imageService.getOptimizedUrl(
					initData,
					fileKey,
					{ width, height, format, quality },
				);

				if (!isCancelled) {
					if (optimizedUrl) {
						// Предзагружаем изображение в фоне
						const img = new Image();
						img.onload = () => {
							if (!isCancelled) {
								setImageSrc(optimizedUrl);
								setIsLoading(false);
								setHasError(false);
								onLoad?.();
							}
						};
						img.onerror = () => {
							if (!isCancelled) {
								setHasError(true);
								setIsLoading(false);
								onError?.();
							}
						};
						img.src = optimizedUrl;
					} else {
						setHasError(true);
						setIsLoading(false);
					}
				}
			} catch (error) {
				console.error('Ошибка загрузки оптимизированного изображения:', error);
				if (!isCancelled) {
					setHasError(true);
					setIsLoading(false);
					onError?.();
				}
			}
		};

		loadOptimizedImage();

		return () => {
			isCancelled = true;
		};
	}, [
		isInView,
		fileKey,
		initData,
		width,
		height,
		format,
		quality,
		onLoad,
		onError,
	]);

	const handleImageLoad = () => {
		setIsLoading(false);
		setHasError(false);
		onLoad?.();
	};

	const handleImageError = () => {
		setIsLoading(false);
		setHasError(true);
		onError?.();
	};

	// Создаем fallback изображение
	const getFallbackSrc = () => {
		if (fallbackType === 'club') {
			return createClubLogoPlaceholder(
				fallbackName || alt,
				width || 24,
				height || 24,
			);
		}
		return createPlayerImagePlaceholder(
			fallbackName || alt,
			width || 32,
			height || 42,
		);
	};

	const displaySrc = hasError ? getFallbackSrc() : imageSrc;

	return (
		<div className={`relative ${className}`}>
			{isLoading && isInView && (
				<div
					className='absolute inset-0 bg-gray-200 animate-pulse rounded'
					style={{ width: width || '100%', height: height || '100%' }}
				/>
			)}

			<img
				ref={imgRef}
				src={displaySrc || undefined}
				alt={alt}
				className={`
					${isLoading ? 'opacity-0' : 'opacity-100'} 
					transition-opacity duration-300
					${className}
				`}
				width={width}
				height={height}
				onLoad={handleImageLoad}
				onError={handleImageError}
				loading={priority ? 'eager' : lazy ? 'lazy' : 'eager'}
				decoding='async'
				fetchPriority={priority ? 'high' : 'auto'}
			/>
		</div>
	);
};

export default OptimizedImage;
