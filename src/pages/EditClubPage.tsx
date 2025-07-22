import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { updateClub } from '../api';

const EditClubPage = () => {
	const { isAdmin, isLoading } = useUserStore();
	const { initData } = useTelegram();
	const navigate = useNavigate();
	const { clubId } = useParams();
	const { state } = useLocation();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [clubName, setClubName] = useState('');
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Проверяем права доступа
	useEffect(() => {
		if (!isLoading && !isAdmin) {
			navigate('/');
		}
	}, [isAdmin, isLoading, navigate]);

	// Инициализируем данные команды
	useEffect(() => {
		if (state?.club) {
			setClubName(state.club.name);
			setImagePreview(state.club.logoUrl);
		}
	}, [state]);

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

		if (!clubId || !initData) {
			setError('Ошибка данных команды');
			return;
		}

		setIsSubmitting(true);

		try {
			const formData = new FormData();
			formData.append('name', clubName.trim());

			// Добавляем логотип только если он был изменен
			if (selectedImage) {
				formData.append('logo', selectedImage);
			}

			// Используем API сервис
			await updateClub(initData, clubId, formData);

			// Успешно обновлено
			navigate('/admin/manage-club', {
				state: { message: 'Команда успешно обновлена!' },
			});
		} catch (err) {
			console.error('Ошибка при обновлении команды:', err);
			setError(err instanceof Error ? err.message : 'Произошла ошибка');
		} finally {
			setIsSubmitting(false);
		}
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

	return (
		<div
			className='min-h-screen p-4'
			style={{
				background: 'var(--tg-theme-bg-color)',
				color: 'var(--tg-theme-text-color)',
			}}
		>
			<div className='max-w-2xl mx-auto'>
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
						<h1 className='text-2xl font-bold'>Изменить команду</h1>
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
					<p
						className='text-sm mt-2'
						style={{ color: 'var(--tg-theme-hint-color)' }}
					>
						Нажмите для изменения логотипа
					</p>
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
						className='mb-4 p-3 border rounded'
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
					disabled={isSubmitting || !clubName.trim()}
					className='py-4 rounded-full text-[clamp(1rem,3vw,1.5rem)] font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full transition-opacity hover:opacity-80'
					style={{
						background: 'var(--tg-theme-button-color)',
						color: 'var(--tg-theme-button-text-color)',
					}}
				>
					{isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
				</button>
			</div>
		</div>
	);
};

export default EditClubPage;
