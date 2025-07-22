interface TelegramWebApp {
	WebApp: {
		ready(): void;
		initData: string;
		initDataUnsafe: {
			query_id?: string;
			user?: {
				id: number;
				first_name: string;
				last_name?: string;
				username?: string;
				language_code?: string;
			};
			auth_date: string;
			hash: string;
		};
		colorScheme: 'light' | 'dark';
		viewportHeight: number;
		viewportStableHeight: number;
		isExpanded: boolean;
		MainButton: {
			text: string;
			color: string;
			textColor: string;
			isVisible: boolean;
			isActive: boolean;
			setText(text: string): void;
			show(): void;
			hide(): void;
			enable(): void;
			disable(): void;
			onClick(callback: () => void): void;
			offClick(callback: () => void): void;
		};
		BackButton: {
			isVisible: boolean;
			show(): void;
			hide(): void;
			onClick(callback: () => void): void;
			offClick(callback: () => void): void;
		};
		close(): void;
		expand(): void;
		setBackgroundColor(color: string): void;
		enableClosingConfirmation(): void;
		disableClosingConfirmation(): void;
	};
}

interface Window {
	Telegram: TelegramWebApp;
}
