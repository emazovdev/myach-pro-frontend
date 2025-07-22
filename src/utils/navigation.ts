import type { NavigateFunction } from 'react-router-dom';
import { fetchClubs } from '../api';

/**
 * Умная навигация к игре:
 * - Если команда одна - сразу переходим в игру
 * - Если команд несколько - показываем страницу выбора
 * - Если команд нет - показываем ошибку
 */
export const navigateToGame = async (
	initData: string,
	navigate: NavigateFunction,
): Promise<void> => {
	try {
		const clubs = await fetchClubs(initData);

		if (clubs.length === 0) {
			console.error('Команды не найдены');
			// Можно добавить уведомление пользователю
			return;
		}

		if (clubs.length === 1) {
			// Если команда одна - сразу переходим в игру
			navigate('/game', {
				state: {
					selectedClub: clubs[0],
				},
			});
		} else {
			// Если команд несколько - показываем страницу выбора
			navigate('/select-team');
		}
	} catch (error) {
		console.error('Ошибка при загрузке команд:', error);
		// Можно добавить уведомление пользователю об ошибке
	}
};
