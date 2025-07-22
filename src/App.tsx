import { useEffect, Suspense, lazy } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { useUserStore } from './store';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary, LoadingSpinner } from './components';

// Lazy loading для страниц с улучшенной обработкой ошибок
const StartPage = lazy(() =>
	import('./pages/StartPage').catch(() => ({
		default: () => <div>Ошибка загрузки стартовой страницы</div>,
	})),
);
const Guide = lazy(() =>
	import('./pages/Guide').catch(() => ({
		default: () => <div>Ошибка загрузки руководства</div>,
	})),
);
const SelectTeamPage = lazy(() =>
	import('./pages/SelectTeamPage').catch(() => ({
		default: () => <div>Ошибка загрузки страницы выбора команды</div>,
	})),
);
const Game = lazy(() =>
	import('./pages/Game').catch(() => ({
		default: () => <div>Ошибка загрузки игры</div>,
	})),
);
const Results = lazy(() =>
	import('./pages/Results').catch(() => ({
		default: () => <div>Ошибка загрузки результатов</div>,
	})),
);

// Админские страницы тоже делаем lazy с обработкой ошибок
const AdminPage = lazy(() =>
	import('./pages/AdminPage').catch(() => ({
		default: () => <div>Ошибка загрузки админки</div>,
	})),
);
const AddClubPage = lazy(() =>
	import('./pages/AddClubPage').catch(() => ({
		default: () => <div>Ошибка загрузки страницы добавления клуба</div>,
	})),
);
const AddPlayersPage = lazy(() =>
	import('./pages/AddPlayersPage').catch(() => ({
		default: () => <div>Ошибка загрузки страницы добавления игроков</div>,
	})),
);
const ManageClubPage = lazy(() =>
	import('./pages/ManageClubPage').catch(() => ({
		default: () => <div>Ошибка загрузки управления клубом</div>,
	})),
);
const EditClubPage = lazy(() =>
	import('./pages/EditClubPage').catch(() => ({
		default: () => <div>Ошибка загрузки редактирования клуба</div>,
	})),
);
const EditPlayersPage = lazy(() =>
	import('./pages/EditPlayersPage').catch(() => ({
		default: () => <div>Ошибка загрузки редактирования игроков</div>,
	})),
);
const ManageAdminsPage = lazy(() =>
	import('./pages/ManageAdminsPage').catch(() => ({
		default: () => <div>Ошибка загрузки управления админами</div>,
	})),
);
const AnalyticsPage = lazy(() =>
	import('./pages/AnalyticsPage').catch(() => ({
		default: () => <div>Ошибка загрузки аналитики</div>,
	})),
);
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
	const { tg, initData, isDevelopment } = useTelegram();
	const { authenticateUser } = useUserStore();

	useEffect(() => {
		// Проверяем, что Telegram WebApp доступен
		if (!tg) {
			if (isDevelopment) {
				console.log('Telegram WebApp недоступен - режим разработки');
			}
			return;
		}

		// Безопасная инициализация Telegram WebApp
		try {
			tg.ready();
			tg.expand();
		} catch (error) {
			console.error('Ошибка инициализации Telegram WebApp:', error);
		}

		// Аутентификация только если есть initData
		if (initData) {
			authenticateUser(initData).catch((error) => {
				console.error('Ошибка при аутентификации:', error);
				// TODO: Показать пользователю уведомление об ошибке
				// Можно добавить toast notification или modal
			});
		}

		// Логируем initData только в development
		if (isDevelopment && initData) {
			console.log('initData:', initData);
		}
	}, [tg, initData, authenticateUser, isDevelopment]);

	return (
		<ErrorBoundary>
			<SpeedInsights />
			<div className='w-full h-screen'>
				<Suspense fallback={<LoadingSpinner fullScreen message='Загрузка..' />}>
					<Routes>
						<Route index element={<StartPage />} />
						<Route path='/guide' element={<Guide />} />
						<Route path='/select-team' element={<SelectTeamPage />} />
						<Route path='/game' element={<Game />} />
						<Route path='/results' element={<Results />} />

						{/* Админские маршруты */}
						<Route path='/admin' element={<AdminPage />} />
						<Route path='/admin/add-club' element={<AddClubPage />} />
						<Route path='/admin/add-players' element={<AddPlayersPage />} />
						<Route
							path='/admin/add-players/:clubId'
							element={<AddPlayersPage />}
						/>
						<Route path='/admin/manage-club' element={<ManageClubPage />} />
						<Route path='/admin/edit-club/:clubId' element={<EditClubPage />} />
						<Route
							path='/admin/edit-players/:clubId'
							element={<EditPlayersPage />}
						/>
						<Route path='/admin/manage-admins' element={<ManageAdminsPage />} />
						<Route path='/admin/analytics' element={<AnalyticsPage />} />
					</Routes>
				</Suspense>

				<SpeedInsights />
			</div>
		</ErrorBoundary>
	);
}

export default App;
