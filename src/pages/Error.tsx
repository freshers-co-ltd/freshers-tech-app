'use client';

import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { ErrorDisplay } from '@/components/ErrorBoundary';
import { DICT } from '@/dictionary';

export function ErrorPage() {
	const navigate = useNavigate();
	const error = useRouteError();

	if (import.meta.env.DEV) {
		console.error(error);
	}

	let title: string = DICT.ERRORS.HTTP.DEFAULT_TITLE;
	let message: string = DICT.ERRORS.HTTP.DEFAULT_MESSAGE;
	let errorCode: string | null = null;

	if (isRouteErrorResponse(error)) {
		errorCode = error.status.toString();

		const knownError = DICT.ERRORS.HTTP[error.status as keyof typeof DICT.ERRORS.HTTP];

		if (knownError && typeof knownError === 'object') {
			title = knownError.TITLE;
			message = knownError.MESSAGE;
		} else {
			title = `Error ${error.status}`;
			message = error.statusText || message;
		}
	} else if (error instanceof Error) {
		message = error.message || message;
	}

	return (
		<ErrorDisplay
			title={title}
			message={message}
			errorCode={errorCode}
			onAction={() => navigate('/dashboard')}
		/>
	);
}
