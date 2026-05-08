import { type ComponentType, lazy, type ReactElement, Suspense } from 'react';
import {
	createBrowserRouter,
	Navigate,
	Outlet,
	type RouteObject,
	useLocation,
} from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/features/auth/AuthContext';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { LoginPage } from '@/pages/auth/Login';
import { SetPasswordPage } from '@/pages/auth/SetPassword';
import { SignupPage } from '@/pages/auth/Signup';
import { ErrorPage } from '@/pages/Error';
import type { UserRole } from './features/auth/authService';

const ROLE_DASHBOARDS: Record<UserRole, string> = {
	host: '/host/dashboard',
	cleaner: '/cleaner/dashboard',
	admin: '/admin/dashboard',
};

export const lazyLoad = <T extends Record<string, unknown>, U extends string>(
	importFn: () => Promise<{ [K in U]: ComponentType<T> }>,
	name: U,
): ReactElement => {
	const LazyComponent = lazy(async () => {
		const module = await importFn();
		const Component = module[name];
		if (!Component) {
			throw new Error(`Component "${name}" not found in module.`);
		}
		return { default: Component as ComponentType<T> };
	});

	return (
		<Suspense fallback={<Loading />}>
			<LazyComponent {...({} as T)} />
		</Suspense>
	);
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
	const { user, profile, loading } = useAuth();
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
	const isLoggingOut = searchParams.get('reason') === 'inactivity';

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
							{ path: 'set-password', element: <SetPasswordPage /> },
						],
					},
				],
			},
			{
				path: 'auth/callback',
				element: lazyLoad(() => import('@/pages/auth/Callback'), 'AuthCallback'),
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
