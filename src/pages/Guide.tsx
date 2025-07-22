import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../store';
import { navigateToGame } from '../utils/navigation';
import { fetchClubs } from '../api';

const players = Array.from({ length: 20 }, (_, i) => i + 1);

const categories = [
	{ name: 'goat', color: '#0EA94B', slots: 2 },
	{ name: 'Хорош', color: '#94CC7A', slots: 6 },
	{ name: 'норм', color: '#E6A324', slots: 6 },
	{ name: 'Бездарь', color: '#E13826', slots: 6 },
];

const Guide = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [showNoClubsMessage, setShowNoClubsMessage] = useState(false);
	const navigate = useNavigate();
	const { initData } = useTelegram();
	const { isAdmin } = useUserStore();

	const handleStartGame = async () => {
		if (!initData) {
			console.error('Данные Telegram не найдены');
			return;
		}

		setIsLoading(true);
		try {
			// Проверяем наличие команд перед переходом к игре
			const clubs = await fetchClubs(initData);

			if (clubs.length === 0) {
				// Показываем сообщение об отсутствии команд
				setShowNoClubsMessage(true);
				return;
			}

			// Если команды есть, переходим к игре
			await navigateToGame(initData, navigate);
		} catch (error) {
			console.error('Ошибка при загрузке команд:', error);
			// Показываем общее сообщение об ошибке
			setShowNoClubsMessage(true);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoToAdmin = () => {
		navigate('/admin');
	};

	const handleCreateFirstClub = () => {
		navigate('/admin/add-club');
	};

	return (
		<div className='container flex flex-col justify-around h-full'>
			<div className='guide_item'>
				<h2 className='text-[clamp(2rem,7vw,3rem)] text-center font-bold mb-4'>
					В игре 20 клубов
				</h2>
				<div className='player_list grid grid-cols-10 gap-1'>
					{players.map((num) => (
						<div
							className='player_item flex items-center justify-center text-[clamp(1.5rem,4vw,2.5rem)] font-bold rounded-lg'
							style={{
								background: '#FFEC13',
								color: '#EC3381',
							}}
							key={`player-${num}`}
						>
							<p>{num}</p>
						</div>
					))}
				</div>
			</div>
			<div className='guide_item'>
				<h2 className='text-[clamp(2rem,7vw,3rem)] text-center font-bold mb-4'>
					Распределить их по категориям
				</h2>
				<ul className='category_list text-center flex flex-col gap-2'>
					{categories.map((category) => (
						<li
							key={`category-${category.name}`}
							className='category_item text-[clamp(1.5rem,4vw,2rem)] font-bold rounded-lg text-white uppercase py-[clamp(0.5rem,1.5vh,1.5rem)]'
							style={{
								backgroundColor: category.color,
							}}
						>
							<p>{category.name}</p>
						</li>
					))}
				</ul>
			</div>

			<div className='guide_btns flex gap-3 items-center'>
				{isAdmin && (
					<button
						onClick={handleGoToAdmin}
						className='link_btn text-[clamp(1rem,2vh,1.5rem)] py-[clamp(0.5rem,2vh,1rem)] border-2 transition-opacity hover:opacity-80'
						style={{
							color: '#EC3381',
							borderColor: '#EC3381',
							background: 'transparent',
						}}
					>
						Админ
					</button>
				)}
				<button
					onClick={handleStartGame}
					disabled={isLoading}
					className='link_btn text-[clamp(1rem,2vh,1.5rem)] py-[clamp(0.5rem,2vh,1rem)] border-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-80'
					style={{
						background: '#EC3381',
						color: '#fff',
						borderColor: '#EC3381',
					}}
				>
					{isLoading ? 'Загрузка...' : 'Начать игру'}
				</button>
			</div>

			{/* Модальное окно при отсутствии команд */}
			{showNoClubsMessage && (
				<div
					className='fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4'
					style={{
						background: 'url("./main_bg.jpg") no-repeat center center',
						backgroundSize: 'cover',
					}}
					onClick={() => setShowNoClubsMessage(false)}
				>
					<div
						className='rounded-lg p-6 max-w-sm w-full'
						style={{
							background: 'var(--tg-theme-bg-color)',
							color: 'var(--tg-theme-text-color)',
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className='text-xl font-bold mb-4 text-center'>
							Команды не найдены
						</h3>
						<p
							className='text-center mb-6'
							style={{ color: 'var(--tg-theme-hint-color)' }}
						>
							{isAdmin
								? 'Для начала игры необходимо создать хотя бы одну команду с игроками.'
								: 'В системе пока нет команд. Обратитесь к администратору для добавления команд.'}
						</p>

						<div className='flex flex-col gap-3'>
							{isAdmin && (
								<button
									onClick={handleCreateFirstClub}
									className='py-3 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80'
									style={{
										background: 'var(--tg-theme-button-color)',
										color: 'var(--tg-theme-button-text-color)',
									}}
								>
									Создать команду
								</button>
							)}
							<button
								onClick={() => setShowNoClubsMessage(false)}
								className='py-3 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80'
								style={{
									background: 'var(--tg-theme-secondary-bg-color)',
									color: 'var(--tg-theme-text-color)',
								}}
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Guide;
