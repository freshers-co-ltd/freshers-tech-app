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
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { LoginPage } from '@/pages/auth/Login';
import { SignupPage } from '@/pages/auth/Signup';
import { ErrorPage } from '@/pages/Error';
import type { UserRole } from './features/auth/authService';

const lazyLoad = <T extends Record<string, unknown>>(
	importFn: () => Promise<Record<string, ComponentType<T>>>,
	name: string,
): ReactElement => {
	const LazyComponent = lazy(async () => {
		const module = await importFn();
		const Component = module[name];
		if (!Component) {
			throw new Error(`Component "${name}" not found in module.`);
		}
		return { default: Component };
	});

	const ComponentToRender = LazyComponent as unknown as ComponentType<Record<string, unknown>>;

	return (
		<Suspense fallback={<Loading />}>
			<ComponentToRender />
		</Suspense>
	);
};

export interface NavigationState {
	reason?: string;
	from?: string;
	[key: string]: unknown;
}

const useForwardState = (extraData: NavigationState = {}): NavigationState => {
	const location = useLocation();
	const currentState = (location.state as NavigationState) || {};
	return { ...currentState, ...extraData };
};

interface ProtectedRouteProps {
	children?: React.ReactNode;
	allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
	const { user, profile, loading } = useAuth();
	const location = useLocation();
	const state = useForwardState({ from: location.pathname });

	if (loading || (user && !profile && navigator.onLine)) {
		return <Loading />;
	}

	if (!user) {
		return <Navigate to="/login" state={state} replace />;
	}

	if (allowedRoles && (!profile || !allowedRoles.includes(profile.role as UserRole))) {
		return <Navigate to="/error/403" replace />;
	}

	return children ? children : <Outlet />;
};

export const PublicRoute = () => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <Loading />;
	}

	console.log('[PublicRoute] Auth State:', { loading, user: !!user, path: location.pathname });

	const searchParams = new URLSearchParams(location.search);
	const isLoggingOut = searchParams.get('reason') === 'inactivity';

	if (user && !isLoggingOut) {
		const state = location.state as NavigationState;
		const fallbackPath = state?.from && typeof state.from === 'string' ? state.from : '/dashboard';

		return <Navigate to={fallbackPath} replace />;
	}

	return <Outlet />;
};

export const DashboardRedirect = () => {
	const { profile, loading, user } = useAuth();
	const state = useForwardState();

	if (loading) {
		return <Loading />;
	}
	if (!user) {
		return <Navigate to="/login" state={state} replace />;
	}

	const role = (profile?.role || user.user_metadata?.role) as UserRole;
	let destination = '/error/403';

	switch (role) {
		case 'host':
			destination = '/host/dashboard';
			break;
		case 'cleaner':
			destination = '/cleaner/dashboard';
			break;
		case 'admin':
			destination = '/admin/dashboard';
			break;
	}

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
						<DashboardLayout />
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
				],
			},
			{
				path: '/cleaner',
				element: (
					<ProtectedRoute allowedRoles={['cleaner']}>
						<DashboardLayout />
					</ProtectedRoute>
				),
				children: [
					{
						path: 'dashboard',
						element: lazyLoad(() => import('@/pages/cleaner/Dashboard'), 'CleanerDashboardPage'),
					},
				],
			},
			{
				path: '/admin',
				element: (
					<ProtectedRoute allowedRoles={['admin']}>
						<DashboardLayout />
					</ProtectedRoute>
				),
				children: [
					{
						path: 'dashboard',
						element: lazyLoad(() => import('@/pages/admin/Dashboard'), 'AdminDashboardPage'),
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
