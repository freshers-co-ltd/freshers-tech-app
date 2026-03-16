import { Outlet, ScrollRestoration } from 'react-router-dom';

export const AuthLayout = () => {
	return (
		<div className="flex flex-col min-h-dvh bg-background font-sans antialiased text-foreground">
			<main className="flex-1 flex flex-col">
				<Outlet />
			</main>
			<ScrollRestoration />
		</div>
	);
};
