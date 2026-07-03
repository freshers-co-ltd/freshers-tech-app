import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/features/auth/types';

const ROLE_DASHBOARDS: Record<UserRole, string> = {
	host: '/host/dashboard',
	cleaner: '/cleaner/dashboard',
	admin: '/admin/dashboard',
};

export interface NavigationState {
	reason?: string;
	from?: string;
	[key: string]: unknown;
}

interface ProtectedRouteProps {
	children?: React.ReactNode;
	allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
	const { user, profile, loading, mfaAction } = useAuth();
	const location = useLocation();

	if (loading) {
		return <Loading />;
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location.pathname }} replace />;
	}

	if (!profile) {
		return <Loading />;
	}

	if (allowedRoles && !allowedRoles.includes(profile.role as UserRole)) {
		return <Navigate to="/error/403" replace />;
	}

	if (mfaAction === 'enroll' && location.pathname !== '/mfa-enroll') {
		return <Navigate to="/mfa-enroll" replace />;
	}

	if (mfaAction === 'challenge' && location.pathname !== '/mfa-challenge' && !import.meta.env.DEV) {
		return <Navigate to="/mfa-challenge" replace />;
	}

	return children ? (children as ReactElement) : <Outlet />;
};

export const PublicRoute = () => {
	const { user, profile, loading } = useAuth();
	const location = useLocation();
	const state = location.state as NavigationState;

	if (loading) {
		return <Loading />;
	}

	const searchParams = new URLSearchParams(location.search);
	const logoutReason = searchParams.get('reason');
	const isLoggingOut = logoutReason === 'inactivity' || logoutReason === 'session_expired';

	if (user && profile && !isLoggingOut) {
		const fallbackPath = state?.from && typeof state.from === 'string' ? state.from : '/dashboard';

		if (
			fallbackPath === location.pathname ||
			(location.pathname === '/' && fallbackPath === '/login')
		) {
			return <Navigate to="/dashboard" replace />;
		}

		return <Navigate to={fallbackPath} replace />;
	}

	return <Outlet />;
};

export const DashboardRedirect = () => {
	const { profile, loading, user } = useAuth();
	const location = useLocation();
	const state = location.state as NavigationState;

	if (loading) {
		return <Loading />;
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: state?.from }} replace />;
	}

	if (!profile) {
		return <Loading />;
	}

	const destination = ROLE_DASHBOARDS[profile.role as UserRole] || '/error/403';

	return <Navigate to={destination} replace />;
};
