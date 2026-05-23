import { registerSW } from 'virtual:pwa-register';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/Toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/AuthContext';
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
	onOfflineReady() {
		console.log('App ready to work offline');
	},
});

const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
	<StrictMode>
		<AuthProvider>
			<NotificationProvider>
				<PropertyProvider>
					<CleaningProvider>
						<TooltipProvider>
							<NuqsAdapter>
								<RouterProvider router={router} />
							</NuqsAdapter>
							<Toaster />
						</TooltipProvider>
					</CleaningProvider>
				</PropertyProvider>
			</NotificationProvider>
		</AuthProvider>
	</StrictMode>,
);
