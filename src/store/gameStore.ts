import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CategorizedPlayers, Player, Category } from '../types';
import { fetchPlayersByClub } from '../api';
import { LOCAL_CATEGORIES } from '../config/categories';

type AddPlayerResult =
	| 'success'
	| 'category_not_found'
	| 'category_full'
	| 'player_not_found'
	| 'game_finished';

// Расширенный тип для истории действий
interface GameHistoryAction {
	actionId: string; // Уникальный ID действия
	player: Player;
	categoryName: string;
	wasReplacement: boolean;
	replacedPlayer?: Player;
	timestamp: number;
	// Состояние игры на момент действия для быстрого восстановления
	gameStateSnapshot: {
		currentPlayerIndex: number;
		processedPlayersCount: number;
		progressPercentage: number;
		categorizedPlayers: CategorizedPlayers;
	};
}

interface GameState {
	// Основное состояние
	currentPlayerIndex: number;
	categorizedPlayers: CategorizedPlayers;
	playerQueue: Player[];
	processedPlayersCount: number;
	categories: Category[];
	isLoading: boolean;
	error: string | null;
	maxPlayersToProcess: number;

	// Расширенная история для возврата к любому состоянию
	gameHistory: GameHistoryAction[];
	canGoBack: boolean;

	// Computed values
	progressPercentage: number;

	// Actions
	addPlayerToCategory: (categoryName: string) => AddPlayerResult;
	replacePlayerInCategory: (
		categoryName: string,
		playerToReplace: Player,
	) => AddPlayerResult;
	getCategoryFilled: (categoryName: string) => string;
	getCurrentPlayer: () => Player | undefined;
	resetGame: () => void;
	initializeGame: (initData: string, clubId: string) => Promise<void>;
	goBackToPreviousPlayer: () => boolean; // Возврат на один шаг
}

const initialState = {
	currentPlayerIndex: 0,
	categorizedPlayers: {} as CategorizedPlayers,
	playerQueue: [],
	processedPlayersCount: 0,
	progressPercentage: 0,
	categories: [],
	isLoading: false,
	error: null,
	maxPlayersToProcess: 0,
	gameHistory: [],
	canGoBack: false,
};

