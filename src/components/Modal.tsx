import React from 'react';
import type { ModalProps } from '../types';
import { createPlayerSkeleton } from '../utils/imageUtils';

const Modal = React.memo<ModalProps>(
	({
		isOpen,
		mode,
		message,
		categoryName,
		players = [],
		onClose,
		onReplacePlayer,
		onChooseOtherCategory,
	}) => {
		if (!isOpen) return null;

		const handleReplacePlayer = (player: any) => {
			onReplacePlayer?.(player);
			onClose();
		};

		const handleChooseOtherCategory = () => {
			onChooseOtherCategory?.();
			onClose();
		};

		if (mode === 'replace_player') {
			return (
				<div className='fixed container inset-0 flex items-center z-50 bg-black/50'>
					<div className='bg-[var(--tg-theme-bg-color)] border-2 rounded-[clamp(1rem,2vh,2rem)] border-[var(--tg-theme-text-color)] p-6 w-full max-h-[80vh] overflow-y-auto'>
						<h3 className='text-center text-[clamp(1rem,4vw,1.5rem)] font-semibold'>
							В категории "{categoryName?.toUpperCase()}" больше нет мест!
						</h3>
						<p className='text-center my-4 text-[clamp(0.9rem,3vw,1.2rem)]'>
							Выберите на кого заменить:
						</p>

						{/* Сетка игроков */}
						<div className='grid grid-cols-3 gap-3'>
							{players.map((player) => (
								<button
									key={player.id}
									onClick={() => handleReplacePlayer(player)}
									className='flex flex-col items-center rounded-lg'
								>
									<div className='w-12 h-16 overflow-hidden rounded-lg mb-2'>
										<img
											src={player.img_url}
											alt={player.name}
											className='w-full h-full object-cover'
											onError={(e) => {
												// Если изображение не загрузилось, показываем скелетон
												const target = e.target as HTMLImageElement;
												target.onerror = null;
												target.src = createPlayerSkeleton();
											}}
										/>
									</div>
									<span className='text-xs text-center truncate w-full'>
										{player.name}
									</span>
								</button>
							))}
						</div>

						<div className='flex flex-col mt-4'>
							<button
								onClick={handleChooseOtherCategory}
								className='link_btn border-1 border-[#EC3381] text-[#EC3381] py-[clamp(1rem,1vw,1rem)] text-[clamp(1rem,2vh,1.5rem)]'
							>
								Выбрать другую категорию
							</button>
						</div>
					</div>
				</div>
			);
		}

		// Режим обычного сообщения
		return (
			<div className='fixed inset-0 flex items-end z-50 bg-black/50'>
				<div className='bg-white rounded-lg p-6 w-full'>
					<p className='text-center mb-6 text-[clamp(1rem,4vw,1.5rem)]'>
						{message}
					</p>
					<div className='flex justify-center'>
						<button
							onClick={onClose}
							className='link_btn bg-[#EC3381] border-1 border-[#EC3381] text-white py-[clamp(1rem,1vw,1rem)] text-[clamp(1rem,2vh,1.5rem)] px-8'
						>
							ОК
						</button>
					</div>
				</div>
			</div>
		);
	},
);

Modal.displayName = 'Modal';

export default Modal;
