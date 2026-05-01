'use client';

import { useState } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';

export function ErrorPage() {
	const navigate = useNavigate();
	const error = useRouteError();
	console.error(error);

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

	const [imgError, setImgError] = useState(false);

	return (
		<main className="h-screen p-6 flex-col-center bg-slate-50 ">
			<div className="flex h-full w-full max-h-[90dvh] flex-col-center">
				{errorCode && !imgError && (
					<img
						src={new URL(`../assets/errors/${errorCode} error.svg`, import.meta.url).href}
						alt={`${errorCode} error illustration`}
						className="h-auto max-h-[60vh] w-full drop-shadow-md"
						onError={() => {
							setImgError(true);
						}}
					/>
				)}

				<div className="space-y-3 text-center">
					<h1 className="text-3xl font-extrabold tracking-tight uppercase text-foreground md:text-4xl">
						{title}
					</h1>
					<p className="max-w-md mx-auto text-lg text-muted-foreground md:text-xl">{message}</p>
				</div>

				<Button
					variant="default"
					size="xl"
					className="mt-12"
					onClick={() => navigate('/dashboard')}>
					{DICT.ERRORS.HTTP.RETURN}
				</Button>
			</div>
		</main>
	);
}
