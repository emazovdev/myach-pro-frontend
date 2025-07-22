import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import {
	fetchClubById,
	createPlayer,
	updatePlayer,
	deletePlayer,
} from '../api';

interface Player {
	id: string;
	name: string;
	avatarUrl?: string;
	image?: File | null;
	imagePreview?: string | null;
	isExisting?: boolean;
}

const EditPlayersPage = () => {
	const { isAdmin, isLoading } = useUserStore();
	const { initData } = useTelegram();
	const navigate = useNavigate();
	const { clubId } = useParams();
	const { state } = useLocation();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [players, setPlayers] = useState<Player[]>([]);
	const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showPlayerForm, setShowPlayerForm] = useState(false);

	// Проверяем права доступа
	useEffect(() => {
		if (!isLoading && !isAdmin) {
			navigate('/');
		}
	}, [isAdmin, isLoading, navigate]);

	// Загружаем существующих игроков команды
	useEffect(() => {
		const loadPlayers = async () => {
			if (!clubId || !initData) return;

			try {
				setIsLoadingPlayers(true);
				const club = await fetchClubById(initData, clubId);

				// Создаем массив из 20 слотов, заполняя существующими игроками
				const playersArray: Player[] = Array.from(
					{ length: 20 },
					(_, index) => {
						const existingPlayer = club.players?.[index];
						if (existingPlayer) {
							return {
								id: existingPlayer.id,
								name: existingPlayer.name,
								avatarUrl: existingPlayer.avatarUrl,
								imagePreview: existingPlayer.avatarUrl,
								isExisting: true,
							};
						}
						return {
							id: `new-player-${index}`,
							name: '',
							image: null,
							imagePreview: null,
							isExisting: false,
						};
					},
				);

				setPlayers(playersArray);
			} catch (err) {
				console.error('Ошибка при загрузке игроков:', err);
				setError('Не удалось загрузить игроков команды');
			} finally {
				setIsLoadingPlayers(false);
			}
		};

		loadPlayers();
	}, [clubId, initData]);

	const handleSlotClick = (index: number) => {
		setSelectedPlayerIndex(index);
		setShowPlayerForm(true);
	};

	const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (selectedPlayerIndex === null) return;

		const file = event.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				setPlayers((prev) =>
					prev.map((player, index) =>
						index === selectedPlayerIndex
							? {
									...player,
									image: file,
									imagePreview: e.target?.result as string,
							  }
							: player,
					),
				);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleNameChange = (name: string) => {
		if (selectedPlayerIndex === null) return;

		setPlayers((prev) =>
			prev.map((player, index) =>
				index === selectedPlayerIndex ? { ...player, name } : player,
			),
		);
	};

	const handleSavePlayer = async () => {
		if (selectedPlayerIndex === null) return;

		const player = players[selectedPlayerIndex];

		if (!player || !player.name.trim()) {
			setError('Введите имя игрока');
			return;
		}

		if (!player.image && !player.avatarUrl) {
			setError('Выберите фото игрока');
			return;
		}

		if (!clubId || !initData) {
			setError('Ошибка данных команды');
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const formData = new FormData();
			formData.append('name', player.name.trim());
			formData.append('clubId', clubId);

			// Добавляем новое фото только если оно было выбрано
			if (player.image) {
				formData.append('avatar', player.image);
			}

			// Проверяем - это обновление существующего игрока или создание нового
			if (
				player.isExisting &&
				player.id &&
				!player.id.startsWith('new-player-')
			) {
				// Обновляем существующего игрока
				await updatePlayer(initData, player.id, formData);
			} else {
				// Создаем нового игрока
				await createPlayer(initData, formData);
			}

			// Обновляем игрока в локальном состоянии без перезагрузки
			if (
				player.isExisting &&
				player.id &&
				!player.id.startsWith('new-player-')
			) {
				// Обновление существующего игрока
				setPlayers((prev) =>
					prev.map((p, index) =>
						index === selectedPlayerIndex
							? {
									...p,
									name: player.name.trim(),
									imagePreview: player.image
										? player.imagePreview
										: p.avatarUrl || null,
									avatarUrl: player.image
										? player.imagePreview || p.avatarUrl
										: p.avatarUrl,
							  }
							: p,
					),
				);
			} else {
				// Добавление нового игрока - перезагружаем только для получения правильного ID
				const club = await fetchClubById(initData, clubId);
				const newPlayer = club.players?.find(
					(p: any) => p.name === player.name.trim(),
				);
				if (newPlayer) {
					setPlayers((prev) =>
						prev.map((p, index) =>
							index === selectedPlayerIndex
								? {
										id: newPlayer.id,
										name: newPlayer.name,
										avatarUrl: newPlayer.avatarUrl,
										imagePreview: newPlayer.avatarUrl,
										isExisting: true,
								  }
								: p,
						),
					);
				}
			}

			setShowPlayerForm(false);
			setSelectedPlayerIndex(null);
		} catch (err) {
			console.error('Ошибка при сохранении игрока:', err);
			setError(err instanceof Error ? err.message : 'Произошла ошибка');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeletePlayer = async () => {
		if (selectedPlayerIndex === null) return;

		const player = players[selectedPlayerIndex];
		if (!player || !player.isExisting || !initData) return;

		if (!confirm(`Вы уверены, что хотите удалить игрока "${player.name}"?`)) {
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			await deletePlayer(initData, player.id);

			// Убираем игрока из списка
			setPlayers((prev) =>
				prev.map((p, index) =>
					index === selectedPlayerIndex
						? {
								id: `new-player-${index}`,
								name: '',
								image: null,
								imagePreview: null,
								isExisting: false,
						  }
						: p,
				),
			);

			setShowPlayerForm(false);
			setSelectedPlayerIndex(null);
		} catch (err) {
			console.error('Ошибка при удалении игрока:', err);
			setError(
				err instanceof Error ? err.message : 'Произошла ошибка при удалении',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleFinish = () => {
		navigate('/admin/manage-club', {
			state: {
				message: `Игроки команды "${
					state?.clubName || 'команды'
				}" успешно обновлены!`,
			},
		});
	};

	if (isLoading || isLoadingPlayers) {
		return (
			<div className='container flex flex-col items-center justify-center h-full'>
				<div className='text-2xl font-bold'>Загрузка...</div>
			</div>
		);
	}

	if (!isAdmin) {
		return null;
	}

	const currentPlayer =
		selectedPlayerIndex !== null ? players[selectedPlayerIndex] : null;

	return (
		<div
			className='min-h-screen p-4'
			style={{
				background: 'var(--tg-theme-bg-color)',
				color: 'var(--tg-theme-text-color)',
			}}
		>
			<div className='max-w-4xl mx-auto'>
				{!showPlayerForm ? (
					<>
						{/* Заголовок с кнопкой назад */}
						<div className='flex items-center justify-between mb-8'>
							<div className='flex items-center gap-4'>
								<button
									onClick={() => navigate('/admin/manage-club')}
									className='text-lg transition-opacity hover:opacity-70'
									style={{ color: 'var(--tg-theme-link-color)' }}
								>
									← Назад
								</button>
								<div>
									<h1 className='text-2xl font-bold'>Изменить игроков</h1>
									{state?.clubName && (
										<span
											className='block text-lg mt-1'
											style={{ color: 'var(--tg-theme-hint-color)' }}
										>
											команды "{state.clubName}"
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Ошибка */}
						{error && (
							<div
								className='mb-4 p-3 border rounded'
								style={{
									background: 'var(--tg-theme-secondary-bg-color)',
									color: 'var(--tg-theme-destructive-text-color, #dc2626)',
									borderColor:
										'var(--tg-theme-destructive-text-color, #fca5a5)',
								}}
							>
								{error}
							</div>
						)}

						{/* Сетка игроков */}
						<div className='grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-4 mb-8'>
							{players.map((player, index) => (
								<div
									key={player.id}
									onClick={() => handleSlotClick(index)}
									className='aspect-square rounded-lg flex flex-col cursor-pointer overflow-hidden transition-opacity hover:opacity-80'
									style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
								>
									<div className='flex-1 flex items-center justify-center overflow-hidden'>
										{player.imagePreview ? (
											<img
												src={player.imagePreview}
												alt={player.name}
												className='w-full h-full object-cover'
											/>
										) : (
											<span
												className='text-2xl mb-1'
												style={{ color: 'var(--tg-theme-hint-color)' }}
											>
												+
											</span>
										)}
									</div>
									<div
										className='text-xs p-1 text-center min-h-[20px] flex items-center justify-center'
										style={{
											background: 'var(--tg-theme-bg-color)',
											color: 'var(--tg-theme-text-color)',
										}}
									>
										<span className='truncate w-full px-1'>
											{player.name || `Игрок ${index + 1}`}
										</span>
									</div>
								</div>
							))}
						</div>

						{/* Кнопка завершения */}
						<button
							onClick={handleFinish}
							className='py-4 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80'
							style={{
								background: 'var(--tg-theme-button-color)',
								color: 'var(--tg-theme-button-text-color)',
							}}
						>
							Готово
						</button>
					</>
				) : (
					<>
						{/* Форма редактирования игрока */}
						<div className='flex items-center justify-between mb-8'>
							<div className='flex items-center gap-4'>
								<button
									onClick={() => {
										setShowPlayerForm(false);
										setSelectedPlayerIndex(null);
										setError(null);
									}}
									className='text-lg transition-opacity hover:opacity-70'
									style={{ color: 'var(--tg-theme-link-color)' }}
								>
									← Назад
								</button>
								<h1 className='text-2xl font-bold'>
									{currentPlayer?.isExisting
										? 'Изменить игрока'
										: 'Добавить игрока'}
								</h1>
							</div>
						</div>

						{/* Сетка игроков (уменьшенная) */}
						<div className='grid grid-cols-5 gap-2 mb-8'>
							{players.slice(0, 5).map((player, index) => (
								<div
									key={player.id}
									className={`aspect-square rounded-lg flex flex-col overflow-hidden transition-opacity ${
										index === selectedPlayerIndex
											? 'ring-2 opacity-100'
											: 'opacity-60 hover:opacity-80'
									}`}
									style={{
										background: 'var(--tg-theme-secondary-bg-color)',
										borderColor:
											index === selectedPlayerIndex
												? 'var(--tg-theme-link-color)'
												: 'transparent',
									}}
								>
									<div className='flex-1 flex items-center justify-center overflow-hidden'>
										{player.imagePreview ? (
											<img
												src={player.imagePreview}
												alt={player.name}
												className='w-full h-full object-cover'
											/>
										) : (
											<span
												className='text-lg'
												style={{ color: 'var(--tg-theme-hint-color)' }}
											>
												+
											</span>
										)}
									</div>
									<div
										className='text-[10px] p-0.5 text-center min-h-[16px] flex items-center justify-center'
										style={{
											background: 'var(--tg-theme-bg-color)',
											color: 'var(--tg-theme-text-color)',
										}}
									>
										<span className='truncate w-full px-0.5'>
											{player.name || `Игрок ${index + 1}`}
										</span>
									</div>
								</div>
							))}
						</div>

						{/* Фото игрока */}
						<div className='flex flex-col items-center mb-8'>
							<div
								onClick={() => fileInputRef.current?.click()}
								className='w-32 h-32 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden transition-opacity hover:opacity-80'
								style={{ background: 'var(--tg-theme-button-color)' }}
							>
								{currentPlayer?.imagePreview ? (
									<img
										src={currentPlayer.imagePreview}
										alt='Превью игрока'
										className='w-full h-full object-cover'
									/>
								) : (
									<span
										className='text-sm text-center'
										style={{ color: 'var(--tg-theme-button-text-color)' }}
									>
										Добавить
										<br />
										фото
									</span>
								)}
							</div>
							<input
								ref={fileInputRef}
								type='file'
								accept='image/*'
								onChange={handleImageSelect}
								className='hidden'
							/>
						</div>

						{/* Поле ввода имени */}
						<div className='mb-8'>
							<input
								type='text'
								value={currentPlayer?.name || ''}
								onChange={(e) => handleNameChange(e.target.value)}
								placeholder='Имя игрока'
								className='w-full p-4 border-b-2 bg-transparent text-lg focus:outline-none transition-colors'
								style={{
									borderColor: 'var(--tg-theme-hint-color)',
									color: 'var(--tg-theme-text-color)',
								}}
								onFocus={(e) =>
									(e.target.style.borderColor = 'var(--tg-theme-link-color)')
								}
								onBlur={(e) =>
									(e.target.style.borderColor = 'var(--tg-theme-hint-color)')
								}
								disabled={isSubmitting}
							/>
						</div>

						{/* Ошибка */}
						{error && (
							<div
								className='mb-4 p-3 border rounded'
								style={{
									background: 'var(--tg-theme-secondary-bg-color)',
									color: 'var(--tg-theme-destructive-text-color, #dc2626)',
									borderColor:
										'var(--tg-theme-destructive-text-color, #fca5a5)',
								}}
							>
								{error}
							</div>
						)}

						{/* Кнопки действий */}
						<div className='flex flex-col gap-3'>
							<button
								onClick={handleSavePlayer}
								disabled={
									isSubmitting ||
									!currentPlayer?.name.trim() ||
									(!currentPlayer?.image && !currentPlayer?.avatarUrl)
								}
								className='py-4 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed'
								style={{
									background: 'var(--tg-theme-button-color)',
									color: 'var(--tg-theme-button-text-color)',
								}}
							>
								{isSubmitting ? 'Сохранение...' : 'Сохранить'}
							</button>

							{currentPlayer?.isExisting && (
								<button
									onClick={handleDeletePlayer}
									disabled={isSubmitting}
									className='py-4 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80 disabled:opacity-50'
									style={{
										background:
											'var(--tg-theme-destructive-text-color, #dc2626)',
										color: 'white',
									}}
								>
									{isSubmitting ? 'Удаление...' : 'Удалить игрока'}
								</button>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default EditPlayersPage;
