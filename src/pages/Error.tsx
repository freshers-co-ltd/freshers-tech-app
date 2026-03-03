'use client';

import { useState } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { DICT } from '@/dictionary';

export function ErrorPage() {
	const error = useRouteError();
	console.error(error);

	let title: string = DICT.ERRORS.HTTP.DEFAULT_TITLE;
	let message: string = DICT.ERRORS.HTTP.DEFAULT_MESSAGE;
	let errorCode: string | null = null;

	if (isRouteErrorResponse(error)) {
		errorCode = error.status.toString();

		const knownError = DICT.ERRORS.HTTP[error.status as keyof typeof DICT.ERRORS.HTTP];

		if (knownError && typeof knownError === 'object') {
			title = knownError.title;
			message = knownError.msg;
		} else {
			title = `Error ${error.status}`;
			message = error.statusText || message;
		}
	} else if (error instanceof Error) {
		message = error.message || message;
	}

	const [imgError, setImgError] = useState(false);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans antialiased bg-error-pattern">
			<div className="flex w-full max-w-lg flex-col items-center gap-8">
				{errorCode && !imgError && (
					<img
						src={`/${errorCode} error.svg`}
						alt={`${errorCode} error illustration`}
						className="h-64 w-auto drop-shadow-sm transition-opacity duration-300"
						onError={() => {
							setImgError(true);
						}}
					/>
				)}

				<div className="space-y-3">
					<h1 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900 md:text-4xl">
						{title}
					</h1>
					<p className="mx-auto max-w-md text-lg text-slate-500 md:text-xl">{message}</p>
				</div>

				<Link
					to="/dashboard"
					className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-blue-300 active:scale-95">
					{DICT.ERRORS.HTTP.BACK_TO_SAFETY}
				</Link>
			</div>
		</main>
	);
}
