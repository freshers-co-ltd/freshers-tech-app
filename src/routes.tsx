import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/lib/AuthContext';
import { AdminDashboardPage } from '@/pages/admin/Dashboard';
import { AuthCallback } from '@/pages/auth/Callback';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { LoginPage } from '@/pages/auth/Login';
import { ResetPasswordPage } from '@/pages/auth/ResetPassword';
import { SignupPage } from '@/pages/auth/Signup';
import { CleanerDashboardPage } from '@/pages/cleaner/Dashboard';
import { ErrorPage } from '@/pages/Error';
import { HostDashboardPage } from '@/pages/host/Dashboard';
import type { UserRole } from './lib/authService';

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

	if (user && !profile) {
		return <Loading />;
	}

	// Fallback if profile fetch is still propagating but user metadata exists
	const role = profile?.role || (user.user_metadata?.role as UserRole);

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
			{ path: 'auth/callback', element: <AuthCallback /> },
			{
				element: (
					<ProtectedRoute>
						<AuthLayout />
					</ProtectedRoute>
				),
				children: [{ path: 'update-password', element: <ResetPasswordPage /> }],
			},
			{
				path: '/host',
				element: (
					<ProtectedRoute allowedRoles={['host']}>
						<Outlet />
					</ProtectedRoute>
				),
				children: [{ path: 'dashboard', element: <HostDashboardPage /> }],
			},
			{
				path: '/cleaner',
				element: (
					<ProtectedRoute allowedRoles={['cleaner']}>
						<Outlet />
					</ProtectedRoute>
				),
				children: [{ path: 'dashboard', element: <CleanerDashboardPage /> }],
			},
			{
				path: '/admin',
				element: (
					<ProtectedRoute allowedRoles={['admin']}>
						<Outlet />
					</ProtectedRoute>
				),
				children: [{ path: 'dashboard', element: <AdminDashboardPage /> }],
			},
			{
				path: '/dashboard',
				element: <DashboardRedirect />,
			},
			{ path: 'unauthorised', element: <div>You do not have permission to view this page.</div> },
		],
	},
]);
