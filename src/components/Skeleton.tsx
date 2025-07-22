import React from 'react';

interface SkeletonProps {
	width?: string | number;
	height?: string | number;
	className?: string;
	variant?: 'text' | 'rect' | 'circle' | 'player-card' | 'category-item';
	count?: number;
}

const Skeleton = React.memo<SkeletonProps>(
	({ width, height, className = '', variant = 'rect', count = 1 }) => {
		const baseClasses = 'animate-pulse bg-gray-300 dark:bg-gray-600';

		const getVariantClasses = (variant: SkeletonProps['variant']) => {
			switch (variant) {
				case 'text':
					return 'h-4 rounded';
				case 'circle':
					return 'rounded-full';
				case 'rect':
					return 'rounded';
				case 'player-card':
					return 'rounded-lg';
				case 'category-item':
					return 'rounded-md h-12';
				default:
					return 'rounded';
			}
		};

		const skeletonStyle = {
			width: typeof width === 'number' ? `${width}px` : width,
			height: typeof height === 'number' ? `${height}px` : height,
		};

		const renderSkeleton = () => (
			<div
				className={`${baseClasses} ${getVariantClasses(variant)} ${className}`}
				style={skeletonStyle}
			/>
		);

		if (count === 1) {
			return renderSkeleton();
		}

		return (
			<>
				{Array.from({ length: count }).map((_, index) => (
					<React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
				))}
			</>
		);
	},
);

Skeleton.displayName = 'Skeleton';

// Предустановленные варианты
export const PlayerCardSkeleton = () => (
	<div className='p-4 border rounded-lg'>
		<div className='flex items-center gap-3'>
			<Skeleton variant='circle' width={48} height={48} />
			<div className='flex-1 space-y-2'>
				<Skeleton variant='text' width='60%' />
				<Skeleton variant='text' width='40%' />
			</div>
		</div>
	</div>
);

export const CategoryListSkeleton = () => (
	<div className='space-y-3'>
		{Array.from({ length: 4 }).map((_, index) => (
			<div
				key={index}
				className='flex items-center justify-between p-4 rounded-md'
			>
				<div className='flex items-center gap-3 flex-1'>
					<Skeleton variant='text' width={80} height={20} />
					<div className='flex gap-2'>
						{Array.from({ length: 6 }).map((_, playerIndex) => (
							<Skeleton
								key={playerIndex}
								variant='rect'
								width={32}
								height={40}
								className='rounded-md'
							/>
						))}
					</div>
				</div>
			</div>
		))}
	</div>
);

export const ClubListSkeleton = () => (
	<div className='grid grid-cols-2 gap-4'>
		{Array.from({ length: 4 }).map((_, index) => (
			<div key={index} className='flex flex-col items-center p-4 rounded-lg'>
				<Skeleton variant='circle' width={64} height={64} className='mb-2' />
				<Skeleton variant='text' width='80%' height={16} />
			</div>
		))}
	</div>
);

export const PlayerListSkeleton = () => (
	<div className='space-y-4'>
		{Array.from({ length: 8 }).map((_, index) => (
			<PlayerCardSkeleton key={index} />
		))}
	</div>
);

export default Skeleton;
