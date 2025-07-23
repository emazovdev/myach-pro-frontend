import { API_BASE_URL } from '../config/api'

export interface GameResult {
	categorizedPlayerIds: { [categoryName: string]: string[] }
	clubId: string
}

export interface PlayerRating {
	playerId: string
	playerName: string
	playerAvatar: string
	categoryName: string
	totalGames: number
	categoryHits: number
	hitPercentage: number
}

export interface ClubRatingsResponse {
	ok: boolean
	club: {
		id: string
		name: string
	}
	ratingsByCategory: { [categoryName: string]: PlayerRating[] }
}

/**
 * Сохраняет результаты игры
 */
export const saveGameResults = async (
	initData: string,
	gameResults: GameResult
): Promise<void> => {
	try {
		const response = await fetch(
			`${API_BASE_URL}/statistics/game-results`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `tma ${initData}`,
				},
				body: JSON.stringify({ gameResults }),
			}
		)

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		if (!result.ok) {
			throw new Error(result.message || 'Ошибка при сохранении результатов')
		}
	} catch (error) {
		console.error('Ошибка при сохранении результатов игры:', error)
		// Не прерываем основной поток при ошибке сохранения статистики
	}
}

/**
 * Получает рейтинги игроков по команде
 */
export const getPlayerRatings = async (
	initData: string,
	clubId: string
): Promise<ClubRatingsResponse> => {
	try {
		const response = await fetch(`${API_BASE_URL}/ratings/${clubId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `tma ${initData}`,
			},
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		if (!result.ok) {
			throw new Error(result.error || 'Ошибка при получении рейтингов')
		}

		return result
	} catch (error) {
		console.error('Ошибка при получении рейтингов игроков:', error)
		throw error
	}
}
