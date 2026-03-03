import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/Login';
import { ResetPasswordPage } from '@/pages/ResetPassword';
import { SignupPage } from '@/pages/Signup';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <AuthLayout />,
		children: [
			{ index: true, element: <LoginPage /> },
			{ path: 'login', element: <LoginPage /> },
			{ path: 'signup', element: <SignupPage /> },
			{ path: 'resetpassword', element: <ResetPasswordPage /> },
		],
	},
]);
