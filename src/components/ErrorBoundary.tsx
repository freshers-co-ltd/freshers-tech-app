import { Component, type ErrorInfo, type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';

interface ErrorDisplayProps {
	title?: string;
	message?: string;
	buttonText?: string;
	onAction?: () => void;
	errorCode?: string | null;
}

export function ErrorDisplay({
	title = DICT.ERRORS.HTTP.DEFAULT_TITLE,
	message = DICT.ERRORS.HTTP.DEFAULT_MESSAGE,
	buttonText = DICT.ERRORS.HTTP.RETURN,
	onAction = () => window.location.reload(),
	errorCode = null,
}: ErrorDisplayProps) {
	const [imgError, setImgError] = useState(false);

	return (
		<main className="h-screen p-6 flex-col-center bg-muted">
			<div className="flex h-full w-full max-h-[90dvh] flex-col-center">
				{errorCode && !imgError && (
					<img
						src={new URL(`../assets/errors/${errorCode} error.svg`, import.meta.url).href}
						alt={`${errorCode} error illustration`}
						className="h-auto max-h-[60vh] w-full drop-shadow-md"
						onError={() => setImgError(true)}
					/>
				)}
				<div className="space-y-3 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight uppercase text-foreground md:text-4xl">
						{title}
					</h1>
					<p className="max-w-md mx-auto text-lg text-muted-foreground md:text-xl">{message}</p>
				</div>
				<Button variant="default" size="xl" className="mt-12" onClick={onAction}>
					{buttonText}
				</Button>
			</div>
		</main>
	);
}

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		if (import.meta.env.DEV) {
			console.error('ErrorBoundary caught an error:', error, info);
		}
	}

	render() {
		if (this.state.hasError) {
			return <ErrorDisplay />;
		}

		return this.props.children;
	}
}
