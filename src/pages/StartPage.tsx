import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../store';

// Preload критически важные изображения
const preloadCriticalImages = () => {
	const images = ['/main_bg.jpg', '/main_logo.png'];

	images.forEach((src) => {
		const link = document.createElement('link');
		link.rel = 'preload';
		link.as = 'image';
		link.href = src;
		document.head.appendChild(link);
	});
};

const StartPage = () => {
	const { isAdmin, isLoading, telegramId } = useUserStore();

	// Preload критических изображений при монтировании компонента
	useEffect(() => {
		preloadCriticalImages();
	}, []);

	return (
		<div className='welcome bg-[url("/main_bg.jpg")] bg-cover bg-center h-full'>
			<div className='container flex flex-col justify-around h-full'>
				<div className='hero flex flex-col items-center'>
					<h2 className='text-white text-[clamp(2.5rem,9vw,3.5rem)] text-center font-bold'>
						Добро <br />
						пожаловать!
					</h2>
					<img src='./main_logo.png' alt='logo' className='logo' />
				</div>

				{/* Разные кнопки для админов и обычных пользователей */}

				<div className='flex flex-col gap-3'>
					{isLoading || telegramId ? (
						<Link
							to={isAdmin ? '/admin' : '/guide'}
							className='link_btn bg-[#FFEC13] text-[clamp(1rem,2vh,1.5rem)] text-black py-[clamp(1rem,1vh,2rem)]'
						>
							{isLoading ? 'Подождите...' : isAdmin ? 'Админ' : 'Поехали!'}
						</Link>
					) : (
						<Link
							to={`https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME}`}
							className='link_btn bg-[#FFEC13] text-[clamp(1rem,2vh,1.5rem)] text-black py-[clamp(1rem,1vh,2rem)]'
						>
							Подождите...
						</Link>
					)}
				</div>
			</div>
		</div>
	);
};

export default StartPage;
