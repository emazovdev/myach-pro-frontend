import { useState } from 'react';
import {
	detectPlatform,
	getAvailableShareMethods,
	universalShare,
	type ShareOptions,
} from '../utils/shareUtils';

interface ShareTestPanelProps {
	onTestShare: (initData: string) => Promise<ShareOptions>;
	initData: string;
}

export const ShareTestPanel: React.FC<ShareTestPanelProps> = ({
	onTestShare,
	initData,
}) => {
	const [isVisible, setIsVisible] = useState(false);
	const [testResults, setTestResults] = useState<
		Array<{
			method: string;
			success: boolean;
			error?: string;
		}>
	>([]);
	const [isTesting, setIsTesting] = useState(false);

	const platform = detectPlatform();
	const availableMethods = getAvailableShareMethods();

	const testSpecificMethod = async (methodName: string) => {
		setIsTesting(true);
		try {
			const shareOptions = await onTestShare(initData);

			let result;
			switch (methodName) {
				case 'webShare':
					if ('share' in navigator) {
						try {
							await navigator.share({
								text: shareOptions.text,
								files: [
									new File(
										[shareOptions.imageBlob],
										`test-${shareOptions.clubName}.jpg`,
										{ type: 'image/jpeg' },
									),
								],
							});
							result = { success: true };
						} catch (error: any) {
							result = { success: false, error: error.message };
						}
					} else {
						result = {
							success: false,
							error: 'Web Share API не поддерживается',
						};
					}
					break;

				case 'clipboard':
					try {
						if ('clipboard' in navigator && 'write' in navigator.clipboard) {
							const clipboardItem = new ClipboardItem({
								'image/jpeg': shareOptions.imageBlob,
							});
							await navigator.clipboard.write([clipboardItem]);
							result = { success: true };
						} else {
							await navigator.clipboard.writeText(shareOptions.text);
							result = { success: true };
						}
					} catch (error: any) {
						result = { success: false, error: error.message };
					}
					break;

				case 'download':
					try {
						const url = URL.createObjectURL(shareOptions.imageBlob);
						const link = document.createElement('a');
						link.href = url;
						link.download = `test-${shareOptions.clubName}.jpg`;
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
						URL.revokeObjectURL(url);
						result = { success: true };
					} catch (error: any) {
						result = { success: false, error: error.message };
					}
					break;

				default:
					result = await universalShare(shareOptions);
			}

			setTestResults((prev) => [
				...prev,
				{
					method: methodName,
					success: result.success,
					error: result.error,
				},
			]);
		} catch (error: any) {
			setTestResults((prev) => [
				...prev,
				{
					method: methodName,
					success: false,
					error: error.message,
				},
			]);
		} finally {
			setIsTesting(false);
		}
	};

	const testAllMethods = async () => {
		setTestResults([]);
		const availableMethodNames = availableMethods
			.filter((m) => m.available)
			.map((m) => m.method);

		for (const methodName of availableMethodNames) {
			await testSpecificMethod(methodName);
			// Пауза между тестами
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	};

	if (!import.meta.env.DEV) {
		return null;
	}

	return (
		<div className='fixed bottom-4 left-4 z-50'>
			<button
				onClick={() => setIsVisible(!isVisible)}
				className='bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg'
			>
				🧪 Тест шэринга
			</button>

			{isVisible && (
				<div className='mt-2 bg-white rounded-lg shadow-xl p-4 max-w-sm border'>
					<h3 className='font-bold text-sm mb-2'>Тестирование шэринга</h3>

					<div className='mb-3 text-xs'>
						<p>
							<strong>Платформа:</strong> {platform}
						</p>
						<p>
							<strong>Доступно методов:</strong>{' '}
							{availableMethods.filter((m) => m.available).length}
						</p>
					</div>

					<div className='mb-3'>
						<button
							onClick={testAllMethods}
							disabled={isTesting}
							className='w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold disabled:opacity-50'
						>
							{isTesting ? 'Тестируем...' : 'Тест всех методов'}
						</button>
					</div>

					<div className='mb-3 space-y-1'>
						{availableMethods.map((method) => (
							<button
								key={method.method}
								onClick={() => testSpecificMethod(method.method)}
								disabled={!method.available || isTesting}
								className={`w-full px-2 py-1 rounded text-xs font-bold ${
									method.available
										? 'bg-green-100 text-green-800 hover:bg-green-200'
										: 'bg-gray-100 text-gray-500 cursor-not-allowed'
								}`}
							>
								{method.name} {method.available ? '✓' : '✗'}
							</button>
						))}
					</div>

					{testResults.length > 0 && (
						<div className='border-t pt-2'>
							<h4 className='text-xs font-bold mb-1'>Результаты:</h4>
							<div className='space-y-1 max-h-32 overflow-y-auto'>
								{testResults.map((result, index) => (
									<div
										key={index}
										className={`text-xs p-1 rounded ${
											result.success
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'
										}`}
									>
										<strong>{result.method}:</strong>{' '}
										{result.success ? '✅ Успешно' : `❌ ${result.error}`}
									</div>
								))}
							</div>
						</div>
					)}

					<button
						onClick={() => setTestResults([])}
						className='w-full mt-2 bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs'
					>
						Очистить результаты
					</button>
				</div>
			)}
		</div>
	);
};
