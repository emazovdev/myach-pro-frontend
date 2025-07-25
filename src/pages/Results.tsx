import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { completeGameSession } from '../api/analyticsService'
import {
	downloadResultsImage,
	getUserShareStats,
	shareResults,
	type RateLimitError,
	type ShareData,
	type UserShareStats,
} from '../api/shareService'
import { saveGameResults, type GameResult } from '../api/statisticsService'
import { CategoryItem, LoadingSpinner, ShareTestPanel } from '../components'
import { TELEGRAM_BOT_USERNAME } from '../config/api'
import { useTelegram } from '../hooks/useTelegram'
import { useGameStore, useUserStore } from '../store'
import { getProxyImageUrl } from '../utils/imageUtils'
import { securityUtils } from '../utils/securityUtils'
import {
	detectPlatform,
	getAvailableShareMethods,
	universalShare,
	type ShareOptions,
} from '../utils/shareUtils'

// Функция для обработки названия клуба
const getDisplayClubName = (clubName: string): string => {
	// Проверяем, содержит ли название "клуб" (регистронезависимо)
	const hasClub = clubName.toLowerCase().includes('клуб')

	// Ищем сезон в формате YYYY/YY
	const seasonMatch = clubName.match(/(\d{4}\/\d{2})/)

	if (hasClub && seasonMatch) {
		const season = seasonMatch[1]
		return `Твой тир-лист клубов ${season}`
	}

	return clubName
}

