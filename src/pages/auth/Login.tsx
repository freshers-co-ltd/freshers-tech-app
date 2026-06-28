import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import cleanersImg from '@/assets/images/cleaners.webp';
import { Logo } from '@/components/Logo';
import { toast } from '@/components/Toast';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const reason = searchParams.get('reason');

		if (reason === 'inactivity') {
			toast.warning(DICT.AUTH.LOGIN.TOAST_INACTIVITY, {
				id: 'inactivity-toast',
				duration: Infinity,
			});

			navigate(location.pathname, {
				replace: true,
				state: location.state,
			});
		}

		if (reason === 'session_expired') {
			toast.error(DICT.AUTH.LOGIN.TOAST_SESSION_EXPIRED, {
				id: 'session-expired-toast',
				duration: Infinity,
			});

			navigate(location.pathname, {
				replace: true,
				state: location.state,
			});
		}
	}, [searchParams, navigate, location.pathname, location.state]);

	return (
		<div className="relative grid w-full min-h-dvh lg:grid-cols-2 bg-background overflow-hidden">
			<div className="relative flex-col-center p-4 md:p-8">
				<Logo className="w-[300px] mb-14" />

				<FormContainer variant="page" className="w-full max-w-sm lg:max-w-xs">
					<LoginForm />
				</FormContainer>
			</div>

			<div className="relative hidden h-full bg-muted lg:block">
				<img
					src={cleanersImg}
					alt={DICT.AUTH.LOGIN.ALT_IMAGE}
					className="absolute inset-0 size-full object-cover"
				/>
			</div>
		</div>
	);
}
