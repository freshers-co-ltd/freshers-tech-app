import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/services/authService';

export const AuthCallback = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const processed = useRef(false);

	useEffect(() => {
		if (processed.current) {
			return;
		}
		processed.current = true;

		const handleCodeExchange = async () => {
			const hashParams = new URLSearchParams(location.hash.substring(1));

			const code = searchParams.get('code') || hashParams.get('code');
			const errorDescription =
				searchParams.get('error_description') || hashParams.get('error_description');

			if (errorDescription) {
				toast.error(errorDescription);
				navigate('/login', { replace: true });
				return;
			}

			if (code) {
				const { error } = await authService.exchangeCodeForSession(code);
				if (error) {
					toast.error(DICT.ERRORS.AUTH.LINK_EXPIRED);
					navigate('/login', { replace: true });
				} else {
					navigate('/dashboard', { replace: true });
				}
				return;
			}

			const { data } = await authService.getSession();
			navigate(data.session ? '/dashboard' : '/login', { replace: true });
		};

		handleCodeExchange();
	}, [navigate, searchParams, location.hash]);

	return <Loading />;
};
