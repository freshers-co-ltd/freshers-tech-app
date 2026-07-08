import { registerSW } from 'virtual:pwa-register';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/Toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/AuthContext';
import { CleanerPayProvider } from '@/features/cleanings/CleanerPayContext';
import { CleaningProvider } from '@/features/cleanings/CleaningContext';
import { NotificationProvider } from '@/features/notifications/NotificationContext';
import { PropertyProvider } from '@/features/properties/PropertyContext';
import { router } from '@/routes.tsx';
import '@/index.css';

const updateSW = registerSW({
	onNeedRefresh() {
		if (confirm('New content available. Reload?')) {
			updateSW(true);
		}
	},
});

navigator.serviceWorker?.addEventListener('message', (event) => {
	if (event.data?.type === 'FORCE_UPDATE') {
		window.location.reload();
	}
});

const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
	<StrictMode>
		<ErrorBoundary>
			<AuthProvider>
				<NotificationProvider>
					<PropertyProvider>
						<CleaningProvider>
							<CleanerPayProvider>
								<TooltipProvider>
									<NuqsAdapter>
										<RouterProvider router={router} />
									</NuqsAdapter>
									<Toaster />
								</TooltipProvider>
							</CleanerPayProvider>
						</CleaningProvider>
					</PropertyProvider>
				</NotificationProvider>
			</AuthProvider>
		</ErrorBoundary>
	</StrictMode>,
);
