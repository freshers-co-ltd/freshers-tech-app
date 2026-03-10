import { type ComponentType, lazy, type ReactElement, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthLayout } from '@/layouts/AuthLayout';
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

interface ProtectedRouteProps {
	children: React.ReactNode;
	allowedRoles?: ('host' | 'cleaner' | 'admin')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
	const { user, profile, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Verifying session...</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	if (allowedRoles) {
		if (!profile) {
			return <Navigate to="/login" replace />;
		}
		if (!allowedRoles.includes(profile.role)) {
			return <Navigate to="/unauthorised" replace />;
		}
	}

	return <>{children}</>;
};

export const PublicRoute = () => {
	const { user, loading } = useAuth();

	if (loading) {
		return <Loading />;
	}

	if (user) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
};

export const DashboardRedirect = () => {
	const { profile, loading, user } = useAuth();

	if (loading) {
		return <Loading />;
	}
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	const role = profile?.role || (user.user_metadata?.role as UserRole);

	if (!role) {
		console.error('User role is missing. User ID:', user.id);
		return <Navigate to="/unauthorised" replace />;
	}

	switch (role) {
		case 'host':
			return <Navigate to="/host/dashboard" replace />;
		case 'cleaner':
			return <Navigate to="/cleaner/dashboard" replace />;
		case 'admin':
			return <Navigate to="/admin/dashboard" replace />;
		default:
			return <Navigate to="/unauthorised" replace />;
	}
};

export const router = createBrowserRouter([
	{
		errorElement: <ErrorPage />,
		children: [
			{
				path: '/test-error/:code',
				loader: ({ params }) => {
					throw new Response('', { status: Number(params.code) || 500 });
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
						<Outlet />
					</ProtectedRoute>
				),
				children: [
					{
						path: 'dashboard',
						element: lazyLoad(() => import('@/pages/host/Dashboard'), 'HostDashboardPage'),
					},
				],
			},
			{
				path: '/cleaner',
				element: (
					<ProtectedRoute allowedRoles={['cleaner']}>
						<Outlet />
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
						<Outlet />
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
			{
				path: 'unauthorised',
				element: <div>You do not have permission to view this page.</div>,
			},
		],
	},
]);
