import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { DashboardRedirect, ProtectedRoute, PublicRoute } from '@/features/auth/RouteGuards';
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
				path: 'update-password',
				element: lazyLoad(() => import('@/pages/auth/ResetPassword'), 'ResetPasswordPage'),
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
