import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { LoadingSpinner } from '../components';
import {
	getStats,
	getDetailedStats,
	resetAnalytics,
} from '../api/analyticsService';
import type { AnalyticsStats, DetailedStats } from '../api/analyticsService';

const AnalyticsPage = () => {
	const navigate = useNavigate();
	const { initData } = useTelegram();
	const [stats, setStats] = useState<AnalyticsStats | null>(null);
	const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedPeriod, setSelectedPeriod] = useState(7);

	// Состояние для обработки кликов по кнопке очистки
	const [clearClickCount, setClearClickCount] = useState(0);
	const [clearTimeout, setClearTimeout] = useState<number | null>(null);
	const [isResetting, setIsResetting] = useState(false);

	// Функция для безопасного форматирования даты
	const formatDate = (dateString: string): string => {
		try {
			if (!dateString || dateString === 'Invalid Date') {
				return 'Неизвестная дата';
			}

			// Если строка уже в правильном формате YYYY-MM-DD
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
				const date = new Date(dateString + 'T00:00:00');
				return date.toLocaleDateString('ru-RU');
			}

			// Попытка парсить как обычную дату
			const date = new Date(dateString);
			if (isNaN(date.getTime())) {
				return dateString; // Возвращаем исходную строку если не смогли распарсить
			}

			return date.toLocaleDateString('ru-RU');
		} catch (error) {
			console.error('Ошибка форматирования даты:', error);
			return dateString || 'Неизвестная дата';
		}
	};

	useEffect(() => {
		const loadAnalytics = async () => {
			if (!initData) {
				setError('Данные Telegram не найдены');
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const [statsData, detailedData] = await Promise.all([
					getStats(initData),
					getDetailedStats(initData, selectedPeriod),
				]);

				setStats(statsData);
				setDetailedStats(detailedData);
			} catch (err: any) {
				console.error('Ошибка при загрузке аналитики:', err);
				setError(err.message || 'Ошибка при загрузке данных');
			} finally {
				setLoading(false);
			}
		};

		loadAnalytics();
	}, [initData, selectedPeriod]);

	// Очистка таймаута при размонтировании
	useEffect(() => {
		return () => {
			if (clearTimeout) {
				window.clearTimeout(clearTimeout);
			}
		};
	}, [clearTimeout]);

	const handlePeriodChange = (days: number) => {
		setSelectedPeriod(days);
	};

	// Обработчик кликов по кнопке очистки
	const handleClearClick = () => {
		if (isResetting) return;

		const newClickCount = clearClickCount + 1;
		setClearClickCount(newClickCount);

		// Сбрасываем счетчик через 2 секунды
		if (clearTimeout) {
			window.clearTimeout(clearTimeout);
		}
		const timeout = window.setTimeout(() => {
			setClearClickCount(0);
		}, 2000);
		setClearTimeout(timeout);

		// При третьем клике показываем подтверждение
		if (newClickCount === 3) {
			setClearClickCount(0);
			if (clearTimeout) {
				window.clearTimeout(clearTimeout);
			}

			const confirmed = confirm(
				'⚠️ ВНИМАНИЕ! ⚠️\n\n' +
					'Вы действительно хотите полностью очистить всю статистику?\n\n' +
					'Это действие:\n' +
					'• Удалит ВСЕ события пользователей\n' +
					'• Удалит ВСЕ игровые сессии\n' +
					'• Удалит ВСЕХ обычных пользователей\n' +
					'• НЕЛЬЗЯ будет отменить!\n\n' +
					'Нажмите OK для подтверждения или Отмена для отказа.',
			);

			if (confirmed) {
				handleResetAnalytics();
			}
		}
	};

	// Функция сброса аналитики
	const handleResetAnalytics = async () => {
		if (!initData) {
			alert('Ошибка: не найдены данные Telegram');
			return;
		}

		setIsResetting(true);
		setError(null);

		try {
			const result = await resetAnalytics(initData);

			// Показываем результат
			alert(
				'✅ Аналитика успешно сброшена!\n\n' +
					`Удалено:\n` +
					`• События пользователей: ${result.deletedUserEvents}\n` +
					`• Игровые сессии: ${result.deletedGameSessions}\n` +
					`• Пользователи: ${result.deletedUsers}`,
			);

			// Перезагружаем данные
			window.location.reload();
		} catch (err: any) {
			console.error('Ошибка при сбросе аналитики:', err);
			setError(err.message || 'Ошибка при сбросе аналитики');
		} finally {
			setIsResetting(false);
		}
	};

	if (loading) {
		return <LoadingSpinner fullScreen message='Загрузка аналитики...' />;
	}

	if (error || !stats) {
		return (
			<div className='min-h-screen flex flex-col items-center justify-center p-4'>
				<div className='text-center max-w-md'>
					<h2 className='text-2xl font-bold mb-4 text-red-500'>
						{error || 'Ошибка при загрузке данных'}
					</h2>
					<button
						className='py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-80 bg-blue-500 text-white mr-4'
						onClick={() => window.location.reload()}
					>
						Обновить
					</button>
					<button
						className='py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-80 bg-gray-500 text-white'
						onClick={() => navigate('/admin')}
					>
						Назад
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-to-b from-[#EC3381] to-[#FF6B9D] flex flex-col'>
			{/* Заголовок */}
			<div className='text-center py-6'>
				<div className='flex items-center justify-center gap-3 mb-2'>
					<img
						src='/main_logo.png'
						alt='main_logo'
						className='w-16 h-16 object-contain'
						loading='eager'
						onError={(e) => {
							// Если логотип не загрузился, скрываем изображение
							const target = e.target as HTMLImageElement;
							target.style.display = 'none';
						}}
					/>
				</div>
				<h1 className='text-white text-3xl font-bold'>АНАЛИТИКА</h1>
			</div>

			{/* Основной контент */}
			<div className='bg-[var(--tg-theme-bg-color)] rounded-t-3xl flex-1 px-4 pt-6 pb-16'>
				{/* Кнопка назад */}
				<div className='mb-6 flex justify-between items-center'>
					<button
						onClick={() => navigate('/admin')}
						className='flex items-center gap-2 text-blue-500'
					>
						<span>←</span>
						<span>Назад</span>
					</button>
					<button
						onClick={() => window.location.reload()}
						className='flex items-center gap-2 text-blue-500'
					>
						<span>↻</span>
						Обновить
					</button>
				</div>

				{/* Общая статистика */}
				<div className='mb-6'>
					<h2 className='text-xl font-bold mb-4'>Общая статистика</h2>
					<div className='grid grid-cols-2 gap-4 mb-4'>
						<div className='bg-white rounded-lg p-4 shadow-sm'>
							<div className='text-2xl font-bold text-[#EC3381]'>
								{stats.totalUsers}
							</div>
							<div className='text-sm text-gray-600'>Всего пользователей</div>
						</div>
						<div className='bg-white rounded-lg p-4 shadow-sm'>
							<div className='text-2xl font-bold text-[#EC3381]'>
								{stats.totalAppStarts}
							</div>
							<div className='text-sm text-gray-600'>Запусков приложения</div>
						</div>
						<div className='bg-white rounded-lg p-4 shadow-sm'>
							<div className='text-2xl font-bold text-[#EC3381]'>
								{stats.totalGameCompletions}
							</div>
							<div className='text-sm text-gray-600'>Завершенных игр</div>
						</div>
						<div className='bg-white rounded-lg p-4 shadow-sm'>
							<div className='text-2xl font-bold text-[#EC3381]'>
								{stats.totalImageShares}
							</div>
							<div className='text-sm text-gray-600'>Поделились картинкой</div>
						</div>
						<div className='bg-white rounded-lg p-4 shadow-sm'>
							<div className='text-2xl font-bold text-[#EC3381]'>
								{stats.conversionRate}%
							</div>
							<div className='text-sm text-gray-600'>Конверсия завершения</div>
						</div>
						<div className='bg-white rounded-lg p-4 shadow-sm'>
							<div className='text-2xl font-bold text-[#EC3381]'>
								{stats.shareRate}%
							</div>
							<div className='text-sm text-gray-600'>Конверсия шэринга</div>
						</div>
					</div>
				</div>

				{/* Статистика за сегодня */}
				<div className='mb-6'>
					<h2 className='text-xl font-bold mb-4'>За сегодня</h2>
					<div className='grid grid-cols-2 gap-3'>
						<div className='bg-white rounded-lg p-3 shadow-sm'>
							<div className='text-lg font-bold text-[#EC3381]'>
								{stats.recentStats.usersToday}
							</div>
							<div className='text-xs text-gray-600'>Новых пользователей</div>
						</div>
						<div className='bg-white rounded-lg p-3 shadow-sm'>
							<div className='text-lg font-bold text-[#EC3381]'>
								{stats.recentStats.appStartsToday}
							</div>
							<div className='text-xs text-gray-600'>Запусков</div>
						</div>
						<div className='bg-white rounded-lg p-3 shadow-sm'>
							<div className='text-lg font-bold text-[#EC3381]'>
								{stats.recentStats.gameCompletionsToday}
							</div>
							<div className='text-xs text-gray-600'>Завершений</div>
						</div>
						<div className='bg-white rounded-lg p-3 shadow-sm'>
							<div className='text-lg font-bold text-[#EC3381]'>
								{stats.recentStats.imageSharesToday}
							</div>
							<div className='text-xs text-gray-600'>Поделились картинкой</div>
						</div>
					</div>
				</div>

				{/* Фильтр периода */}
				<div className='mb-6'>
					<h2 className='text-xl font-bold mb-4'>Детальная статистика</h2>
					<div className='flex gap-2 mb-4'>
						{[7, 14, 30].map((days) => (
							<button
								key={days}
								onClick={() => handlePeriodChange(days)}
								className={`px-4 py-2 rounded-lg font-medium transition-colors ${
									selectedPeriod === days
										? 'bg-[#EC3381] text-white'
										: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
								}`}
							>
								{days} дней
							</button>
						))}
					</div>
				</div>

				{/* Топ клубов */}
				{detailedStats && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3'>Топ клубов по играм</h3>
						<div className='space-y-2'>
							{detailedStats.topClubs.map((club, index) => (
								<div
									key={club.clubId}
									className='bg-white rounded-lg p-3 shadow-sm flex justify-between items-center'
								>
									<div className='flex items-center gap-3'>
										<div className='w-6 h-6 bg-[#EC3381] text-white rounded-full flex items-center justify-center text-sm font-bold'>
											{index + 1}
										</div>
										<span className='font-medium text-black'>
											{club.clubName}
										</span>
									</div>
									<div className='text-[#EC3381] font-bold'>
										{club.gameCount} игр
									</div>
								</div>
							))}
						</div>
						{detailedStats.topClubs.length === 0 && (
							<div className='text-center text-gray-500 py-4'>
								Нет данных за выбранный период
							</div>
						)}
					</div>
				)}

				{/* Статистика по дням */}
				{detailedStats && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3'>Статистика по дням</h3>
						<div className='space-y-2'>
							{detailedStats.dailyStats &&
							detailedStats.dailyStats.length > 0 ? (
								detailedStats.dailyStats.map((day: any) => (
									<div
										key={day.date}
										className='bg-white rounded-lg p-3 shadow-sm'
									>
										<div className='font-medium mb-1 text-black'>
											{formatDate(day.date)}
										</div>
										<div className='grid grid-cols-2 gap-4 text-sm mb-2'>
											<div>
												<span className='text-gray-600'>Запуски: </span>
												<span className='font-medium text-black'>
													{Number(day.app_starts) || 0}
												</span>
											</div>
											<div>
												<span className='text-gray-600'>Завершения: </span>
												<span className='font-medium text-black'>
													{Number(day.game_completions) || 0}
												</span>
											</div>
										</div>
										<div className='text-sm'>
											<span className='text-gray-600'>
												Поделились картинкой:{' '}
											</span>
											<span className='font-medium text-[#EC3381]'>
												{Number(day.image_shares) || 0}
											</span>
										</div>
									</div>
								))
							) : (
								<div className='text-center text-gray-500 py-4'>
									Нет данных за выбранный период
								</div>
							)}
						</div>
					</div>
				)}

				{/* Кнопка очистки */}
				<div className='mt-10 flex justify-center'>
					<button
						onClick={handleClearClick}
						disabled={isResetting}
						className={`flex items-center gap-2 bg-red-500 text-white py-3 px-8 rounded-lg font-medium${
							isResetting
								? 'text-gray-400 cursor-not-allowed'
								: clearClickCount === 0
								? 'text-red-500'
								: clearClickCount === 1
								? 'text-orange-500 scale-105'
								: 'text-red-600 scale-110 animate-pulse'
						}`}
					>
						<span>✕</span>
						<span>
							{isResetting
								? 'Сброс...'
								: clearClickCount === 0
								? 'Очистить'
								: clearClickCount === 1
								? 'Очистить (2/3)'
								: 'Очистить (3/3)!'}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default AnalyticsPage;
