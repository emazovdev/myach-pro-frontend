import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import type { AdminUser, User } from '../types';
import {
	fetchAdmins,
	removeAdmin,
	searchUsers,
	addAdminByUsername,
} from '../api';

const ManageAdminsPage: React.FC = () => {
	const { initData } = useTelegram();
	const navigate = useNavigate();
	const [admins, setAdmins] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<User[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [operationLoading, setOperationLoading] = useState(false);
	const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
	const [notification, setNotification] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);

	useEffect(() => {
		loadAdmins();
	}, []);

	// Очистка таймера при размонтировании
	useEffect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	}, [searchTimeout]);

	const loadAdmins = async () => {
		if (!initData) return;

		try {
			setLoading(true);
			const adminsData = await fetchAdmins(initData);
			setAdmins(adminsData);
		} catch (error) {
			console.error('Ошибка при загрузке админов:', error);
		} finally {
			setLoading(false);
		}
	};

	// Поиск пользователей с debounce
	const handleSearch = async (query: string) => {
		if (!initData || !query.trim()) {
			setSearchResults([]);
			return;
		}

		try {
			setSearchLoading(true);
			const users = await searchUsers(initData, query.trim());
			setSearchResults(users);
		} catch (error) {
			console.error('Ошибка при поиске пользователей:', error);
			setSearchResults([]);
		} finally {
			setSearchLoading(false);
		}
	};

	// Debounced поиск
	const handleSearchInput = (query: string) => {
		setSearchQuery(query);

		// Очищаем предыдущий таймер
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Если строка пустая - сразу очищаем результаты
		if (!query.trim()) {
			setSearchResults([]);
			setSearchLoading(false);
			return;
		}

		// Показываем загрузку
		setSearchLoading(true);

		// Устанавливаем новый таймер
		const newTimeout = setTimeout(() => {
			handleSearch(query);
		}, 300) as unknown as number; // Задержка 300мс

		setSearchTimeout(newTimeout);
	};

	// Добавление админа
	const handleAddAdmin = async () => {
		if (!initData || !selectedUser?.username) return;

		try {
			setOperationLoading(true);
			const result = await addAdminByUsername(initData, selectedUser.username);

			if (result.success) {
				setNotification({
					message: 'Админ успешно добавлен!',
					type: 'success',
				});
				setTimeout(() => setNotification(null), 3000);
				setIsAddModalOpen(false);
				setSearchQuery('');
				setSearchResults([]);
				setSelectedUser(null);
				await loadAdmins();
			} else {
				setNotification({
					message: `Ошибка: ${result.message}`,
					type: 'error',
				});
				setTimeout(() => setNotification(null), 3000);
			}
		} catch (error) {
			console.error('Ошибка при добавлении админа:', error);
			setNotification({
				message: 'Ошибка при добавлении админа',
				type: 'error',
			});
			setTimeout(() => setNotification(null), 3000);
		} finally {
			setOperationLoading(false);
		}
	};

	const handleRemoveAdmin = async (admin: AdminUser) => {
		if (!initData) return;

		if (!confirm(`Удалить админа ${admin.username || admin.telegramId}?`)) {
			return;
		}

		try {
			setOperationLoading(true);
			const result = await removeAdmin(initData, admin.telegramId);

			if (result.success) {
				setNotification({ message: 'Админ успешно удален!', type: 'success' });
				setTimeout(() => setNotification(null), 3000);
				await loadAdmins();
			} else {
				setNotification({
					message: `Ошибка: ${result.message}`,
					type: 'error',
				});
				setTimeout(() => setNotification(null), 3000);
			}
		} catch (error) {
			console.error('Ошибка при удалении админа:', error);
			setNotification({ message: 'Ошибка при удалении админа', type: 'error' });
			setTimeout(() => setNotification(null), 3000);
		} finally {
			setOperationLoading(false);
		}
	};

	if (loading) {
		return (
			<div className='min-h-screen bg-gray-900 flex items-center justify-center'>
				<div className='text-white text-xl'>Загрузка...</div>
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
				{/* Заголовок */}
				<div className='flex items-center justify-between mb-6'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => navigate('/admin')}
							className='text-lg transition-opacity hover:opacity-70'
							style={{ color: 'var(--tg-theme-link-color)' }}
						>
							← Назад
						</button>
						<h1 className='text-2xl font-bold'>Управление админами</h1>
					</div>
					<button
						onClick={() => setIsAddModalOpen(true)}
						className='px-4 py-2 rounded-lg transition-opacity hover:opacity-80'
						style={{
							background: 'var(--tg-theme-button-color)',
							color: 'var(--tg-theme-button-text-color)',
						}}
						disabled={operationLoading}
					>
						Добавить админа
					</button>
				</div>

				{/* Уведомления */}
				{notification && (
					<div
						className='mb-6 p-4 rounded-lg border'
						style={{
							background:
								notification.type === 'success'
									? 'var(--tg-theme-button-color)'
									: 'var(--tg-theme-secondary-bg-color)',
							color:
								notification.type === 'success'
									? 'var(--tg-theme-button-text-color)'
									: 'var(--tg-theme-destructive-text-color, #dc2626)',
							borderColor:
								notification.type === 'success'
									? 'var(--tg-theme-button-color)'
									: 'var(--tg-theme-destructive-text-color, #fca5a5)',
						}}
					>
						{notification.message}
					</div>
				)}

				{/* Информационная панель */}
				<div
					className='rounded-lg p-4 mb-6 border'
					style={{
						background: 'var(--tg-theme-secondary-bg-color)',
						borderColor: 'var(--tg-theme-hint-color)',
					}}
				>
					<h3
						className='text-lg font-semibold mb-2'
						style={{ color: 'var(--tg-theme-link-color)' }}
					>
						💡 Как добавить админа?
					</h3>
					<div
						className='text-sm space-y-2'
						style={{ color: 'var(--tg-theme-hint-color)' }}
					>
						<p>• Пользователь должен сначала запустить бота хотя бы один раз</p>
						<p>
							• У пользователя должен быть установлен @username в настройках
							Telegram
						</p>
						<p>• Введите username в поле поиска (например: ivan_petrov)</p>
						<p>
							• Если пользователя нет в списке - попросите его перезапустить
							бота
						</p>
					</div>
				</div>

				{/* Список админов */}
				<div className='space-y-4'>
					{admins.map((admin) => (
						<div
							key={admin.id}
							className='rounded-lg p-4 flex items-center justify-between'
							style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
						>
							<div>
								<div className='text-lg font-semibold'>
									{admin.username || 'Без имени'}
								</div>
								<div
									className='text-sm'
									style={{ color: 'var(--tg-theme-hint-color)' }}
								>
									ID: {admin.telegramId}
								</div>
								<div
									className='text-xs'
									style={{ color: 'var(--tg-theme-hint-color)' }}
								>
									{admin.addedBy
										? `Добавлен админом: ${admin.addedBy}`
										: 'Главный админ'}
								</div>
								<div
									className='text-xs'
									style={{ color: 'var(--tg-theme-hint-color)' }}
								>
									{new Date(admin.createdAt).toLocaleString('ru-RU')}
								</div>
							</div>

							<div className='flex gap-2'>
								{admin.id !== 'main-admin' && (
									<button
										onClick={() => handleRemoveAdmin(admin)}
										className='px-3 py-1 rounded text-sm transition-opacity hover:opacity-80'
										style={{ background: '#dc2626', color: 'white' }}
										disabled={operationLoading}
									>
										Удалить
									</button>
								)}
								{admin.id === 'main-admin' && (
									<span
										className='text-sm'
										style={{ color: 'var(--tg-theme-hint-color)' }}
									>
										Главный админ
									</span>
								)}
							</div>
						</div>
					))}
				</div>

				{admins.length === 0 && (
					<div
						className='text-center py-8'
						style={{ color: 'var(--tg-theme-hint-color)' }}
					>
						Админы не найдены
					</div>
				)}
			</div>

			{/* Модальное окно добавления админа */}
			{isAddModalOpen && (
				<div
					className='fixed inset-0 flex items-center justify-center p-4 z-50'
					style={{ background: 'rgba(0,0,0,0.5)' }}
				>
					<div
						className='rounded-lg p-6 w-full max-w-md'
						style={{ background: 'var(--tg-theme-bg-color)' }}
					>
						<h2 className='text-xl font-bold mb-4'>Добавить нового админа</h2>

						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium mb-2'>
									Поиск пользователя *
								</label>
								<input
									type='text'
									value={searchQuery}
									onChange={(e) => handleSearchInput(e.target.value)}
									className='w-full rounded-lg px-3 py-2 border'
									style={{
										background: 'var(--tg-theme-secondary-bg-color)',
										borderColor: 'var(--tg-theme-hint-color)',
										color: 'var(--tg-theme-text-color)',
									}}
									placeholder='Введите username пользователя'
								/>
								{searchLoading && (
									<div
										className='text-sm mt-1'
										style={{ color: 'var(--tg-theme-hint-color)' }}
									>
										Поиск...
									</div>
								)}
							</div>

							{/* Результаты поиска */}
							{searchResults.length > 0 && (
								<div
									className='max-h-40 overflow-y-auto rounded-lg'
									style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
								>
									{searchResults.map((user) => (
										<div
											key={user.telegramId}
											onClick={() => {
												setSelectedUser(user);
												setSearchQuery(user.username || '');
												setSearchResults([]);
											}}
											className={`p-3 cursor-pointer hover:opacity-80 border-b last:border-b-0 ${
												selectedUser?.telegramId === user.telegramId
													? 'opacity-80'
													: ''
											}`}
											style={{
												borderColor: 'var(--tg-theme-hint-color)',
												background:
													selectedUser?.telegramId === user.telegramId
														? 'var(--tg-theme-button-color)'
														: 'transparent',
											}}
										>
											<div className='font-medium'>
												{user.username ? `@${user.username}` : 'Без username'}
											</div>
											<div
												className='text-sm'
												style={{ color: 'var(--tg-theme-hint-color)' }}
											>
												{user.role === 'admin'
													? '⚠️ Уже админ'
													: 'Пользователь'}
											</div>
										</div>
									))}
								</div>
							)}

							{/* Выбранный пользователь */}
							{selectedUser && (
								<div
									className='rounded-lg p-3'
									style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
								>
									<div
										className='text-sm mb-1'
										style={{ color: 'var(--tg-theme-hint-color)' }}
									>
										Выбранный пользователь:
									</div>
									<div className='font-medium'>
										{selectedUser.username
											? `@${selectedUser.username}`
											: 'Без username'}
									</div>
									<div
										className='text-sm'
										style={{ color: 'var(--tg-theme-hint-color)' }}
									>
										ID: {selectedUser.telegramId}
									</div>
									{selectedUser.role === 'admin' && (
										<div className='text-sm mt-1' style={{ color: '#f59e0b' }}>
											⚠️ Этот пользователь уже является админом
										</div>
									)}
								</div>
							)}

							{searchQuery && searchResults.length === 0 && !searchLoading && (
								<div
									className='text-sm'
									style={{ color: 'var(--tg-theme-hint-color)' }}
								>
									Пользователи не найдены. Попробуйте другой запрос.
								</div>
							)}
						</div>

						<div className='flex gap-3 mt-6'>
							<button
								onClick={handleAddAdmin}
								disabled={
									operationLoading ||
									!selectedUser?.username ||
									selectedUser.role === 'admin'
								}
								className='flex-1 px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50'
								style={{
									background: 'var(--tg-theme-button-color)',
									color: 'var(--tg-theme-button-text-color)',
								}}
							>
								{operationLoading ? 'Добавление...' : 'Добавить админа'}
							</button>
							<button
								onClick={() => {
									setIsAddModalOpen(false);
									setSearchQuery('');
									setSearchResults([]);
									setSelectedUser(null);
								}}
								disabled={operationLoading}
								className='flex-1 px-4 py-2 rounded-lg transition-opacity hover:opacity-80'
								style={{
									background: 'var(--tg-theme-secondary-bg-color)',
									color: 'var(--tg-theme-text-color)',
									border: '1px solid var(--tg-theme-hint-color)',
								}}
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ManageAdminsPage;
