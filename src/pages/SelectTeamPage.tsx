import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { fetchClubs } from '../api';
import { LoadingSpinner } from '../components';
import type { Club } from '../types';

const SelectTeamPage = () => {
	const navigate = useNavigate();
	const { initData } = useTelegram();

	const [clubs, setClubs] = useState<Club[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadClubs = async () => {
			if (!initData) {
				setError('Данные Telegram не найдены');
				setIsLoading(false);
				return;
			}

			try {
				const clubsData = await fetchClubs(initData);
				setClubs(clubsData);
			} catch (err) {
				console.error('Ошибка при загрузке команд:', err);
				setError('Не удалось загрузить команды');
			} finally {
				setIsLoading(false);
			}
		};

		loadClubs();
	}, [initData]);

	const handleTeamSelect = (club: Club) => {
		// Переходим в игру с выбранной командой
		navigate('/game', {
			state: {
				selectedClub: club,
			},
		});
	};

	if (isLoading) {
		return <LoadingSpinner fullScreen message='Загрузка команд...' />;
	}

	if (error || clubs.length === 0) {
		return (
			<div
				className='min-h-screen flex flex-col items-center justify-center p-4'
				style={{
					background: 'var(--tg-theme-bg-color)',
					color: 'var(--tg-theme-text-color)',
				}}
			>
				<div className='text-2xl font-bold text-center mb-4'>
					{error || 'Команды не найдены'}
				</div>
				<button
					onClick={() => navigate('/guide')}
					className='py-3 px-6 rounded-lg transition-opacity hover:opacity-80'
					style={{
						background: 'var(--tg-theme-button-color)',
						color: 'var(--tg-theme-button-text-color)',
					}}
				>
					Назад
				</button>
			</div>
		);
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
				{/* Заголовок с кнопкой назад */}
				<div className='flex items-center justify-between mb-8'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => navigate('/guide')}
							className='text-lg transition-opacity hover:opacity-70'
							style={{ color: 'var(--tg-theme-link-color)' }}
						>
							← Назад
						</button>
						<h1 className='text-2xl font-bold'>Выберите команду</h1>
					</div>
				</div>

				{/* Список команд */}
				<div className='flex-1 mb-8'>
					{clubs.length === 1 && clubs[0] ? (
						/* Если команда одна - показываем её по центру */
						<div className='flex justify-center items-center'>
							<div
								onClick={() => handleTeamSelect(clubs[0]!)}
								className='flex flex-col items-center p-6 rounded-lg cursor-pointer transition-opacity hover:opacity-80 min-w-[200px]'
								style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
							>
								<div
									className='w-24 h-24 mb-4 overflow-hidden rounded-full'
									style={{ background: 'var(--tg-theme-hint-color)' }}
								>
									{clubs[0]!.img_url ? (
										<img
											src={clubs[0]!.img_url}
											alt={clubs[0]!.name}
											className='w-full h-full object-cover'
										/>
									) : (
										<div
											className='w-full h-full flex items-center justify-center text-2xl font-bold'
											style={{ color: 'var(--tg-theme-bg-color)' }}
										>
											?
										</div>
									)}
								</div>
								<span className='text-lg text-center font-bold'>
									{clubs[0]!.name}
								</span>
							</div>
						</div>
					) : (
						/* Если команд много - показываем сетку */
						<div className='grid grid-cols-2 gap-4'>
							{clubs.map((club) => (
								<div
									key={club.id}
									onClick={() => handleTeamSelect(club)}
									className='flex flex-col items-center p-4 rounded-lg cursor-pointer transition-opacity hover:opacity-80'
									style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
								>
									<div
										className='w-16 h-16 mb-2 overflow-hidden rounded-full'
										style={{ background: 'var(--tg-theme-hint-color)' }}
									>
										{club.img_url ? (
											<img
												src={club.img_url}
												alt={club.name}
												className='w-full h-full object-cover'
											/>
										) : (
											<div
												className='w-full h-full flex items-center justify-center text-xl font-bold'
												style={{ color: 'var(--tg-theme-bg-color)' }}
											>
												?
											</div>
										)}
									</div>
									<span className='text-sm text-center font-medium'>
										{club.name}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SelectTeamPage;
