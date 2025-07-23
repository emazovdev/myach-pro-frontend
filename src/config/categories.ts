import type { Category } from '../types'

// Стандартные категории для команд с 20 игроками
export const STANDARD_CATEGORIES: Category[] = [
	{
		name: 'goat',
		color: '#0EA94B',
		slots: 2,
	},
	{
		name: 'Хорош',
		color: '#94CC7A',
		slots: 6,
	},
	{
		name: 'норм',
		color: '#E6A324',
		slots: 6,
	},
	{
		name: 'Бездарь',
		color: '#E13826',
		slots: 6,
	},
]

// Специальные категории для команд с 10 игроками
export const COMPACT_CATEGORIES: Category[] = [
	{
		name: 'goat',
		color: '#0EA94B',
		slots: 1,
	},
	{
		name: 'Хорош',
		color: '#94CC7A',
		slots: 3,
	},
	{
		name: 'норм',
		color: '#E6A324',
		slots: 3,
	},
	{
		name: 'Бездна',
		color: '#E13826',
		slots: 3,
	},
]

/**
 * Возвращает подходящие категории в зависимости от количества игроков в команде
 * @param playerCount - количество игроков в команде
 * @returns массив категорий
 */
export const getCategories = (playerCount: number): Category[] => {
	if (playerCount <= 10) {
		return COMPACT_CATEGORIES
	}
	return STANDARD_CATEGORIES
}

// Обратная совместимость - экспортируем стандартные категории как LOCAL_CATEGORIES
export const LOCAL_CATEGORIES = STANDARD_CATEGORIES
