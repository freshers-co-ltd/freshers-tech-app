import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import cleanersImg from '@/assets/images/cleaners.jpg';
import logoImg from '@/assets/images/logo.png';
import { FormContainer } from '@/components/ui/form-container';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		const reason = searchParams.get('reason');

		if (reason === 'inactivity') {
			toast.warning('You have been logged out due to inactivity.', {
				id: 'inactivity-toast',
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
				<img
					src={logoImg}
					alt="Logo"
					className="w-full max-w-104 relative right-2.5 object-contain mb-5 shrink-0"
				/>

				<FormContainer variant="page" className="w-full max-w-sm lg:max-w-xs">
					<LoginForm />
				</FormContainer>
			</div>

			<div className="relative hidden h-full bg-muted lg:block">
				<img
					src={cleanersImg}
					alt="Cleaners ready to work"
					className="absolute inset-0 size-full object-cover"
				/>
			</div>
		</div>
	);
}
