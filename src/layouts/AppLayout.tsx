import { Outlet } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useInactivityLogout } from '@/features/auth/useInactivityLogout';
import { useHeartbeat } from '@/hooks/useHeartbeat';

export function AppLayout() {
	const { user } = useAuth();
	useInactivityLogout();
	useHeartbeat(user?.id);

	return (
		<div className="relative min-h-screen">
			<Navigation />

			<main className="pb-24 md:pb-0 md:pt-16">
				<Outlet />
			</main>
		</div>
	);
}
