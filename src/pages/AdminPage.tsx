import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchClubs } from '../api'
import { LoadingSpinner } from '../components'
import { useTelegram } from '../hooks/useTelegram'
import { useUserStore } from '../store'

const AdminPage = () => {
	const { isAdmin, isLoading } = useUserStore()
	const { initData } = useTelegram()
	const navigate = useNavigate()
	const location = useLocation()
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [cacheClearing, setCacheClearing] = useState(false)
	const [showClubSelectionModal, setShowClubSelectionModal] = useState(false)
	const [clubs, setClubs] = useState<any[]>([])
	const [loadingClubs, setLoadingClubs] = useState(false)

	// Проверяем права доступа
	useEffect(() => {
		if (!isLoading && !isAdmin) {
			navigate('/')
		}
	}, [isAdmin, isLoading, navigate])

	// Проверяем сообщения из state при навигации
	useEffect(() => {
		if (location.state?.message) {
			setSuccessMessage(location.state.message)
			// Очищаем сообщение через 3 секунды
			setTimeout(() => setSuccessMessage(null), 3000)
		}
	}, [location.state])

	// Загружаем список клубов для модалки выбора
	const loadClubs = async () => {
		if (!initData) return

		setLoadingClubs(true)
		try {
			const fetchedClubs = await fetchClubs(initData)
			setClubs(fetchedClubs)
		} catch (error) {
			console.error('Ошибка при загрузке клубов:', error)
		} finally {
			setLoadingClubs(false)
		}
	}

	// Обработчик клика по рейтингам команд
	const handleRatingsClick = () => {
		setShowClubSelectionModal(true)
		if (clubs.length === 0) {
			loadClubs()
		}
	}

	// Обработчик выбора клуба для рейтингов
	const handleClubSelect = (clubId: string) => {
		setShowClubSelectionModal(false)
		navigate(`/admin/ratings/${clubId}`)
	}

	// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Функция принудительной очистки всех кэшей
	const handleClearAllCaches = async () => {
		if (!initData) return

		setCacheClearing(true)
		try {
			// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем правильный URL без дублирования домена
			const apiUrl =
				import.meta.env.VITE_API_URL ||
				'https://server.myach-specialprojects.ru'
			const serverResponse = await fetch(`${apiUrl}/api/admin/cache/all`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `tma ${initData}`,
				},
			})

			// 2. Очищаем Service Worker кэши
			if ('caches' in window) {
				const cacheNames = await caches.keys()
				await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
			}

			// 3. Принудительно перезагружаем страницу с очисткой кэша
			if (serverResponse.ok) {
				setSuccessMessage('Все кэши очищены! Страница будет перезагружена...')
				setTimeout(() => {
					window.location.href = window.location.href + '?nocache=' + Date.now()
				}, 1000)
			} else {
				const errorText = await serverResponse.text()
				console.error('Server response error:', errorText)
				throw new Error(
					`Ошибка очистки серверного кэша: ${serverResponse.status}`
				)
			}
		} catch (error) {
			console.error('Ошибка при очистке кэшей:', error)
			setSuccessMessage('Ошибка при очистке кэшей. Попробуйте еще раз.')
			setTimeout(() => setSuccessMessage(null), 3000)
		} finally {
			setCacheClearing(false)
		}
	}

	if (isLoading) {
		return <LoadingSpinner fullScreen message='Проверка прав доступа...' />
	}

	if (!isAdmin) {
		return null
	}

	return (
		<div
			className='min-h-screen p-4'
			style={{
				background: 'var(--tg-theme-bg-color)',
				color: 'var(--tg-theme-text-color)',
			}}
		>
			<div className='max-w-4xl mx-auto'>
				{/* Заголовок */}
				<div className='flex items-center justify-center mb-8'>
					<h1 className='text-2xl font-bold text-center'>
						Панель администратора
					</h1>
				</div>

				{/* Уведомление об успехе */}
				{successMessage && (
					<div
						className='mb-6 p-4 rounded-lg'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						{successMessage}
					</div>
				)}

				{/* КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Кнопка экстренной очистки кэша */}
				<div className='mb-6 p-4 rounded-lg border border-orange-500 bg-orange-50'>
					<h3 className='text-lg font-semibold mb-2 text-orange-700'>
						🚨 Проблемы с синхронизацией данных?
					</h3>
					<p className='text-sm text-orange-600 mb-3'>
						Если пользователи видят старые клубы/игроков после обновления,
						используйте эту кнопку для принудительной очистки всех кэшей:
					</p>
					<button
						onClick={handleClearAllCaches}
						disabled={cacheClearing}
						className='px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50'
						style={{
							background: '#dc2626',
							color: 'white',
						}}
					>
						{cacheClearing
							? '🔄 Очистка кэшей...'
							: '🗑️ Принудительная очистка всех кэшей'}
					</button>
				</div>

				{/* Сетка кнопок */}
				<div className='grid grid-cols-1 gap-4 max-w-2xl mx-auto'>
					<Link
						to='/admin/add-club'
						className='flex items-center justify-center p-4 rounded-lg font-medium text-center transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						<span className='text-lg'>➕ Добавить команду</span>
					</Link>

					<Link
						to='/admin/manage-club'
						className='flex items-center justify-center p-4 rounded-lg font-medium text-center transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						<span className='text-lg'>✏️ Изменить команду</span>
					</Link>

					<Link
						to='/admin/manage-admins'
						className='flex items-center justify-center p-4 rounded-lg font-medium text-center transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						<span className='text-lg'>👥 Управление админами</span>
					</Link>

					<Link
						to='/admin/analytics'
						className='flex items-center justify-center p-4 rounded-lg font-medium text-center transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						<span className='text-lg'>📊 Аналитика</span>
					</Link>

					<Link
						to='#'
						onClick={handleRatingsClick}
						className='flex items-center justify-center p-4 rounded-lg font-medium text-center transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						<span className='text-lg'>🏆 Рейтинги команд</span>
					</Link>

					<Link
						to='/guide'
						className='flex items-center justify-center p-4 rounded-lg font-medium text-center transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						<span className='text-lg'>🎮 Играть</span>
					</Link>
				</div>
			</div>

			{/* Модалка выбора клуба для рейтингов */}
			{showClubSelectionModal && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
					<div
						className='bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto'
						style={{
							background: 'var(--tg-theme-bg-color)',
							color: 'var(--tg-theme-text-color)',
						}}
					>
						<div className='p-6'>
							<h3 className='text-xl font-bold mb-4'>Выберите команду</h3>

							{loadingClubs ? (
								<div className='flex items-center justify-center py-8'>
									<LoadingSpinner message='Загрузка команд...' />
								</div>
							) : clubs.length === 0 ? (
								<div className='text-center py-8'>
									<p className='mb-4'>Команды не найдены</p>
									<button
										onClick={() => setShowClubSelectionModal(false)}
										className='px-4 py-2 rounded-lg'
										style={{
											background: 'var(--tg-theme-button-color)',
											color: 'var(--tg-theme-button-text-color)',
										}}
									>
										Закрыть
									</button>
								</div>
							) : (
								<>
									<div className='space-y-2 mb-4'>
										{clubs.map(club => (
											<button
												key={club.id}
												onClick={() => handleClubSelect(club.id)}
												className='w-full p-3 rounded-lg text-left transition-opacity hover:opacity-80'
												style={{
													background: 'var(--tg-theme-button-color)',
													color: 'var(--tg-theme-button-text-color)',
												}}
											>
												<div className='flex items-center gap-3'>
													{club.img_url && (
														<img
															src={club.img_url}
															alt={club.name}
															className='w-8 h-8 rounded-full object-cover'
														/>
													)}
													<span>{club.name}</span>
												</div>
											</button>
										))}
									</div>

									<button
										onClick={() => setShowClubSelectionModal(false)}
										className='w-full px-4 py-2 rounded-lg border'
										style={{
											borderColor: 'var(--tg-theme-button-color)',
											color: 'var(--tg-theme-button-color)',
										}}
									>
										Отмена
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminPage
