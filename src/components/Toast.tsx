import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ExternalToast } from 'sonner';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

interface ToastOptions extends ExternalToast {
	duration?: number;
}

type ToastStyle = React.CSSProperties & {
	'--toast-duration'?: string;
};

const addDurationStyle = (options?: ToastOptions): ToastStyle | undefined => {
	if (!options) {
		return undefined;
	}
	const duration = options.duration ?? 5000;
	return {
		...options.style,
		'--toast-duration': `${duration}ms`,
	};
};

function createToastWithDuration() {
	type ToastMessage = React.ReactNode;
	type ToastId = string | number;

	type ToastType = {
		(message: ToastMessage, options?: ToastOptions): ToastId;
		success(message: ToastMessage, options?: ToastOptions): ToastId;
		error(message: ToastMessage, options?: ToastOptions): ToastId;
		info(message: ToastMessage, options?: ToastOptions): ToastId;
		warning(message: ToastMessage, options?: ToastOptions): ToastId;
		loading(message: ToastMessage, options?: ToastOptions): ToastId;
		dismiss(id?: ToastId): ToastId;
		promise(promise: Promise<unknown>, options?: ToastOptions): unknown;
		custom(jsx: (id: ToastId) => React.ReactElement, options?: ToastOptions): ToastId;
		getHistory(): unknown;
		getToasts(): unknown;
	};

	const wrapOptions = (options?: ToastOptions): ToastOptions | undefined => {
		if (!options) {
			return undefined;
		}
		return { ...options, style: addDurationStyle(options) };
	};

	const wrappedToast: ToastType = (message, options) => {
		return sonnerToast(message, wrapOptions(options));
	};

	wrappedToast.success = (message, options) => {
		return sonnerToast.success(message, wrapOptions(options));
	};

	wrappedToast.error = (message, options) => {
		return sonnerToast.error(message, wrapOptions(options));
	};

	wrappedToast.info = (message, options) => {
		return sonnerToast.info(message, wrapOptions(options));
	};

	wrappedToast.warning = (message, options) => {
		return sonnerToast.warning(message, wrapOptions(options));
	};

	wrappedToast.loading = (message, options) => {
		return sonnerToast.loading(message, options);
	};

	wrappedToast.dismiss = sonnerToast.dismiss;
	wrappedToast.promise = sonnerToast.promise;
	wrappedToast.custom = sonnerToast.custom;
	wrappedToast.getHistory = sonnerToast.getHistory;
	wrappedToast.getToasts = sonnerToast.getToasts;

	return wrappedToast;
}

export const toast = createToastWithDuration();

export const Toaster = () => {
	return (
		<>
			<style>{`
				[data-sonner-toast]:not([data-type="loading"]):not([style*="--toast-duration: Infinityms"])::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.05);
					transform-origin: right;
					animation: toast-progress var(--toast-duration, 5000ms) linear forwards;
					pointer-events: none;
					z-index: 0;
				}
				[data-sonner-toast]:not([data-type="loading"]) > * {
					position: relative;
					z-index: 1;
				}
				@keyframes toast-progress {
					from { transform: scaleX(0); }
					to { transform: scaleX(1); }
				}
			`}</style>
			<SonnerToaster
				position="top-center"
				duration={5000}
				expand={true}
				visibleToasts={6}
				gap={12}
				closeButton
				toastOptions={{
					unstyled: true,
					classNames: {
						toast:
							'group relative flex items-center w-[420px] p-2 pr-12 rounded-xl border shadow-sm transition-all overflow-hidden',
						content: 'flex flex-col gap-1 ml-3',
						title: 'text-[15px] font-bold leading-none',
						description: 'text-[13px] font-medium leading-snug text-black/80',

						success: 'bg-green-50 border-green-400 text-green-600',
						error: 'bg-red-50 border-red-400 text-red-600',
						info: 'bg-blue-50 border-blue-400 text-blue-600',
						warning: 'bg-yellow-50 border-yellow-400 text-yellow-500',
						loading: 'bg-muted border-muted-foreground text-muted-foreground',

						icon: 'flex-center size-7 flex-shrink-0',
						loader:
							'flex items-center !transform-none justify-center size-7 !static [&_svg]:h-full [&_svg]:w-full',
						closeButton:
							'!absolute !right-0 !top-1/2 !-translate-y-1/2 !left-auto !flex !items-center !justify-center ' +
							'!w-12 !h-12 !bg-transparent !text-current !border-none !opacity-100 ' +
							'[&_svg]:scale-[1.8] [&_svg]:transition-transform hover:scale-125 hover:stroke-[5px] !transition-all cursor-pointer',
					},
				}}
				icons={{
					success: <CheckCircle2 className="size-7" />,
					error: <AlertCircle className="size-7 text-red-600" />,
					info: <Info className="size-7 text-blue-600" />,
					warning: <AlertTriangle className="size-7 text-yellow-500" />,
					loading: <Loader2 className="animate-spin" />,
				}}
			/>
		</>
	);
};

export function ToastDebugger() {
	const hasFired = useRef(false);

	useEffect(() => {
		if (hasFired.current) {
			return;
		}
		hasFired.current = true;
		const options = { duration: Infinity };

		toast.success('Success: Operation completed', { duration: 5000 });
		toast.success('Success: Operation completed', options);
		toast.error('Error: Something went wrong', options);
		toast.info('Info: System update available', options);
		toast.warning('Warning: Storage almost full', options);
		toast.loading('Loading: Synchronizing data...', options);
	}, []);

	return null;
}
