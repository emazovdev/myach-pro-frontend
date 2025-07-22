/**
 * Типы ошибок приложения
 */
export enum ErrorType {
	NETWORK = 'NETWORK',
	AUTHENTICATION = 'AUTHENTICATION',
	AUTHORIZATION = 'AUTHORIZATION',
	VALIDATION = 'VALIDATION',
	SERVER = 'SERVER',
	UNKNOWN = 'UNKNOWN',
}

/**
 * Интерфейс для ошибки приложения
 */
export interface AppError {
	type: ErrorType;
	message: string;
	originalError?: Error;
	statusCode?: number;
}

/**
 * Пользовательские сообщения для разных типов ошибок
 */
const ERROR_MESSAGES = {
	[ErrorType.NETWORK]:
		'Проблемы с подключением к интернету. Проверьте соединение.',
	[ErrorType.AUTHENTICATION]:
		'Ошибка аутентификации. Попробуйте перезапустить приложение.',
	[ErrorType.AUTHORIZATION]: 'У вас нет прав для выполнения этого действия.',
	[ErrorType.VALIDATION]:
		'Некорректные данные. Проверьте введенную информацию.',
	[ErrorType.SERVER]: 'Временные проблемы на сервере. Попробуйте позже.',
	[ErrorType.UNKNOWN]: 'Произошла неожиданная ошибка. Попробуйте еще раз.',
};

/**
 * Определяет тип ошибки на основе статус кода
 */
function getErrorTypeByStatus(status: number): ErrorType {
	if (status >= 500) return ErrorType.SERVER;
	if (status === 401) return ErrorType.AUTHENTICATION;
	if (status === 403) return ErrorType.AUTHORIZATION;
	if (status >= 400 && status < 500) return ErrorType.VALIDATION;
	return ErrorType.UNKNOWN;
}

/**
 * Обрабатывает ошибки API запросов
 */
export async function handleApiError(error: any): Promise<AppError> {
	// Ошибка сети
	if (!navigator.onLine) {
		return {
			type: ErrorType.NETWORK,
			message: ERROR_MESSAGES[ErrorType.NETWORK],
			originalError: error,
		};
	}

	// Ошибка fetch (нет ответа от сервера)
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return {
			type: ErrorType.NETWORK,
			message: ERROR_MESSAGES[ErrorType.NETWORK],
			originalError: error,
		};
	}

	// Ошибка с response
	if (error.response) {
		const status = error.response.status;
		const errorType = getErrorTypeByStatus(status);

		// Пытаемся извлечь сообщение от сервера
		let serverMessage = '';
		try {
			const data = await error.response.json();
			serverMessage = data.error || data.message || '';
		} catch {
			// Игнорируем ошибки парсинга JSON
		}

		return {
			type: errorType,
			message: serverMessage || ERROR_MESSAGES[errorType],
			originalError: error,
			statusCode: status,
		};
	}

	// Обычная ошибка JavaScript
	if (error instanceof Error) {
		return {
			type: ErrorType.UNKNOWN,
			message: error.message || ERROR_MESSAGES[ErrorType.UNKNOWN],
			originalError: error,
		};
	}

	// Неизвестная ошибка
	return {
		type: ErrorType.UNKNOWN,
		message: ERROR_MESSAGES[ErrorType.UNKNOWN],
		originalError: error,
	};
}

/**
 * Логирует ошибку (для отправки в мониторинг)
 */
export function logError(error: AppError, context?: Record<string, any>) {
	const logData = {
		timestamp: new Date().toISOString(),
		type: error.type,
		message: error.message,
		statusCode: error.statusCode,
		context,
		stack: error.originalError?.stack,
		userAgent: navigator.userAgent,
		url: window.location.href,
	};

	// В development логируем в консоль
	if (import.meta.env.DEV) {
		console.error('Application Error:', logData);
	}

	// В production отправляем в мониторинг
	// Здесь можно добавить отправку в Sentry, LogRocket и т.д.
	if (!import.meta.env.DEV) {
		// sendToMonitoring(logData);
	}
}

/**
 * Создает пользовательский текст ошибки
 */
export function getErrorMessage(error: AppError): string {
	return error.message;
}

/**
 * Проверяет, можно ли повторить запрос при данной ошибке
 */
export function isRetryableError(error: AppError): boolean {
	return error.type === ErrorType.NETWORK || error.type === ErrorType.SERVER;
}

export const errorHandler = {
	// Счетчик ошибок для выявления DDoS
	errorCounts: new Map<string, number>(),
	resetTime: Date.now() + 60000,

	handle(error: Error, context: string) {
		const now = Date.now();

		// Сброс счетчиков каждую минуту
		if (now > this.resetTime) {
			this.errorCounts.clear();
			this.resetTime = now + 60000;
		}

		// Увеличиваем счетчик ошибок
		const count = this.errorCounts.get(context) || 0;
		this.errorCounts.set(context, count + 1);

		// Если слишком много ошибок - возможна атака
		if (count > 50) {
			console.error(`Возможная DDoS атака в контексте: ${context}`);
			// Можно добавить дополнительные меры защиты
		}

		// Логируем ошибку
		console.error(`[${context}] ${error.message}`);
	},
};
