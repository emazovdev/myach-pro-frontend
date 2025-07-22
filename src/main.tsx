import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Улучшенный Service Worker с поддержкой инвалидации кэша
if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', async () => {
		try {
			// Создаем улучшенный Service Worker с правильным кэшированием API
			const swCode = `
				const CACHE_NAME = 'myach-pro-v3.9';
				const STATIC_CACHE_NAME = 'myach-pro-static-v3.9';
				const API_CACHE_NAME = 'myach-pro-api-v3.9';
				
				// Статические ресурсы для кэширования
				const staticUrlsToCache = [
					'/',
					'/assets/',
					'/fonts/',
					'/main_bg.jpg',
					'/main_logo.png',
					'/progress.png'
				];

				// Защита от DDoS: лимиты запросов
				const requestLimits = {
					maxRequestsPerMinute: 300,
					requestCounts: new Map(),
					resetTime: Date.now() + 60000
				};

				// Функция для проверки лимитов
				const checkRequestLimit = (url) => {
					const now = Date.now();
					
					// Сброс счетчиков каждую минуту
					if (now > requestLimits.resetTime) {
						requestLimits.requestCounts.clear();
						requestLimits.resetTime = now + 60000;
					}

					const count = requestLimits.requestCounts.get(url) || 0;
					requestLimits.requestCounts.set(url, count + 1);

					return count < requestLimits.maxRequestsPerMinute;
				};

				self.addEventListener('install', (event) => {
					event.waitUntil(
						Promise.all([
							caches.open(STATIC_CACHE_NAME)
								.then((cache) => cache.addAll(staticUrlsToCache))
						])
					);
					self.skipWaiting();
				});

				self.addEventListener('activate', (event) => {
					event.waitUntil(
						caches.keys().then((cacheNames) => {
							return Promise.all(
								cacheNames.map((cacheName) => {
									if (cacheName !== STATIC_CACHE_NAME && 
										cacheName !== API_CACHE_NAME && 
										cacheName !== CACHE_NAME) {
										return caches.delete(cacheName);
									}
								})
							);
						})
					);
					self.clients.claim();
				});

				self.addEventListener('fetch', (event) => {
					const url = new URL(event.request.url);
					
					// Проверка лимитов запросов
					if (!checkRequestLimit(url.pathname)) {
						event.respondWith(
							new Response(JSON.stringify({
								error: 'Превышен лимит запросов. Пожалуйста, подождите.'
							}), {
								status: 429,
								headers: { 'Content-Type': 'application/json' }
							})
						);
						return;
					}

					// Кэширование статических ресурсов
					if (url.pathname.includes('/assets/') || 
						url.pathname.includes('/fonts/') ||
						staticUrlsToCache.includes(url.pathname)) {
						
						event.respondWith(
							caches.match(event.request)
								.then((response) => {
									if (response) {
										return response;
									}
									return fetch(event.request).then((response) => {
										if (!response || response.status !== 200) {
											return response;
										}
										const responseToCache = response.clone();
										caches.open(STATIC_CACHE_NAME)
											.then((cache) => {
												cache.put(event.request, responseToCache);
											});
										return response;
									});
								})
						);
						return;
					}

					// Для API запросов используем сетевую стратегию с fallback на кэш
					if (url.pathname.startsWith('/api/')) {
						event.respondWith(
							fetch(event.request)
								.catch(() => caches.match(event.request))
								.then((response) => {
									if (!response) {
										return new Response(JSON.stringify({
											error: 'Нет соединения с сервером'
										}), {
											status: 503,
											headers: { 'Content-Type': 'application/json' }
										});
									}
									return response;
								})
						);
						return;
					}

					// Для остальных запросов используем сеть
					event.respondWith(fetch(event.request));
				});
			`;

			const blob = new Blob([swCode], { type: 'application/javascript' });
			const swUrl = URL.createObjectURL(blob);

			const registration = await navigator.serviceWorker.register(swUrl);
			console.log('SW registered with cache invalidation:', registration);

			// Очищаем старые кэши при обновлении
			if (registration.waiting) {
				registration.waiting.postMessage({ type: 'SKIP_WAITING' });
			}
		} catch (error) {
			console.log('SW registration failed:', error);
		}
	});
} else {
	// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная очистка SW в development
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistrations().then((regs) => {
			regs.forEach((reg) => {
				reg.unregister();
				console.log('SW unregistered for development');
			});
		});

		// Очищаем все кэши в development
		if ('caches' in window) {
			caches.keys().then((names) => {
				names.forEach((name) => {
					caches.delete(name);
				});
			});
		}
	}
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</StrictMode>,
);
