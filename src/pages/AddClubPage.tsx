import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { createClub } from '../api';
import { securityUtils } from '../utils/securityUtils';

const AddClubPage = () => {
	const { isAdmin, isLoading } = useUserStore();
	const { initData } = useTelegram();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [clubName, setClubName] = useState('');
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Проверяем права доступа
	React.useEffect(() => {
		if (!isLoading && !isAdmin) {
			navigate('/');
		}
	}, [isAdmin, isLoading, navigate]);

	const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setSelectedImage(file);

			// Создаем превью изображения
			const reader = new FileReader();
			reader.onload = (e) => {
				setImagePreview(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleImageClick = () => {
		fileInputRef.current?.click();
	};

	const handleSubmit = async () => {
		setError(null);

		if (!clubName.trim()) {
			setError('Введите название команды');
			return;
		}

		if (!selectedImage) {
			setError('Выберите логотип команды');
			return;
		}

		if (!initData) {
			setError('Ошибка авторизации');
			return;
		}

		setIsSubmitting(true);

		try {
			// Санитизация входных данных
			const sanitizedClubName = securityUtils.sanitizeInput(clubName);

			const formData = new FormData();
			formData.append('name', sanitizedClubName);
			formData.append('logo', selectedImage);

			// Используем API сервис
			const response = await createClub(initData, formData);

			// Переходим на страницу добавления игроков с ID созданной команды
			navigate(`/admin/add-players/${response.club.id}`, {
				state: { clubName: sanitizedClubName },
			});
		} catch (err) {
			console.error('Ошибка при создании команды:', err);
			setError(err instanceof Error ? err.message : 'Произошла ошибка');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
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

	return (
		<div
			className='min-h-screen p-4'
			style={{
				background: 'var(--tg-theme-bg-color)',
				color: 'var(--tg-theme-text-color)',
			}}
		>
			<div className='max-w-2xl mx-auto'>
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
						<h1 className='text-2xl font-bold'>Добавить команду</h1>
					</div>
				</div>

				{/* Логотип команды */}
				<div className='flex flex-col items-center mb-8'>
					<div
						onClick={handleImageClick}
						className='w-24 h-24 rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-opacity hover:opacity-80'
						style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
					>
						{imagePreview ? (
							<img
								src={imagePreview}
								alt='Превью логотипа'
								className='w-full h-full object-cover'
							/>
						) : (
							<span
								className='text-sm text-center'
								style={{ color: 'var(--tg-theme-hint-color)' }}
							>
								Выберите
								<br />
								логотип
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

				{/* Поле ввода названия */}
				<div className='mb-8'>
					<input
						type='text'
						value={clubName}
						onChange={(e) => setClubName(e.target.value)}
						placeholder='Название команды'
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

				{/* Кнопка сохранения */}
				<button
					onClick={handleSubmit}
					disabled={isSubmitting || !clubName.trim() || !selectedImage}
					className='w-full py-4 rounded-lg text-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed'
					style={{
						background: 'var(--tg-theme-button-color)',
						color: 'var(--tg-theme-button-text-color)',
					}}
				>
					{isSubmitting ? 'Сохранение...' : 'Дальше'}
				</button>
			</div>
		</div>
	);
};

export default AddClubPage;
