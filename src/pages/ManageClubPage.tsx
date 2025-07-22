import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { fetchClubs, deleteClub } from '../api';

interface Club {
	id: string;
	name: string;
	logoUrl: string;
}

const ManageClubPage = () => {
	const { isAdmin, isLoading } = useUserStore();
	const { initData } = useTelegram();
	const navigate = useNavigate();
	const location = useLocation();

	const [clubs, setClubs] = useState<Club[]>([]);
	const [selectedClub, setSelectedClub] = useState<Club | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [isLoadingClubs, setIsLoadingClubs] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isActionLoading, setIsActionLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	// Проверяем права доступа
	useEffect(() => {
		if (!isLoading && !isAdmin) {
			navigate('/');
		}
	}, [isAdmin, isLoading, navigate]);

	// Проверяем сообщения из state при навигации
	useEffect(() => {
		if (location.state?.message) {
			setSuccessMessage(location.state.message);
			// Очищаем сообщение через 3 секунды
			setTimeout(() => setSuccessMessage(null), 3000);
		}
	}, [location.state]);

	// Загружаем список команд
	useEffect(() => {
		const loadClubs = async () => {
			if (!initData) return;

			try {
				setIsLoadingClubs(true);
				const clubsData = await fetchClubs(initData);
				// Преобразуем данные в нужный формат
				const formattedClubs = clubsData.map((club: any) => ({
					id: club.id,
					name: club.name,
					logoUrl: club.img_url || '',
				}));
				setClubs(formattedClubs);
			} catch (err) {
				console.error('Ошибка при загрузке команд:', err);
				setError('Не удалось загрузить команды');
			} finally {
				setIsLoadingClubs(false);
			}
		};

		if (initData) {
			loadClubs();
		}
	}, [initData]);

	const handleClubClick = (club: Club) => {
		setSelectedClub(club);
		setShowModal(true);
	};

	const handleEditClub = () => {
		if (selectedClub) {
			setIsActionLoading(true);
			setShowModal(false);
			navigate(`/admin/edit-club/${selectedClub.id}`, {
				state: { club: selectedClub },
			});
		}
	};

	const handleEditPlayers = () => {
		if (selectedClub) {
			setIsActionLoading(true);
			setShowModal(false);
			navigate(`/admin/edit-players/${selectedClub.id}`, {
				state: { clubName: selectedClub.name },
			});
		}
	};

	const handleDeleteClub = async () => {
		if (!selectedClub || !initData) return;

		if (
			!confirm(`Вы уверены, что хотите удалить команду "${selectedClub.name}"?`)
		) {
			return;
		}

		setIsDeleting(true);
		try {
			await deleteClub(initData, selectedClub.id);

			// Удаляем команду из списка
			setClubs((prev) => prev.filter((club) => club.id !== selectedClub.id));

			setShowModal(false);
			setSelectedClub(null);

			// Показываем сообщение об успехе
			navigate('/admin', {
				state: { message: `Команда "${selectedClub.name}" успешно удалена!` },
			});
		} catch (err) {
			console.error('Ошибка при удалении команды:', err);
			setError(
				err instanceof Error ? err.message : 'Произошла ошибка при удалении',
			);
		} finally {
			setIsDeleting(false);
		}
	};

	if (isLoading || isLoadingClubs) {
		return (
			<div
				className='min-h-screen flex items-center justify-center p-4'
				style={{
					background: 'var(--tg-theme-bg-color)',
					color: 'var(--tg-theme-text-color)',
				}}
			>
				<div className='text-xl font-bold'>Загрузка...</div>
			</div>
		);
	}

	if (!isAdmin) {
		return null;
	}

	// Фильтрация команд по поисковому запросу
	const filteredClubs = clubs.filter((club) =>
		club.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

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
				<div className='flex items-center justify-between mb-8'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => navigate('/admin')}
							className='text-lg transition-opacity hover:opacity-70'
							style={{ color: 'var(--tg-theme-link-color)' }}
						>
							← Назад
						</button>
						<h1 className='text-2xl font-bold'>Команды</h1>
					</div>
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

				{/* Ошибка */}
				{error && (
					<div
						className='mb-6 p-4 rounded-lg border'
						style={{
							background: 'var(--tg-theme-secondary-bg-color)',
							color: 'var(--tg-theme-destructive-text-color, #dc2626)',
							borderColor: 'var(--tg-theme-destructive-text-color, #fca5a5)',
						}}
					>
						{error}
					</div>
				)}

				{/* Поиск команд */}
				{clubs.length > 0 && (
					<div className='mb-6'>
						<input
							type='text'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder='Поиск команд...'
							className='w-full p-3 rounded-lg border'
							style={{
								background: 'var(--tg-theme-secondary-bg-color)',
								borderColor: 'var(--tg-theme-hint-color)',
								color: 'var(--tg-theme-text-color)',
							}}
						/>
					</div>
				)}

				{/* Список команд */}
				<div className='flex-1 mb-8'>
					{filteredClubs.length === 0 && clubs.length > 0 ? (
						<div
							className='text-center mt-8'
							style={{ color: 'var(--tg-theme-hint-color)' }}
						>
							Команды не найдены по запросу "{searchQuery}"
						</div>
					) : clubs.length === 0 ? (
						<div
							className='text-center mt-8'
							style={{ color: 'var(--tg-theme-hint-color)' }}
						>
							Команды не найдены
						</div>
					) : (
						<div className='grid grid-cols-2 gap-4'>
							{filteredClubs.map((club) => (
								<div
									key={club.id}
									onClick={() => handleClubClick(club)}
									className='flex flex-col items-center p-4 rounded-lg cursor-pointer transition-opacity hover:opacity-80'
									style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
								>
									<div
										className='w-16 h-16 mb-2 overflow-hidden rounded-full'
										style={{ background: 'var(--tg-theme-hint-color)' }}
									>
										{club.logoUrl ? (
											<img
												src={club.logoUrl}
												alt={club.name}
												className='w-full h-full object-cover'
											/>
										) : (
											<div
												className='w-full h-full flex items-center justify-center'
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

				{/* Модальное окно опций команды */}
				{showModal && (
					<div
						className='fixed inset-0 flex items-end justify-center z-50'
						style={{ background: 'rgba(0,0,0,0.5)' }}
					>
						<div
							className='rounded-t-3xl p-6 w-full min-h-[300px]'
							style={{
								background: 'var(--tg-theme-bg-color)',
								color: 'var(--tg-theme-text-color)',
							}}
						>
							<div className='flex justify-between items-center mb-6'>
								<h2 className='text-xl font-bold'>{selectedClub?.name}</h2>
								<button
									onClick={() => {
										setShowModal(false);
										setSelectedClub(null);
									}}
									className='text-2xl font-bold transition-opacity hover:opacity-70'
									style={{ color: 'var(--tg-theme-hint-color)' }}
								>
									×
								</button>
							</div>

							<div className='flex flex-col gap-4'>
								<button
									onClick={handleEditClub}
									disabled={isActionLoading}
									className='py-4 rounded-lg text-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50'
									style={{
										background: 'var(--tg-theme-button-color)',
										color: 'var(--tg-theme-button-text-color)',
									}}
								>
									{isActionLoading ? 'Загрузка...' : 'Изменить лого и название'}
								</button>

								<button
									onClick={handleEditPlayers}
									disabled={isActionLoading}
									className='py-4 rounded-lg text-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50'
									style={{
										background: 'var(--tg-theme-button-color)',
										color: 'var(--tg-theme-button-text-color)',
									}}
								>
									{isActionLoading ? 'Загрузка...' : 'Изменить игроков'}
								</button>

								<button
									onClick={handleDeleteClub}
									disabled={isDeleting || isActionLoading}
									className='py-4 rounded-lg text-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50'
									style={{
										background:
											'var(--tg-theme-destructive-text-color, #dc2626)',
										color: 'white',
									}}
								>
									{isDeleting ? 'Удаление...' : 'Удалить команду'}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ManageClubPage;
