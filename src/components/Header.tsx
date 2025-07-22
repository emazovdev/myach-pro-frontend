import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
	title: string;
	showBackButton?: boolean;
	backPath?: string;
	rightElement?: React.ReactNode;
	subtitle?: string;
}

const Header = React.memo<HeaderProps>(
	({ title, showBackButton = true, backPath, rightElement, subtitle }) => {
		const navigate = useNavigate();

		const handleBack = () => {
			if (backPath) {
				navigate(backPath);
			} else {
				window.history.back();
			}
		};

		return (
			<div
				className='sticky top-0 z-40 border-b'
				style={{
					background: 'var(--tg-theme-bg-color)',
					borderColor: 'var(--tg-theme-section-separator-color)',
				}}
			>
				<div className='flex items-center justify-between p-4'>
					<div className='flex items-center gap-4 flex-1'>
						{showBackButton && (
							<button
								onClick={handleBack}
								className='text-lg transition-opacity hover:opacity-70 p-1'
								style={{ color: 'var(--tg-theme-link-color)' }}
								aria-label='Назад'
							>
								← Назад
							</button>
						)}

						<div className='flex-1'>
							<h1
								className='text-xl font-bold'
								style={{ color: 'var(--tg-theme-text-color)' }}
							>
								{title}
							</h1>
							{subtitle && (
								<p
									className='text-sm mt-1'
									style={{ color: 'var(--tg-theme-hint-color)' }}
								>
									{subtitle}
								</p>
							)}
						</div>
					</div>

					{rightElement && <div className='flex-shrink-0'>{rightElement}</div>}
				</div>
			</div>
		);
	},
);

Header.displayName = 'Header';

export default Header;
