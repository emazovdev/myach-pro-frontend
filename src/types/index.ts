export interface Player {
	id: string;
	name: string;
	img_url: string;
	club_id: string;
}

export interface Club {
	id: string;
	name: string;
	img_url: string;
}

export interface Category {
	name: string;
	color: string;
	slots: number;
}

export interface CategorizedPlayers {
	[key: string]: Player[];
}

export interface LocationState {
	categorizedPlayers: CategorizedPlayers;
	club: Club;
}

export type ModalMode = 'message' | 'replace_player';

export interface ModalProps {
	isOpen: boolean;
	mode: ModalMode;
	message?: string;
	categoryName?: string;
	players?: Player[];
	onClose: () => void;
	onReplacePlayer?: (player: Player) => void;
	onChooseOtherCategory?: () => void;
}

export type UserRole = 'admin' | 'user';

export interface User {
	id: string;
	telegramId: string;
	username?: string | null;
	role: UserRole;
}

export interface AdminUser extends User {
	addedBy: string | null;
	createdAt: string;
}
