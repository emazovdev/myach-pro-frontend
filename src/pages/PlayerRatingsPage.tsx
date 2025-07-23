import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	getPlayerRatings,
	type ClubRatingsResponse,
} from '../api/statisticsService'
import { LoadingSpinner } from '../components'
import { useTelegram } from '../hooks/useTelegram'
import { useUserStore } from '../store'
import { getProxyImageUrl } from '../utils/imageUtils'

const PlayerRatingsPage = () => {
	const { clubId } = useParams<{ clubId: string }>()
	const navigate = useNavigate()
	const { initData } = useTelegram()
	const { isAdmin } = useUserStore()
	const [ratings, setRatings] = useState<ClubRatingsResponse | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const loadRatings = async () => {
			if (!initData || !clubId) {
				setError('Данные для загрузки рейтингов отсутствуют')
				setIsLoading(false)
				return
			}

			try {
				const data = await getPlayerRatings(initData, clubId)
				setRatings(data)
			} catch (err) {
				console.error('Ошибка при загрузке рейтингов:', err)
				setError('Ошибка при загрузке рейтингов игроков')
			} finally {
				setIsLoading(false)
			}
		}

		loadRatings()
	}, [initData, clubId])

	// Категории в нужном порядке (поддерживаем и старые и новые)
	const categoryOrder = ['goat', 'Хорош', 'норм', 'Бездарь', 'Бездна']
	const categoryColors: { [key: string]: string } = {
		goat: '#0EA94B',
		Хорош: '#94CC7A',
		норм: '#E6A324',
		Бездарь: '#E13826',
		Бездна: '#E13826', // Тот же цвет что и у "Бездарь"
	}

	if (isLoading) {
		return <LoadingSpinner fullScreen message='Загрузка рейтингов...' />
	}

	if (error || !ratings) {
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
						{error || 'Произошла ошибка при загрузке рейтингов'}
					</h2>
					<button
						className='py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
						onClick={() => navigate(isAdmin ? '/admin' : '/results')}
					>
						{isAdmin ? 'Вернуться в админ панель' : 'Вернуться к результатам'}
					</button>
				</div>
			</div>
		)
	}

	// Проверяем есть ли вообще данные о рейтингах
	const hasAnyRatings = Object.keys(ratings.ratingsByCategory).length > 0

	if (!hasAnyRatings) {
		return (
			<div
				className='min-h-screen flex flex-col items-center justify-center p-4'
				style={{
					background: 'var(--tg-theme-bg-color)',
					color: 'var(--tg-theme-text-color)',
				}}
			>
				<div className='text-center max-w-md'>
					<h2 className='text-2xl font-bold mb-4'>Нет данных о рейтингах</h2>
					<p className='text-lg mb-6'>
						Рейтинги будут доступны после того, как игроки пройдут игру.
					</p>
					<button
						className='py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
						onClick={() => navigate(isAdmin ? '/admin' : '/results')}
					>
						{isAdmin ? 'Вернуться в админ панель' : 'Вернуться к результатам'}
					</button>
				</div>
			</div>
		)
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
				<div className='flex items-center justify-around mb-6'>
					<button
						onClick={() => navigate(isAdmin ? '/admin' : '/results')}
						className='px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
					>
						← Назад
					</button>

					<div>
						<p className='text-lg opacity-80'>{ratings.club.name}</p>
					</div>
				</div>

				{/* Рейтинги по категориям */}
				<div className='space-y-6'>
					{categoryOrder.map(categoryName => {
						const categoryRatings = ratings.ratingsByCategory[categoryName]

						if (!categoryRatings || categoryRatings.length === 0) {
							return null // Не показываем категории без данных
						}

						// Фильтруем игроков с процентом больше 0
						const playersWithStats = categoryRatings.filter(
							rating => rating.hitPercentage > 0
						)

						// Не показываем категорию если нет игроков с попаданиями
						if (playersWithStats.length === 0) {
							return null
						}

						return (
							<div
								key={categoryName}
								className='bg-white rounded-lg shadow-lg overflow-hidden'
							>
								{/* Заголовок категории */}
								<div
									className='p-4 text-white font-bold text-xl'
									style={{ backgroundColor: categoryColors[categoryName] }}
								>
									{categoryName.toUpperCase()}
								</div>

								{/* Список игроков */}
								<div className='p-4'>
									<div className='space-y-3'>
										{playersWithStats.map((rating, index) => (
											<div
												key={rating.playerId}
												className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
											>
												<div className='flex items-center gap-3'>
													{/* Позиция */}
													<div
														className='w-8 h-8 rounded-full flex items-center justify-center font-bold text-white'
														style={{
															backgroundColor: categoryColors[categoryName],
														}}
													>
														{index + 1}
													</div>

													{/* Аватар игрока */}
													{rating.playerAvatar && (
														<img
															src={getProxyImageUrl(rating.playerAvatar)}
															alt={rating.playerName}
															className='w-10 h-10 rounded-full object-cover'
															onError={e => {
																const target = e.target as HTMLImageElement
																target.style.display = 'none'
															}}
														/>
													)}

													{/* Имя игрока */}
													<span className='font-medium text-gray-900'>
														{rating.playerName}
													</span>
												</div>

												{/* Статистика */}
												<div className='text-right'>
													<div className='font-bold text-lg text-gray-900'>
														{rating.hitPercentage.toFixed(1)}%
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						)
					})}
				</div>

				{/* Информация о рейтингах */}
				{/* <div className='mt-8 p-4 bg-blue-50 rounded-lg'>
					<h3 className='font-bold text-blue-900 mb-2'>
						Как работают рейтинги:
					</h3>
					<ul className='text-sm text-blue-800 space-y-1'>
						<li>
							• Процент показывает, как часто игрок попадает в эту категорию
						</li>
						<li>• Данные обновляются после каждой завершенной игры</li>
						<li>• Рейтинг сортируется по проценту попадания в категорию</li>
					</ul>
				</div> */}
			</div>
		</div>
	)
}

export default PlayerRatingsPage
