import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ModalMode, Player } from '../types';

interface ModalState {
	isOpen: boolean;
	mode: ModalMode;
	message: string;
	categoryName: string;
	players: Player[];
	
	// Actions
	showMessageModal: (message: string) => void;
	showReplacePlayerModal: (categoryName: string, players: Player[]) => void;
	closeModal: () => void;
}

export const useModalStore = create<ModalState>()(
	devtools(
		(set) => ({
			isOpen: false,
			mode: 'message' as ModalMode,
			message: '',
			categoryName: '',
			players: [],

			showMessageModal: (message: string) => {
				set({
					isOpen: true,
					mode: 'message',
					message,
					categoryName: '',
					players: [],
				});
			},

			showReplacePlayerModal: (categoryName: string, players: Player[]) => {
				set({
					isOpen: true,
					mode: 'replace_player',
					message: '',
					categoryName,
					players,
				});
			},

			closeModal: () => {
				set({
					isOpen: false,
					mode: 'message',
					message: '',
					categoryName: '',
					players: [],
				});
			},
		}),
		{
			name: 'modal-store',
		}
	)
); 