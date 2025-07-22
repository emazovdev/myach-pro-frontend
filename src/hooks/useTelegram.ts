// Хук не использует React импорты

const tg = (window as any).Telegram?.WebApp;

// Проверяем, запущено ли приложение в Telegram WebApp
const isTelegramWebApp = Boolean(tg);

// Проверяем, находимся ли мы в режиме разработки
const isDevelopment = import.meta.env.DEV;

export function useTelegram() {
	const onClose = () => {
		if (tg) {
			tg.close();
		} else if (isDevelopment) {
			console.log('Telegram WebApp не доступен - режим разработки');
		}
	};

	const onToggleButton = () => {
		if (tg?.MainButton) {
			if (tg.MainButton.isVisible) {
				tg.MainButton.hide();
			} else {
				tg.MainButton.show();
			}
		}
	};

	// Получение данных пользователя
	const getUser = () => {
		return tg?.initDataUnsafe?.user || null;
	};

	const getInitData = () => {
		return tg?.initData || null;
	};

	const getQueryId = () => {
		return tg?.initDataUnsafe?.query_id || null;
	};

	// Дополнительные утилиты для работы с Telegram
	const setMainButtonText = (text: string) => {
		if (tg?.MainButton) {
			tg.MainButton.setText(text);
		}
	};

	const enableMainButton = () => {
		if (tg?.MainButton) {
			tg.MainButton.enable();
		}
	};

	const disableMainButton = () => {
		if (tg?.MainButton) {
			tg.MainButton.disable();
		}
	};

	const showMainButton = () => {
		if (tg?.MainButton) {
			tg.MainButton.show();
		}
	};

	const hideMainButton = () => {
		if (tg?.MainButton) {
			tg.MainButton.hide();
		}
	};

	return {
		// Основные данные
		tg: tg || null,
		user: getUser(),
		initData: getInitData(),
		queryId: getQueryId(),

		// Флаги состояния
		isTelegramWebApp,
		isDevelopment,

		// Методы управления
		onClose,
		onToggleButton,
		setMainButtonText,
		enableMainButton,
		disableMainButton,
		showMainButton,
		hideMainButton,
	};
}
