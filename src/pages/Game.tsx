import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore, useModalStore } from '../store';
import { Modal, CategoryItem, LoadingSpinner } from '../components';
import { useTelegram } from '../hooks/useTelegram';
import { startGameSession } from '../api/analyticsService';
import { securityUtils } from '../utils/securityUtils';

const Game = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { initData } = useTelegram();
	const [club, setClub] = React.useState<any>(null);
	const [loadingClub, setLoadingClub] = React.useState(true);

	// Zustand stores
	const {
		categorizedPlayers,
		progressPercentage,
		processedPlayersCount,
		addPlayerToCategory,
		replacePlayerInCategory,
		getCurrentPlayer,
		initializeGame,
		categories,
		isLoading,
		error,
		maxPlayersToProcess,
		canGoBack,
		goBackToPreviousPlayer,
	} = useGameStore();

	const {
		isOpen,
		mode,
		message,
		categoryName,
		players: modalPlayers,
		showMessageModal,
		showReplacePlayerModal,
		closeModal,
	} = useModalStore();

	// Добавляем мемоизацию для оптимизации производительности
	const memoizedCategories = useMemo(() => categories, [categories]);

	// Загрузка клуба и инициализация игры при загрузке компонента
	React.useEffect(() => {
		const loadData = async () => {
			if (!initData) {
				showMessageModal('Данные Telegram не найдены');
				setLoadingClub(false);
				return;
			}

			// Получаем выбранную команду из navigation state
			const selectedClub = location.state?.selectedClub;
			if (!selectedClub) {
				// Добавляем небольшую задержку, чтобы дать время для навигации
				setTimeout(() => {
					if (!location.state?.selectedClub) {
						showMessageModal('Команда не выбрана');
						navigate('/select-team');
					}
				}, 100);
				setLoadingClub(false);
				return;
			}

			try {
				// Устанавливаем команду
				setClub(selectedClub);

				// Загружаем данные игры для выбранной команды
				await initializeGame(initData, selectedClub.id);

				// Логируем начало игровой сессии
				startGameSession(initData, selectedClub.id).catch((error) => {
					console.error('Ошибка при логировании начала игры:', error);
				});
			} catch (err) {
				console.error('Ошибка при загрузке данных:', err);
				showMessageModal(
					'Ошибка при загрузке данных. Пожалуйста, обновите страницу.',
				);
			} finally {
				setLoadingClub(false);
			}
		};

		loadData();
	}, [initializeGame, showMessageModal, initData, location.state, navigate]);

	// Улучшаем обработчик клика по категории
	const handleCategoryClick = (categoryName: string) => {
		try {
			// Проверяем на бота
			securityUtils.botDetection.track();

			const result = addPlayerToCategory(categoryName);

			switch (result) {
				case 'category_not_found':
					showMessageModal('Категория не найдена!');
					break;
				case 'category_full':
					// Показываем модалку с заменой игроков
					const categoryPlayers = categorizedPlayers[categoryName] || [];
					showReplacePlayerModal(categoryName, categoryPlayers);
					break;
				case 'player_not_found':
					showMessageModal('Игрок не найден!');
					break;
				case 'game_finished':
					// Игра закончена - перенаправляем на страницу результатов
					navigate('/results');
					break;
				case 'success':
					// Игрок успешно добавлен, продолжаем игру
					break;
			}
		} catch (error) {
			showMessageModal((error as Error).message);
		}
	};

	// Обработчик замены игрока
	const handleReplacePlayer = (playerToReplace: any) => {
		if (categoryName) {
			const result = replacePlayerInCategory(categoryName, playerToReplace);

			// Проверяем завершение игры после замены
			if (result === 'game_finished') {
				navigate('/results');
			}
		}
	};

	// Обработчик выбора другой категории
	const handleChooseOtherCategory = () => {
		// Просто закрываем модалку и позволяем выбрать другую категорию
		closeModal();
	};

	// Обработчик возврата к предыдущему игроку
	const handleGoBack = () => {
		const success = goBackToPreviousPlayer();
		if (!success) {
			showMessageModal('Не удалось вернуться к предыдущему игроку');
		}
	};

	const player = getCurrentPlayer();

	// Показываем загрузку, если данные еще не получены
	if (isLoading || loadingClub) {
		return <LoadingSpinner fullScreen message='Загрузка игры...' />;
	}

	// Показываем ошибку, если что-то пошло не так
	if (error || !club) {
		return (
			<div className='container flex flex-col items-center justify-center h-full'>
				<div className='text-2xl font-bold text-red-500'>
					Произошла ошибка при загрузке данных
				</div>
				<button
					className='mt-4 px-4 py-2 bg-blue-500 rounded'
					onClick={() => window.location.reload()}
				>
					Обновить страницу
				</button>
			</div>
		);
	}

	return (
		<div className='container flex flex-col justify-around h-full'>
			<Modal
				isOpen={isOpen}
				mode={mode}
				message={message}
				categoryName={categoryName}
				players={modalPlayers}
				onClose={closeModal}
				onReplacePlayer={handleReplacePlayer}
				onChooseOtherCategory={handleChooseOtherCategory}
			/>

			<div className='progress_bar flex flex-col'>
				<div className='w-full h-2.5 bg-gray-300 rounded-lg flex relative'>
					<div
						className='h-full bg-[linear-gradient(90deg,_#EC3381_10%,_#FFEC13_100%)] rounded-lg'
						style={{ width: `${progressPercentage}%` }}
					/>
					<img
						src='./progress.png'
						alt='progress logo'
						className='absolute top-1/2 -translate-y-1/2 w-8 z-10 rounded-full'
						style={{ left: `calc(${progressPercentage}% - 16px)` }}
					/>
				</div>
				<div className='text-right text-[clamp(1rem,2vw,2rem)] font-[500] mt-2'>
					{processedPlayersCount} / {maxPlayersToProcess}
				</div>
			</div>

			<div className='hero flex flex-col items-center gap-4 relative'>
				{/* Кнопка возврата назад */}
				{canGoBack && (
					<button
						className='absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 z-10'
						style={{ background: '#EC3381' }}
						onClick={handleGoBack}
						title='Вернуться на один шаг назад'
					>
						<svg
							width='24'
							height='24'
							viewBox='0 0 40 40'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path
								d='M22.75 27.5L15.25 20L22.75 12.5'
								stroke='white'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</button>
				)}

				{player?.img_url && (
					<>
						<h3 className='text-[clamp(1rem,5vw,3rem)] font-[500]'>
							{player.name}
						</h3>
						<div className='w-[clamp(8rem,40vw,16rem)] h-[clamp(10rem,50vw,20rem)] overflow-hidden rounded-[2rem]'>
							<img
								src={player.img_url}
								alt='player'
								className='w-full h-full object-cover'
							/>
						</div>
					</>
				)}
			</div>

			<ul className='category_list text-center flex flex-col gap-2'>
				{memoizedCategories.map((category) => (
					<CategoryItem
						key={`category-${category.name}`}
						category={category}
						players={categorizedPlayers[category.name] || []}
						onClick={() => handleCategoryClick(category.name)}
					/>
				))}
			</ul>
		</div>
	);
};

export default Game;
