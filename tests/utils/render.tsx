import { type RenderOptions, type RenderResult, render } from '@testing-library/react';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CleanerPayProvider } from '@/features/cleanings/CleanerPayContext';
import { CleaningProvider } from '@/features/cleanings/CleaningContext';
import { NotificationProvider } from '@/features/notifications/NotificationContext';
import { PropertyProvider } from '@/features/properties/PropertyContext';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
	initialEntries?: string[];
	routes?: RouteObject[];
}

function AllProviders({
	children,
	routes,
	initialEntries,
}: {
	children: ReactNode;
	routes?: RouteObject[];
	initialEntries?: string[];
}) {
	const router = routes
		? createMemoryRouter(routes, { initialEntries: initialEntries ?? ['/'] })
		: undefined;

	return (
		<AuthProvider>
			<NotificationProvider>
				<PropertyProvider>
					<CleanerPayProvider>
						<CleaningProvider>
							<TooltipProvider>
								{router ? (
									<NuqsAdapter>
										<RouterProvider router={router} />
									</NuqsAdapter>
								) : (
									children
								)}
							</TooltipProvider>
						</CleaningProvider>
					</CleanerPayProvider>
				</PropertyProvider>
			</NotificationProvider>
		</AuthProvider>
	);
}

export function renderWithProviders(
	ui: ReactElement,
	options?: RenderWithProvidersOptions,
): RenderResult {
	return render(ui, {
		...options,
		wrapper: ({ children }) => (
			<AllProviders initialEntries={options?.initialEntries} routes={options?.routes}>
				{children}
			</AllProviders>
		),
	});
}
