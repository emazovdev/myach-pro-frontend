import React from 'react'
import type { Category, Player } from '../types'
import {
	createPlayerPlaceholder,
	createPlayerSkeleton,
	getProxyImageUrl,
} from '../utils/imageUtils'

interface CategoryItemProps {
	category: Category
	players?: Player[]
	onClick?: () => void
	showPlayerImages?: boolean
	showSkeletons?: boolean // Новый пропс для показа скелетонов
	isEditMode?: boolean // Режим редактирования позиций
	selectedPlayers?: Array<{ player: Player; categoryName: string }> // Выбранные игроки
	onPlayerClick?: (player: Player, categoryName: string) => void // Обработчик клика по игроку
}

const CategoryItem = React.memo<CategoryItemProps>(
	({
		category,
		players = [],
		onClick,
		showPlayerImages = false,
		showSkeletons = false,
		isEditMode = false,
		selectedPlayers = [],
		onPlayerClick,
	}) => {
		// Функция для проверки, выбран ли игрок
		const isPlayerSelected = (player: Player) => {
			return selectedPlayers.some(
				sp => sp.player.id === player.id && sp.categoryName === category.name
			)
		}

		if (showPlayerImages) {
			return (
				<li
					className='category_item rounded-[10px] py-[3px] flex pl-[clamp(0.5rem,1vw,1rem)] pr-[3px] justify-between items-center'
					style={{ backgroundColor: category.color }}
				>
					<p className='ml-1 category_name text-[clamp(1rem,4vw,4rem)] font-bold text-white text-left uppercase '>
						{category.name}
					</p>
					<ul className='player_list grid grid-cols-6 gap-1 items-center'>
						{/* Отображаем игроков */}
						{players.map(player => {
							const isSelected = isPlayerSelected(player);
							return (
								<li
									className={`player_item flex items-center justify-center w-[clamp(2.5rem,4vw,3.5rem)] overflow-hidden relative ${
										isEditMode ? 'cursor-pointer' : ''
									}`}
									key={`slot-${player.id}`}
									onClick={isEditMode ? () => onPlayerClick?.(player, category.name) : undefined}
								>
									<img
										src={getProxyImageUrl(player.img_url)}
										alt={player.name}
										className={`w-full h-full object-cover rounded-[7px] transition-all duration-200 ${
											isSelected ? 'ring-4 ring-yellow-400 ring-opacity-80' : ''
										} ${isEditMode ? 'hover:opacity-80' : ''}`}
										loading='eager'
										onError={e => {
											// Если изображение не загрузилось, показываем плейсхолдер с именем игрока
											const target = e.target as HTMLImageElement
											target.onerror = null // Предотвращаем бесконечную рекурсию
											target.src = createPlayerPlaceholder(player.name)
										}}
									/>
									{/* Индикатор выбранного игрока */}
									{isSelected && (
										<div className='absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white transform translate-x-1 -translate-y-1'>
											<div className='w-full h-full bg-yellow-400 rounded-full animate-pulse'></div>
										</div>
									)}
								</li>
							);
						})}

						{/* Отображаем скелетоны для пустых слотов, если включен showSkeletons */}
						{showSkeletons &&
							Array.from({ length: category.slots - players.length }).map(
								(_, index) => (
									<li
										className='player_item flex items-center justify-center rounded-lg w-[clamp(2rem,3.5vw,3rem)] h-[clamp(2.6rem,4.6vw,4rem)] overflow-hidden'
										key={`skeleton-${index}`}
									>
										<img
											src={createPlayerSkeleton()}
											alt='Пустой слот'
											className='w-full h-full object-cover rounded-md opacity-60'
										/>
									</li>
								)
							)}
					</ul>
				</li>
			)
		}

		return (
			<li
				className={`category_item flex justify-center items-center text-[clamp(1.5rem,4vw,2rem)] font-bold rounded-lg text-white uppercase py-[clamp(0.5rem,1.5vh,1.5rem)] ${
					onClick ? 'cursor-pointer' : ''
				}`}
				style={{ backgroundColor: category.color }}
				onClick={onClick}
			>
				<p>{category.name}</p>
				<span className='ml-3 text-[clamp(1rem,4vw,3rem)] font-light'>
					{players.length} / {category.slots}
				</span>
			</li>
		)
	}
)

CategoryItem.displayName = 'CategoryItem'

export default CategoryItem
