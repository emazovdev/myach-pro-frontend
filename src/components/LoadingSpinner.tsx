import React from 'react';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	message?: string;
	fullScreen?: boolean;
	color?: string;
	className?: string;
}

const LoadingSpinner = React.memo<LoadingSpinnerProps>(
	({
		size = 'md',
		message,
		fullScreen = false,
		color = 'var(--tg-theme-button-color)',
		className = '',
	}) => {
		const sizeClasses = {
			sm: 'w-4 h-4 border-2',
			md: 'w-8 h-8 border-2',
			lg: 'w-12 h-12 border-3',
		};

		const containerClasses = fullScreen
			? 'min-h-screen flex flex-col items-center justify-center p-4'
			: 'flex flex-col items-center justify-center p-4';

		const spinner = (
			<div
				className={`${sizeClasses[size]} animate-spin border-gray-300 border-t-transparent rounded-full ${className}`}
				style={{ borderTopColor: color }}
				role='status'
				aria-label='Загрузка'
			/>
		);

		const content = (
			<div className={`${containerClasses} animate-in fade-in duration-200`}>
				{spinner}
				{message && (
					<p
						className='mt-3 text-center font-medium animate-in slide-in-from-bottom-2 duration-300'
						style={{ color: 'var(--tg-theme-text-color)' }}
					>
						{message}
					</p>
				)}
			</div>
		);

		if (fullScreen) {
			return (
				<div
					style={{ background: 'var(--tg-theme-bg-color)' }}
					className='animate-in fade-in duration-200'
				>
					{content}
				</div>
			);
		}

		return content;
	},
);

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
