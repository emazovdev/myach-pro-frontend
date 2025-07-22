import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '../types';
import { authenticateTelegramUser } from '../api';

interface UserState {
	telegramId: string | null;
	user: User | null;
	isAdmin: boolean;
	isLoading: boolean;
	error: string | null;

	// Actions
	authenticateUser: (initData: string) => Promise<void>;
	clearUserData: () => void;
}

export const useUserStore = create<UserState>()(
	devtools(
		persist(
			(set) => ({
				telegramId: null,
				user: null,
				isAdmin: false,
				isLoading: false,
				error: null,

				authenticateUser: async (initData: string) => {
					set({ isLoading: true, error: null });

					try {
						const user = await authenticateTelegramUser(initData);

						if (user) {
							set({
								user,
								telegramId: user.telegramId,
								isAdmin: user.role === 'admin',
								isLoading: false,
							});
						} else {
							set({
								user: null,
								telegramId: null,
								isAdmin: false,
								isLoading: false,
								error: 'Не удалось аутентифицировать пользователя',
							});
						}
					} catch (error) {
						console.error('Ошибка при аутентификации:', error);
						set({
							error: 'Ошибка при аутентификации пользователя',
							isLoading: false,
							user: null,
							telegramId: null,
							isAdmin: false,
						});
					}
				},

				clearUserData: () => {
					set({
						telegramId: null,
						user: null,
						isAdmin: false,
						error: null,
					});
				},
			}),
			{
				name: 'user-storage',
				partialize: (state) => ({
					telegramId: state.telegramId,
					user: state.user,
					isAdmin: state.isAdmin,
				}),
			},
		),
		{
			name: 'user-store',
		},
	),
);