const Results = () => {
	const { initData } = useTelegram()
	const { isAdmin } = useUserStore()
	const navigate = useNavigate()
	const {
		categorizedPlayers,
		categories,
		selectedClub,
		isEditingPositions,
		selectedPlayers,
		tempCategorizedPlayers,
		hasCompletedInitialStep,
		enterEditMode,
		exitEditMode,
		selectPlayerForSwap,
		swapSelectedPlayers,
		savePositionChanges,
		completeInitialStep,
		resetGame,
	} = useGameStore()
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isSharing, setIsSharing] = useState(false)
	const [shareStatus, setShareStatus] = useState<string>('')
	const [hasSharedInSession, setHasSharedInSession] = useState(false) // Флаг отправки в сессии
	const [platform] = useState(() => detectPlatform())
	const [availableMethods] = useState(() => getAvailableShareMethods())
	const [userShareStats, setUserShareStats] = useState<UserShareStats | null>(
		null
	)
	// const [isLoadingStats, setIsLoadingStats] = useState(false);

	// Проверяем, есть ли данные игры
	const hasGameData =
		categories.length > 0 &&
		Object.keys(categorizedPlayers).length > 0 &&
		Object.values(categorizedPlayers).some(players => players.length > 0)

	// Функция для форматирования времени до следующего доступного запроса
	const formatTimeUntilAvailable = (nextAvailable: string | null): string => {
		if (!nextAvailable) return ''

		const now = new Date()
		const availableTime = new Date(nextAvailable)
		const diffMs = availableTime.getTime() - now.getTime()

		if (diffMs <= 0) return 'Доступно сейчас'

		const minutes = Math.ceil(diffMs / 60000)
		return `через ${minutes} мин`
	}

	// Проверяем, доступна ли кнопка поделиться
	const isShareAvailable = () => {
		if (!userShareStats) return true // По умолчанию доступна, пока не загрузилась статистика

		return userShareStats.canUse && userShareStats.dailyRemaining > 0
	}

	useEffect(() => {
		// Проверяем наличие данных игры и клуба
		if (hasGameData && selectedClub) {
			setIsLoading(false)
		} else if (!hasGameData) {
			setError('Данные игры не найдены')
			setIsLoading(false)
		} else if (!selectedClub) {
			setError('Информация о клубе не найдена')
			setIsLoading(false)
		}
	}, [hasGameData, selectedClub])

	// Загружаем статистику лимитов пользователя
	useEffect(() => {
		const loadUserStats = async () => {
			if (!initData || !isAdmin) return

			// setIsLoadingStats(true);
			try {
				const stats = await getUserShareStats(initData)
				setUserShareStats(stats)
			} catch (error) {
				console.error('Ошибка при загрузке статистики лимитов:', error)
				// В случае ошибки устанавливаем дефолтные значения
				setUserShareStats({
					dailyUsed: 0,
					dailyLimit: 10,
					dailyRemaining: 10,
					consecutiveCount: 0,
					consecutiveLimit: 2,
					nextAvailableAt: null,
					intervalMinutes: 10,
					canUse: true,
				})
			} finally {
				// setIsLoadingStats(false);
			}
		}

		loadUserStats()
	}, [initData, isAdmin])

	// Периодически обновляем состояние доступности кнопки
	useEffect(() => {
		if (!userShareStats?.nextAvailableAt) return

		const interval = setInterval(() => {
			const now = new Date()
			const availableTime = new Date(userShareStats.nextAvailableAt!)

			if (now >= availableTime) {
				// Время истекло, можно обновить статистику
				if (initData && isAdmin) {
					getUserShareStats(initData)
						.then(stats => {
							setUserShareStats(stats)
						})
						.catch(console.error)
				}
			}
		}, 30000) // Проверяем каждые 30 секунд

		return () => clearInterval(interval)
	}, [userShareStats?.nextAvailableAt, initData, isAdmin])

	// Универсальная функция для обработки клика по кнопке "Поделиться"
	const handleShare = async () => {
		try {
			// Проверяем origin для защиты от CSRF
			if (!securityUtils.checkOrigin(window.location.origin)) {
				throw new Error('Недопустимый источник запроса')
			}

			// Проверяем, не была ли уже отправлена картинка в этой сессии
			if (hasSharedInSession) {
				setShareStatus('🚫 Изображение уже было отправлено в этой сессии')
				setTimeout(() => setShareStatus(''), 3000)
				return
			}

			if (!initData || !selectedClub || !hasGameData) {
				setShareStatus('Недостаточно данных для создания изображения')
				setTimeout(() => setShareStatus(''), 3000)
				return
			}

			// Проверяем лимиты пользователя
			if (userShareStats && !isShareAvailable()) {
				if (userShareStats.dailyRemaining <= 0) {
					setShareStatus('🚫 Превышен дневной лимит (10 изображений в день)')
				} else if (!userShareStats.canUse && userShareStats.nextAvailableAt) {
					const timeUntil = formatTimeUntilAvailable(
						userShareStats.nextAvailableAt
					)
					setShareStatus(`⏳ Следующая отправка доступна ${timeUntil}`)
				} else {
					setShareStatus('🚫 Отправка временно недоступна')
				}
				setTimeout(() => setShareStatus(''), 3000)
				return
			}

			setIsSharing(true)

			// Преобразуем categorizedPlayers в categorizedPlayerIds (только IDs)
			const categorizedPlayerIds: { [categoryName: string]: string[] } = {}

			Object.entries(categorizedPlayers).forEach(([categoryName, players]) => {
				categorizedPlayerIds[categoryName] = players.map(player => player.id)
			})

			const shareData: ShareData = {
				categorizedPlayerIds,
				categories,
				clubId: selectedClub.id,
			}

			// Проверяем платформу для выбора метода шэринга
			if (platform === 'ios') {
				// Для iOS оставляем поведение с webview
				// Получаем изображение в высоком качестве
				const { blob } = await downloadResultsImage(initData, shareData)

				// Подготавливаем данные для универсального шэринга
				const shareOptions: ShareOptions = {
					imageBlob: blob,
					text: `Собери свой тир лист - @${TELEGRAM_BOT_USERNAME}`,
					clubName: selectedClub.name,
				}

				// Используем универсальную функцию шэринга для iOS
				const result = await universalShare(shareOptions)

				if (result.success) {
					// Устанавливаем флаг успешной отправки в сессии
					setHasSharedInSession(true)
				} else {
					setShareStatus(`❌ ${result.error || 'Не удалось поделиться'}`)
				}
			} else {
				// Для других ОС отправляем картинку в чат бота
				console.log('🔍 Отправка в чат для Android/др. ОС:')
				console.log('📋 initData присутствует:', !!initData)
				console.log('📋 initData length:', initData?.length)
				console.log('📦 shareData:', shareData)

				const result = await shareResults(initData, shareData)

				if (result.success) {
					// Устанавливаем флаг успешной отправки в сессии
					setHasSharedInSession(true)

					// Обновляем статистику лимитов из ответа
					if (result.rateLimitInfo) {
						setUserShareStats(prev =>
							prev
								? {
										...prev,
										dailyUsed: result.rateLimitInfo!.dailyUsed,
										dailyRemaining: result.rateLimitInfo!.dailyRemaining,
										consecutiveCount: result.rateLimitInfo!.consecutiveCount,
										nextAvailableAt: result.rateLimitInfo!.nextAvailableAt,
										canUse: result.rateLimitInfo!.nextAvailableAt
											? false
											: true,
								  }
								: null
						)
					}
				} else {
					setShareStatus(`❌ ${result.message || 'Не удалось отправить в чат'}`)
				}
			}
		} catch (error: any) {
			console.error('Ошибка при шэринге:', error)

			// Обработка ошибок лимитов
			if (error.isRateLimit) {
				const rateLimitError = error as RateLimitError

				// Обновляем статистику из ошибки
				setUserShareStats(prev =>
					prev
						? {
								...prev,
								dailyUsed: rateLimitError.dailyUsed,
								dailyLimit: rateLimitError.dailyLimit,
								dailyRemaining: rateLimitError.dailyRemaining,
								consecutiveCount: rateLimitError.consecutiveCount,
								nextAvailableAt: rateLimitError.nextAvailableAt,
								canUse: false,
						  }
						: null
				)

				// Показываем специализированное сообщение об ошибке лимитов
				if (rateLimitError.type === 'daily') {
					setShareStatus('🚫 Превышен дневной лимит (10 изображений в день)')
				} else if (rateLimitError.type === 'consecutive') {
					const timeUntil = formatTimeUntilAvailable(
						rateLimitError.nextAvailableAt
					)
					setShareStatus(`⏳ Следующая отправка доступна ${timeUntil}`)
				} else {
					setShareStatus(`❌ ${rateLimitError.message}`)
				}
			} else {
				// Обычные ошибки
				if (platform === 'ios') {
					setShareStatus(
						`❌ ${error.message || 'Не удалось создать изображение'}`
					)
				} else {
					setShareStatus(`❌ ${error.message || 'Не удалось отправить в чат'}`)
				}
			}
		} finally {
			setIsSharing(false)

			// Очищаем статус через 3 секунды
			setTimeout(() => setShareStatus(''), 2000)
		}
	}

	// Функция для тестирования шэринга (только в development)
	const getTestShareOptions = async (
		testInitData: string
	): Promise<ShareOptions> => {
		if (!selectedClub || !hasGameData) {
			throw new Error('Недостаточно данных для тестирования')
		}

		// Преобразуем categorizedPlayers в categorizedPlayerIds (только IDs)
		const categorizedPlayerIds: { [categoryName: string]: string[] } = {}

		Object.entries(categorizedPlayers).forEach(([categoryName, players]) => {
			categorizedPlayerIds[categoryName] = players.map(player => player.id)
		})

		const shareData: ShareData = {
			categorizedPlayerIds,
			categories,
			clubId: selectedClub!.id,
		}

		// Получаем изображение для тестирования
		const { blob } = await downloadResultsImage(testInitData, shareData)

		return {
			imageBlob: blob,
			text: `Тест шэринга тир-листа - @${TELEGRAM_BOT_USERNAME}`,
			clubName: selectedClub!.name,
		}
	}

	// Функция для обработки клика на кнопку "Продолжить"
	const handleContinue = async () => {
		if (!initData || !selectedClub || !hasGameData) {
			console.error('Недостаточно данных для сохранения статистики')
			return
		}

		try {
			// Логируем завершение игры
			await completeGameSession(initData)

			// Сохраняем результаты игры для статистики
			const categorizedPlayerIds: { [categoryName: string]: string[] } = {}
			Object.entries(categorizedPlayers).forEach(([categoryName, players]) => {
				categorizedPlayerIds[categoryName] = players.map(player => player.id)
			})

			const gameResult: GameResult = {
				categorizedPlayerIds,
				clubId: selectedClub.id,
			}

			await saveGameResults(initData, gameResult)

			// Переходим к следующему этапу
			completeInitialStep()
		} catch (error) {
			console.error('Ошибка при сохранении статистики:', error)
			// Все равно переходим к следующему этапу, даже если статистика не сохранилась
			completeInitialStep()
		}
	}

	// Обработчики для режима редактирования позиций
	const handleEnterEditMode = () => {
		enterEditMode()
	}

	const handleExitEditMode = () => {
		exitEditMode()
	}

	const handlePlayerClick = (player: any, categoryName: string) => {
		selectPlayerForSwap(player, categoryName)
	}

	const handleSwapPlayers = () => {
		const success = swapSelectedPlayers()
		if (!success) {
			// Можно добавить уведомление об ошибке
			console.warn('Не удалось поменять местами игроков')
		}
	}

	const handleSavePositions = () => {
		savePositionChanges()
	}

	// Функция для начала новой игры
	const handleStartNewGame = () => {
		// Сбрасываем состояние игры
		resetGame()
		// Переходим к выбору команды
		navigate('/select-team')
	}

	// Определяем какие данные показывать (в режиме редактирования - временные, иначе - обычные)
	const displayData = isEditingPositions
		? tempCategorizedPlayers
		: categorizedPlayers

	// Показываем загрузку, если данные еще не получены
	if (isLoading) {
		return <LoadingSpinner fullScreen message='Загрузка результатов...' />
	}

	// Показываем ошибку, если что-то пошло не так
	if (error || !selectedClub) {
		return (
			<div
				className='min-h-screen flex flex-col items-center justify-center p-4'
				style={{
					background: 'var(--tg-theme-bg-color)',
					color: 'var(--tg-theme-text-color)',
				}}
			>
				<div className='text-center max-w-md'>
					<h2 className='text-2xl font-bold mb-4 text-red-500'>
						{error || 'Произошла ошибка при загрузке данных'}
					</h2>
					<button
						className='py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
						onClick={() => window.location.reload()}
					>
						Обновить страницу
					</button>
				</div>
			</div>
		)
	}

	// Показываем сообщение, если нет данных игры
	if (!hasGameData) {
		return (
			<div
				className='min-h-screen flex flex-col items-center justify-center p-4'
				style={{
					background: 'var(--tg-theme-bg-color)',
					color: 'var(--tg-theme-text-color)',
				}}
			>
				<div className='text-center max-w-md'>
					<h2 className='text-2xl font-bold mb-4'>
						Нет данных для отображения результатов
					</h2>
					<p className='text-lg mb-6'>
						Сначала пройдите игру, чтобы увидеть результаты
					</p>
					<button
						className='py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
						onClick={() => window.history.back()}
					>
						Вернуться назад
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-[url("/main_bg.jpg")] flex flex-col'>
			<div className='flex-1 flex flex-col'>
				{/* Заголовок с мячом */}
				<div className='flex items-center justify-center gap-3'>
					<img
						src='./main_logo.png'
						alt='main_logo'
						className='w-40 object-contain'
						loading='eager'
					/>
				</div>

				{/* Основной контент */}
				<div className='bg-[var(--tg-theme-bg-color)] flex-1 rounded-t-3xl px-4 pt-6 '>
					{/* Заголовок тир-листа и логотип */}
					<div className='flex items-center justify-center gap-2 mb-6'>
						<div className='flex items-center gap-2'>
							{selectedClub &&
								getDisplayClubName(selectedClub.name) === selectedClub.name && (
									<img
										src={getProxyImageUrl(selectedClub.img_url)}
										alt={selectedClub.name}
										className='w-10 object-contain rounded-full bg-white'
										loading='eager'
										onError={e => {
											// Если логотип не загрузился, скрываем изображение
											const target = e.target as HTMLImageElement
											target.style.display = 'none'
										}}
									/>
								)}
							<span className='text-[clamp(1.5rem,2.5vw,3rem)] font-bold text-center'>
								{selectedClub
									? getDisplayClubName(selectedClub.name)
									: 'Загрузка...'}
							</span>
						</div>
					</div>

					{/* Список категорий */}
					<ul className='category_list flex flex-col gap-3 mb-4'>
						{categories.map(category => {
							const players = displayData[category.name] || []
							return (
								<CategoryItem
									key={`category-${category.name}`}
									category={category}
									players={players}
									showPlayerImages={true}
									showSkeletons={true}
									isEditMode={isEditingPositions}
									selectedPlayers={selectedPlayers}
									onPlayerClick={handlePlayerClick}
								/>
							)
						})}
					</ul>

					{/* Информация о платформе (только для разработки) */}
					{import.meta.env.DEV && isAdmin && (
						<div className='text-xs text-gray-500 mb-4'>
							<p>Платформа: {platform}</p>
							<p>
								Доступные методы:{' '}
								{availableMethods
									.filter(m => m.available)
									.map(m => m.name)
									.join(', ')}
							</p>
						</div>
					)}

					{/* Кнопки управления */}
					<div className='flex flex-col items-center justify-center gap-2'>
						{isEditingPositions ? (
							<>
								{/* Режим редактирования позиций */}
								{selectedPlayers.length === 2 && (
									<button
										className='bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-lg w-fit'
										onClick={handleSwapPlayers}
									>
										Поменять местами
									</button>
								)}

								<div className='text-sm text-center mb-2'>
									<div className='mt-1'>
										{selectedPlayers.length === 0
											? 'Выбери кого ты хочешь заменить'
											: selectedPlayers.length === 1
											? 'На кого меняем?'
											: ''}
									</div>
								</div>

								<button
									className='bg-[#FFEC13] text-black font-bold py-3 px-8 rounded-lg text-lg w-fit hover:bg-yellow-300 transition-colors'
									onClick={handleSavePositions}
								>
									Сохранить
								</button>

								<button
									className='bg-gray-500 text-white font-bold py-2 px-6 rounded-lg text-base w-fit hover:bg-gray-600 transition-colors'
									onClick={handleExitEditMode}
								>
									Отменить
								</button>
							</>
						) : !hasCompletedInitialStep ? (
							<>
								{/* Начальное состояние */}
								<button
									className='bg-[#EC3381] text-white font-bold py-3 px-8 rounded-lg text-lg w-fit transition-colors'
									onClick={handleEnterEditMode}
								>
									Поменять местами
								</button>

								<button
									className='bg-[#FFEC13] text-black font-bold py-3 px-8 rounded-lg text-lg w-fit transition-colors'
									onClick={handleContinue}
								>
									Продолжить
								</button>
							</>
						) : (
							<>
								{/* Завершенное состояние */}
								<button
									className={`font-bold py-3 px-8 rounded-lg text-lg w-fit disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
										hasSharedInSession
											? 'bg-gray-300 text-gray-600'
											: userShareStats && !isShareAvailable()
											? 'bg-gray-400 text-gray-700'
											: 'bg-[#FFEC13] text-black'
									}`}
									onClick={handleShare}
									disabled={
										isSharing ||
										hasSharedInSession ||
										(userShareStats ? !isShareAvailable() : false)
									}
								>
									{hasSharedInSession
										? '✅ Отправлено'
										: isSharing
										? platform === 'ios'
											? 'Подготавливаем...'
											: 'Отправляем...'
										: userShareStats && !isShareAvailable()
										? userShareStats.dailyRemaining <= 0
											? 'Лимит исчерпан'
											: userShareStats.nextAvailableAt
											? `Доступно ${formatTimeUntilAvailable(
													userShareStats.nextAvailableAt
											  )}`
											: 'Недоступно'
										: platform === 'ios'
										? 'Поделиться'
										: 'Отправить в чат'}
								</button>

								{/* Кнопка для просмотра рейтинга */}
								{selectedClub && (
									<Link
										to={`/admin/ratings/${selectedClub.id}`}
										state={{ source: 'results' }}
										className={`inline-block bg-[#FFEC13] text-black font-bold py-3 px-8 rounded-lg text-lg w-fit ${
											isSharing
												? 'opacity-50 cursor-not-allowed pointer-events-none'
												: ''
										}`}
									>
										Посмотреть рейтинг
									</Link>
								)}

								<button
									onClick={handleStartNewGame}
									className={`bg-[#FFEC13] text-black font-bold py-3 px-8 rounded-lg text-lg w-fit ${
										isSharing
											? 'opacity-50 cursor-not-allowed pointer-events-none'
											: ''
									}`}
									disabled={isSharing}
								>
									Собрать новый тир-лист
								</button>

								{/* Статус шэринга */}
								{shareStatus && (
									<div
										className={`text-sm px-4 py-2 rounded-lg max-w-xs text-center ${
											shareStatus.startsWith('✅')
												? 'bg-green-100 text-green-800'
												: shareStatus.startsWith('❌')
												? 'bg-red-100 text-red-800'
												: shareStatus.startsWith('🚫')
												? 'bg-orange-100 text-orange-800'
												: 'bg-blue-100 text-blue-800'
										}`}
									>
										{shareStatus}
									</div>
								)}

								{isAdmin && (
									<Link
										to='/admin'
										className={`inline-block bg-[#FFEC13] text-black font-bold py-3 px-8 rounded-lg text-lg w-fit ${
											isSharing
												? 'opacity-50 cursor-not-allowed pointer-events-none'
												: ''
										}`}
									>
										Админ
									</Link>
								)}
							</>
						)}
					</div>
				</div>
			</div>

			{/* Компонент для тестирования шэринга в development режиме */}
			{import.meta.env.DEV && isAdmin && hasGameData && selectedClub && (
				<ShareTestPanel
					onTestShare={getTestShareOptions}
					initData={initData || ''}
				/>
			)}
		</div>
	)
}

export default Results
