import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logError, handleApiError } from '../utils/errorHandler';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
	retryCount: number;
}

const MAX_RETRY_COUNT = 3;

class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { 
			hasError: false,
			retryCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		// Обновляем состояние, чтобы следующий рендер показал fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Логируем ошибку через нашу систему
		handleApiError(error).then((appError) => {
			logError(appError, {
				componentStack: errorInfo.componentStack,
				errorBoundary: true,
				retryCount: this.state.retryCount,
			});
		});

		// Обновляем состояние
		this.setState({
			error,
			errorInfo,
		});

		// Вызываем колбэк если передан
		this.props.onError?.(error, errorInfo);

		// В development выводим в консоль
		if (import.meta.env.DEV) {
			console.group('🚨 Error Boundary');
			console.error('Error:', error);
			console.error('Error Info:', errorInfo);
			console.groupEnd();
		}
	}

	private handleReload = () => {
		window.location.reload();
	};

	private handleReset = () => {
		const newRetryCount = this.state.retryCount + 1;
		
		this.setState({ 
			hasError: false, 
			error: undefined, 
			errorInfo: undefined,
			retryCount: newRetryCount,
		});
	};

	render() {
		if (this.state.hasError) {
			// Если передан кастомный fallback, используем его
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const canRetry = this.state.retryCount < MAX_RETRY_COUNT;

			// Стандартный fallback UI
			return (
				<div
					className='min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in duration-300'
					style={{
						background: 'var(--tg-theme-bg-color)',
						color: 'var(--tg-theme-text-color)',
					}}
				>
					<div className='text-center max-w-md'>
						<div className='text-6xl mb-4'>😔</div>
						<h2 className='text-2xl font-bold mb-4 text-red-500'>
							Что-то пошло не так
						</h2>
						<p className='text-gray-600 mb-6'>
							Произошла неожиданная ошибка. 
							{canRetry ? ' Попробуйте еще раз или ' : ' '}
							Перезагрузите страницу.
						</p>

						{/* Показываем информацию о retry */}
						{this.state.retryCount > 0 && (
							<p className='text-sm text-gray-500 mb-4'>
								Попыток восстановления: {this.state.retryCount}/{MAX_RETRY_COUNT}
							</p>
						)}

						{/* Показываем детали ошибки только в development */}
						{import.meta.env.DEV && this.state.error && (
							<details className='mb-6 text-left'>
								<summary className='cursor-pointer text-sm text-gray-500 mb-2'>
									Детали ошибки (только для разработки)
								</summary>
								<pre className='text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40 text-gray-800'>
									{this.state.error.toString()}
									{this.state.errorInfo?.componentStack}
								</pre>
							</details>
						)}

						<div className='flex flex-col gap-3'>
							<button
								onClick={this.handleReload}
								className='py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:opacity-80 hover:scale-105'
								style={{
									background: 'var(--tg-theme-button-color)',
									color: 'var(--tg-theme-button-text-color)',
								}}
							>
								Перезагрузить страницу
							</button>

							{canRetry && (
								<button
									onClick={this.handleReset}
									className='py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200'
								>
									Попробовать еще раз ({MAX_RETRY_COUNT - this.state.retryCount} попыток осталось)
								</button>
							)}
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
