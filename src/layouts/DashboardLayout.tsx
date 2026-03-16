import { Outlet } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useInactivityLogout } from '@/features/auth/useInactivityLogout';

export function DashboardLayout() {
	useInactivityLogout();
	return (
		<div className="relative min-h-screen">
			<Navigation />

			<main className="pb-24 md:pb-0 md:pt-16">
				<Outlet />
			</main>
		</div>
	);
}
