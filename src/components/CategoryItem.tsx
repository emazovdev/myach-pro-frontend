import React from 'react';
import type { Category, Player } from '../types';
import {
	createPlayerSkeleton,
	getProxyImageUrl,
	createPlayerPlaceholder,
} from '../utils/imageUtils';

interface CategoryItemProps {
	category: Category;
	players?: Player[];
	onClick?: () => void;
	showPlayerImages?: boolean;
	showSkeletons?: boolean; // Новый пропс для показа скелетонов
}

const CategoryItem = React.memo<CategoryItemProps>(
	({
		category,
		players = [],
		onClick,
		showPlayerImages = false,
		showSkeletons = false,
	}) => {
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
						{players.map((player) => (
							<li
								className='player_item flex items-center justify-center w-[clamp(2.5rem,4vw,3.5rem)] overflow-hidden'
								key={`slot-${player.id}`}
							>
								<img
									src={getProxyImageUrl(player.img_url)}
									alt={player.name}
									className='w-full h-full object-cover rounded-[7px]'
									loading='eager'
									onError={(e) => {
										// Если изображение не загрузилось, показываем плейсхолдер с именем игрока
										const target = e.target as HTMLImageElement;
										target.onerror = null; // Предотвращаем бесконечную рекурсию
										target.src = createPlayerPlaceholder(player.name);
									}}
								/>
							</li>
						))}

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
								),
							)}
					</ul>
				</li>
			);
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
		);
	},
);

CategoryItem.displayName = 'CategoryItem';

export default CategoryItem;
