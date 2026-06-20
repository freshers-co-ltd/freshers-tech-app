import type { ReactElement } from 'react';
import {
	createBrowserRouter,
	Navigate,
	Outlet,
	type RouteObject,
	useLocation,
} from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/features/auth/types';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { lazyLoad } from '@/lib/LazyLoad';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { LoginPage } from '@/pages/auth/Login';
import { MfaChallengePage } from '@/pages/auth/MfaChallenge';
import { MfaEnrollPage } from '@/pages/auth/MfaEnroll';
import { SetPasswordPage } from '@/pages/auth/SetPassword';
import { SignupPage } from '@/pages/auth/Signup';
import { ErrorPage } from '@/pages/Error';

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

	if (mfaAction === 'challenge' && location.pathname !== '/mfa-challenge') {
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

const routesConfig: RouteObject[] = [
	{
		errorElement: <ErrorPage />,
		children: [
			{
				path: '/error/:code',
				loader: ({ params }) => {
					const statusCode = Number(params.code);
					if (Number.isNaN(statusCode)) {
						throw new Response('Not Found', { status: 404 });
					}
					throw new Response('', { status: statusCode });
				},
				errorElement: <ErrorPage />,
			},
			{
				path: '/',
				element: <PublicRoute />,
				children: [
					{
						element: <AuthLayout />,
						children: [
							{ index: true, element: <LoginPage /> },
							{ path: 'login', element: <LoginPage /> },
							{ path: 'signup', element: <SignupPage /> },
							{ path: 'forgot-password', element: <ForgotPasswordPage /> },
						],
					},
				],
			},
			{
				path: 'set-password',
				element: <SetPasswordPage />,
			},
			{
				element: (
					<ProtectedRoute>
						<Outlet />
					</ProtectedRoute>
				),
				children: [
					{
						path: 'mfa-enroll',
						element: <MfaEnrollPage />,
					},
					{
						path: 'mfa-challenge',
						element: <MfaChallengePage />,
					},
				],
			},
			{
				path: 'auth/callback',
				element: lazyLoad(() => import('@/pages/auth/Callback'), 'AuthCallback'),
			},
			{
				path: 'privacy',
				element: lazyLoad(() => import('@/pages/Privacy'), 'PrivacyPage'),
			},
			{
				element: (
					<ProtectedRoute>
						<AuthLayout />
					</ProtectedRoute>
				),
				children: [
					{
						path: 'update-password',
						element: lazyLoad(() => import('@/pages/auth/ResetPassword'), 'ResetPasswordPage'),
					},
				],
			},
			{
				path: '/host',
				element: (
					<ProtectedRoute allowedRoles={['host']}>
						<AppLayout />
					</ProtectedRoute>
				),
				children: [
					{
						index: true,
						element: <Navigate to="dashboard" replace />,
					},
					{
						path: 'dashboard',
						element: lazyLoad(() => import('@/pages/host/Dashboard'), 'HostDashboardPage'),
					},
					{
						path: 'cleanings',
						element: lazyLoad(() => import('@/pages/host/Cleanings'), 'HostCleaningsPage'),
					},
					{
						path: 'properties',
						element: lazyLoad(() => import('@/pages/host/Properties'), 'HostPropertiesPage'),
					},
					{
						path: 'account',
						element: lazyLoad(() => import('@/pages/Account'), 'AccountPage'),
					},
					{
						path: 'notifications',
						element: lazyLoad(() => import('@/pages/Notifications'), 'NotificationsPage'),
					},
				],
			},
			{
				path: '/cleaner',
				element: (
					<ProtectedRoute allowedRoles={['cleaner']}>
						<AppLayout />
					</ProtectedRoute>
				),
				children: [
					{
						index: true,
						element: <Navigate to="dashboard" replace />,
					},
					{
						path: 'dashboard',
						element: lazyLoad(() => import('@/pages/cleaner/Dashboard'), 'CleanerDashboardPage'),
					},
					{
						path: 'cleanings',
						element: lazyLoad(() => import('@/pages/cleaner/Cleanings'), 'CleanerCleaningsPage'),
					},
					{
						path: 'account',
						element: lazyLoad(() => import('@/pages/Account'), 'AccountPage'),
					},
					{
						path: 'notifications',
						element: lazyLoad(() => import('@/pages/Notifications'), 'NotificationsPage'),
					},
				],
			},
			{
				path: '/admin',
				element: (
					<ProtectedRoute allowedRoles={['admin']}>
						<AppLayout />
					</ProtectedRoute>
				),
				children: [
					{
						index: true,
						element: <Navigate to="dashboard" replace />,
					},
					{
						path: 'dashboard',
						element: lazyLoad(() => import('@/pages/admin/Dashboard'), 'AdminDashboardPage'),
					},
					{
						path: 'users',
						element: lazyLoad(() => import('@/pages/admin/Users'), 'AdminUsersPage'),
					},
					{
						path: 'users/hosts/:id',
						element: lazyLoad(() => import('@/pages/admin/HostDetail'), 'AdminHostDetailPage'),
					},
					{
						path: 'users/cleaners/:id',
						element: lazyLoad(
							() => import('@/pages/admin/CleanerDetail'),
							'AdminCleanerDetailPage',
						),
					},
					{
						path: 'cleanings',
						element: lazyLoad(() => import('@/pages/admin/Cleanings'), 'AdminCleaningsPage'),
					},
					{
						path: 'analytics',
						element: lazyLoad(() => import('@/pages/admin/Analytics'), 'AdminAnalyticsPage'),
					},
					{
						path: 'account',
						element: lazyLoad(() => import('@/pages/Account'), 'AccountPage'),
					},
					{
						path: 'notifications',
						element: lazyLoad(() => import('@/pages/Notifications'), 'NotificationsPage'),
					},
				],
			},
			{
				path: '/dashboard',
				element: <DashboardRedirect />,
			},
		],
	},
];

export const router = createBrowserRouter(routesConfig);
