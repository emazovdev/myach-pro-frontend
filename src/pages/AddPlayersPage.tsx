import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { createPlayer } from '../api';
import { securityUtils } from '../utils/securityUtils';

interface Player {
	id: string;
	name: string;
	image: File | null;
	imagePreview: string | null;
	isSaved?: boolean; // Флаг для отслеживания сохраненных игроков
}

const AddPlayersPage = () => {
	const { isAdmin, isLoading } = useUserStore();
	const { initData } = useTelegram();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { clubId } = useParams();
	const { state } = useLocation();

	const [players, setPlayers] = useState<Player[]>(
		Array.from({ length: 20 }, (_, i) => ({
			id: `player-${i}`,
			name: '',
			image: null,
			imagePreview: null,
		})),
	);
	const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPlayerForm, setShowPlayerForm] = useState(false);

	// Проверяем права доступа
	useEffect(() => {
		if (!isLoading && !isAdmin) {
			navigate('/');
			return;
		}
	}, [isAdmin, isLoading, navigate]);

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

		if (!player.image) {
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
			// Санитизация имени игрока
			const sanitizedPlayerName = securityUtils.sanitizeInput(player.name);

			const formData = new FormData();
			formData.append('name', sanitizedPlayerName);
			formData.append('avatar', player.image);
			formData.append('clubId', clubId);

			let response;

			// Проверяем, это новый игрок или обновление существующего
			if (player.isSaved && player.id && !player.id.startsWith('player-')) {
				// Обновляем существующего игрока
				const { updatePlayer } = await import('../api');
				response = await updatePlayer(initData, player.id, formData);
			} else {
				// Создаем нового игрока
				response = await createPlayer(initData, formData);
			}

			// Обновляем локальное состояние с реальным ID игрока из базы данных
			if (response && (response.id || response.player?.id)) {
				const playerId = response.id || response.player?.id;
				setPlayers((prev) =>
					prev.map((p, index) =>
						index === selectedPlayerIndex
							? {
									...p,
									id: playerId, // Заменяем временный ID на реальный
									name: sanitizedPlayerName,
									imagePreview: player.imagePreview,
									isSaved: true, // Помечаем как сохраненного
							  }
							: p,
					),
				);
			}

			// Успешно сохранено
			setShowPlayerForm(false);
			setSelectedPlayerIndex(null);
		} catch (err) {
			console.error('Ошибка при создании игрока:', err);
			setError(err instanceof Error ? err.message : 'Произошла ошибка');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeletePlayer = async () => {
		if (selectedPlayerIndex === null) return;

		const player = players[selectedPlayerIndex];
		if (!player || !player.isSaved || !initData) return;

		if (!confirm(`Вы уверены, что хотите удалить игрока "${player.name}"?`)) {
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const { deletePlayer } = await import('../api');
			await deletePlayer(initData, player.id);

			// Убираем игрока из списка (возвращаем в исходное состояние)
			setPlayers((prev) =>
				prev.map((p, index) =>
					index === selectedPlayerIndex
						? {
								id: `player-${index}`,
								name: '',
								image: null,
								imagePreview: null,
								isSaved: false,
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
		navigate('/admin', {
			state: {
				message: `Игроки для команды "${
					state?.clubName || 'команды'
				}" успешно добавлены!`,
			},
		});
	};

	if (isLoading) {
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
									onClick={() => navigate('/admin')}
									className='text-lg transition-opacity hover:opacity-70'
									style={{ color: 'var(--tg-theme-link-color)' }}
								>
									← Назад
								</button>
								<div>
									<h1 className='text-2xl font-bold'>Добавьте игроков</h1>
									{state?.clubName && (
										<span
											className='block text-lg mt-1'
											style={{ color: 'var(--tg-theme-hint-color)' }}
										>
											в команду "{state.clubName}"
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Сетка игроков */}
						<div className='grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-4 mb-8 flex-1'>
							{players.map((player, index) => (
								<div
									key={player.id}
									onClick={() => handleSlotClick(index)}
									className={`aspect-square rounded-lg flex flex-col cursor-pointer overflow-hidden transition-opacity hover:opacity-80 ${
										player.isSaved ? 'ring-2' : ''
									}`}
									style={{
										background: 'var(--tg-theme-secondary-bg-color)',
										borderColor: player.isSaved
											? 'var(--tg-theme-button-color)'
											: 'transparent',
									}}
								>
									<div className='flex-1 flex items-center justify-center overflow-hidden relative'>
										{player.imagePreview ? (
											<>
												<img
													src={player.imagePreview}
													alt={player.name}
													className='w-full h-full object-cover'
												/>
												{player.isSaved && (
													<div
														className='absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold'
														style={{
															background: 'var(--tg-theme-button-color)',
															color: 'var(--tg-theme-button-text-color)',
														}}
													>
														✓
													</div>
												)}
											</>
										) : (
											<span
												className='text-2xl'
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

						{/* Кнопка сохранения */}
						<button
							onClick={handleFinish}
							className='py-4 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80'
							style={{
								background: 'var(--tg-theme-button-color)',
								color: 'var(--tg-theme-button-text-color)',
							}}
						>
							Сохранить
						</button>
					</>
				) : (
					<>
						{/* Форма добавления игрока */}
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
									{currentPlayer?.isSaved
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
									<div className='flex-1 flex items-center justify-center overflow-hidden relative'>
										{player.imagePreview ? (
											<>
												<img
													src={player.imagePreview}
													alt={player.name}
													className='w-full h-full object-cover'
												/>
												{player.isSaved && (
													<div
														className='absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center text-xs font-bold'
														style={{
															background: 'var(--tg-theme-button-color)',
															color: 'var(--tg-theme-button-text-color)',
														}}
													>
														✓
													</div>
												)}
											</>
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
										className='text-xs p-0.5 text-center min-h-[16px] flex items-center justify-center text-[10px]'
										style={{
											background: 'var(--tg-theme-bg-color)',
											color: 'var(--tg-theme-text-color)',
										}}
									>
										<span className='truncate w-full px-0.5'>
											{player.name || `${index + 1}`}
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
									(!currentPlayer?.image && !currentPlayer?.isSaved)
								}
								className='py-4 rounded-lg text-lg font-medium w-full transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed'
								style={{
									background: 'var(--tg-theme-button-color)',
									color: 'var(--tg-theme-button-text-color)',
								}}
							>
								{isSubmitting ? 'Сохранение...' : 'Сохранить'}
							</button>

							{currentPlayer?.isSaved && (
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

export default AddPlayersPage;