export const useGameStore = create<GameState>()(
	devtools(
		persist(
			(set, get) => ({
				...initialState,

				// Actions
				addPlayerToCategory: (categoryName: string): AddPlayerResult => {
					const state = get();
					const category = state.categories.find(
						(cat) => cat.name === categoryName,
					);

					if (!category) {
						return 'category_not_found';
					}

					const currentCategoryPlayers =
						state.categorizedPlayers[categoryName] || [];

					if (currentCategoryPlayers.length >= category.slots) {
						return 'category_full';
					}

					const playerToAdd = state.playerQueue[state.currentPlayerIndex];
					if (!playerToAdd) {
						return 'player_not_found';
					}

					const updatedCategorizedPlayers = {
						...state.categorizedPlayers,
						[categoryName]: [...currentCategoryPlayers, playerToAdd],
					};

					const newProcessedCount = state.processedPlayersCount + 1;
					const newCurrentIndex = state.currentPlayerIndex + 1;
					const newProgressPercentage =
						(newProcessedCount / state.maxPlayersToProcess) * 100;

					// Сохраняем действие для возможности возврата
					const previousAction: GameHistoryAction = {
						actionId: Date.now().toString(),
						player: playerToAdd,
						categoryName,
						wasReplacement: false,
						timestamp: Date.now(),
						gameStateSnapshot: {
							currentPlayerIndex: newCurrentIndex,
							processedPlayersCount: newProcessedCount,
							progressPercentage: newProgressPercentage,
							categorizedPlayers: updatedCategorizedPlayers,
						},
					};

					set({
						categorizedPlayers: updatedCategorizedPlayers,
						currentPlayerIndex: newCurrentIndex,
						processedPlayersCount: newProcessedCount,
						progressPercentage: newProgressPercentage,
						gameHistory: [...state.gameHistory, previousAction],
						canGoBack: newCurrentIndex > 0, // Можно вернуться только если это не первый игрок
					});

					// Проверяем завершение игры
					if (newProcessedCount >= state.maxPlayersToProcess) {
						return 'game_finished';
					}

					return 'success';
				},

				replacePlayerInCategory: (
					categoryName: string,
					playerToReplace: Player,
				): AddPlayerResult => {
					const state = get();
					const currentPlayer = state.playerQueue[state.currentPlayerIndex];

					if (!currentPlayer) return 'player_not_found';

					// Заменяем игрока в категории
					const categoryPlayers = state.categorizedPlayers[categoryName] || [];
					const updatedCategoryPlayers = categoryPlayers.map((player) =>
						player.id === playerToReplace.id ? currentPlayer : player,
					);

					// Добавляем замененного игрока в конец очереди
					const updatedQueue = [...state.playerQueue, playerToReplace];

					// При замене игрока processedPlayersCount НЕ увеличивается
					const newCurrentIndex = state.currentPlayerIndex + 1;

					// Сохраняем действие для возможности возврата
					const previousAction: GameHistoryAction = {
						actionId: Date.now().toString(),
						player: currentPlayer,
						categoryName,
						wasReplacement: true,
						replacedPlayer: playerToReplace,
						timestamp: Date.now(),
						gameStateSnapshot: {
							currentPlayerIndex: newCurrentIndex,
							processedPlayersCount: state.processedPlayersCount,
							progressPercentage: state.progressPercentage,
							categorizedPlayers: {
								...state.categorizedPlayers,
								[categoryName]: updatedCategoryPlayers,
							},
						},
					};

					set({
						categorizedPlayers: {
							...state.categorizedPlayers,
							[categoryName]: updatedCategoryPlayers,
						},
						playerQueue: updatedQueue,
						currentPlayerIndex: newCurrentIndex,
						gameHistory: [...state.gameHistory, previousAction],
						canGoBack: newCurrentIndex > 0, // Можно вернуться только если это не первый игрок
						// processedPlayersCount и progressPercentage не изменяются при замене
					});

					// При замене игрока проверяем завершение по текущему счетчику
					if (state.processedPlayersCount >= state.maxPlayersToProcess) {
						return 'game_finished';
					}

					return 'success';
				},

				getCategoryFilled: (categoryName: string) => {
					const state = get();
					const playerCount =
						state.categorizedPlayers[categoryName]?.length || 0;
					const category = state.categories.find(
						(cat) => cat.name === categoryName,
					);
					if (!category) return '0 / 0';
					return `${playerCount} / ${category.slots}`;
				},

				getCurrentPlayer: () => {
					const state = get();
					return state.playerQueue[state.currentPlayerIndex];
				},

				resetGame: () => {
					set({
						...initialState,
						categories: LOCAL_CATEGORIES,
						categorizedPlayers: Object.fromEntries(
							LOCAL_CATEGORIES.map((cat) => [cat.name, []]),
						),
						gameHistory: [],
						canGoBack: false,
					});
				},

				initializeGame: async (initData: string, clubId: string) => {
					set({ isLoading: true, error: null });

					try {
						// Используем локальные категории и загружаем игроков с сервера
						const players = await fetchPlayersByClub(initData, clubId);

						// Создаем начальное состояние категорий
						const emptyCategorizedPlayers = Object.fromEntries(
							LOCAL_CATEGORIES.map((cat) => [cat.name, []]),
						);

						set({
							categories: LOCAL_CATEGORIES,
							playerQueue: players,
							categorizedPlayers: emptyCategorizedPlayers,
							currentPlayerIndex: 0,
							processedPlayersCount: 0,
							progressPercentage: 0,
							maxPlayersToProcess: players.length,
							isLoading: false,
							gameHistory: [],
							canGoBack: false,
						});
					} catch (error) {
						console.error('Ошибка при инициализации игры:', error);
						set({
							error:
								'Произошла ошибка при загрузке данных. Проверьте соединение с сервером.',
							isLoading: false,
						});
					}
				},

				goBackToPreviousPlayer: () => {
					const state = get();
					if (!state.gameHistory.length || !state.canGoBack) {
						return false;
					}

					const lastAction = state.gameHistory[state.gameHistory.length - 1];
					if (!lastAction) {
						return false;
					}

					const { player, categoryName, wasReplacement, replacedPlayer } =
						lastAction;
					const categoryPlayers = state.categorizedPlayers[categoryName] || [];

					let updatedCategoryPlayers: Player[];
					let updatedPlayerQueue = state.playerQueue;
					let updatedProcessedCount = state.processedPlayersCount;

					if (wasReplacement) {
						// Возвращаем замененного игрока на место, убираем текущего
						updatedCategoryPlayers = categoryPlayers.map((p) =>
							p.id === player.id ? replacedPlayer! : p,
						);
						// Убираем замененного игрока из конца очереди
						updatedPlayerQueue = state.playerQueue.slice(0, -1);
					} else {
						// Убираем добавленного игрока из категории
						updatedCategoryPlayers = categoryPlayers.filter(
							(p) => p.id !== player.id,
						);
						// Уменьшаем счетчик обработанных игроков
						updatedProcessedCount = state.processedPlayersCount - 1;
					}

					const newCurrentIndex = state.currentPlayerIndex - 1;
					const newProgressPercentage =
						(updatedProcessedCount / state.maxPlayersToProcess) * 100;

					set({
						categorizedPlayers: {
							...state.categorizedPlayers,
							[categoryName]: updatedCategoryPlayers,
						},
						playerQueue: updatedPlayerQueue,
						currentPlayerIndex: newCurrentIndex,
						processedPlayersCount: updatedProcessedCount,
						progressPercentage: newProgressPercentage,
						gameHistory: state.gameHistory.slice(0, -1),
						canGoBack: newCurrentIndex > 0,
					});

					return true;
				},
			}),
			{
				name: 'game-storage',
				partialize: (state) => ({
					categorizedPlayers: state.categorizedPlayers,
					currentPlayerIndex: state.currentPlayerIndex,
					processedPlayersCount: state.processedPlayersCount,
					progressPercentage: state.progressPercentage,
					categories: state.categories,
					maxPlayersToProcess: state.maxPlayersToProcess,
					playerQueue: state.playerQueue, // Добавляем playerQueue для сохранения полной информации об игроках
					gameHistory: state.gameHistory,
					canGoBack: state.canGoBack,
				}),
			},
		),
		{
			name: 'game-store',
		},
	),
);
