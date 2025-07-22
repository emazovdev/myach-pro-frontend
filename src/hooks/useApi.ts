import React, { useState, useCallback } from 'react';
import { handleApiError, logError, type AppError } from '../utils/errorHandler';

interface UseApiState<T> {
	data: T | null;
	isLoading: boolean;
	error: AppError | null;
}

interface UseApiOptions {
	onSuccess?: (data: any) => void;
	onError?: (error: AppError) => void;
	logErrors?: boolean;
}

/**
 * Хук для унифицированной работы с API
 */
export function useApi<T = any>(options: UseApiOptions = {}) {
	const { onSuccess, onError, logErrors = true } = options;

	const [state, setState] = useState<UseApiState<T>>({
		data: null,
		isLoading: false,
		error: null,
	});

	/**
	 * Выполняет API запрос
	 */
	const execute = useCallback(
		async (apiCall: () => Promise<T>) => {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));

			try {
				const data = await apiCall();

				setState({
					data,
					isLoading: false,
					error: null,
				});

				onSuccess?.(data);
				return data;
			} catch (rawError) {
				const appError = await handleApiError(rawError);

				setState({
					data: null,
					isLoading: false,
					error: appError,
				});

				if (logErrors) {
					logError(appError, { apiCall: apiCall.name });
				}

				onError?.(appError);
				throw appError;
			}
		},
		[onSuccess, onError, logErrors],
	);

	/**
	 * Сбрасывает состояние
	 */
	const reset = useCallback(() => {
		setState({
			data: null,
			isLoading: false,
			error: null,
		});
	}, []);

	/**
	 * Очищает ошибку
	 */
	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	return {
		...state,
		execute,
		reset,
		clearError,
	};
}

/**
 * Хук для работы с данными, которые загружаются при монтировании
 */
export function useApiData<T = any>(
	apiCall: () => Promise<T>,
	dependencies: any[] = [],
	options: UseApiOptions = {},
) {
	const api = useApi<T>(options);

	// Загружаем данные при изменении зависимостей
	React.useEffect(() => {
		api.execute(apiCall);
	}, dependencies);

	return api;
}

/**
 * Хук для мутаций (создание, обновление, удаление)
 */
export function useApiMutation<TData = any, TVariables = any>(
	options: UseApiOptions = {},
) {
	const api = useApi<TData>(options);

	const mutate = useCallback(
		async (
			apiCall: (variables: TVariables) => Promise<TData>,
			variables: TVariables,
		) => {
			return api.execute(() => apiCall(variables));
		},
		[api.execute],
	);

	return {
		...api,
		mutate,
	};
}
