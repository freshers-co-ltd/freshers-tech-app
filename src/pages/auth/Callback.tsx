import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loading } from '@/components/Loading';
import { DICT } from '@/dictionary';
import { supabase } from '@/lib/supabaseClient';

export const AuthCallback = () => {
	const navigate = useNavigate();
	const processed = useRef(false);

	useEffect(() => {
		if (processed.current) {
			return;
		}
		processed.current = true;

		const handleCodeExchange = async () => {
			const params = new URLSearchParams(window.location.search);
			const code = params.get('code');
			const error_description = params.get('error_description');

			if (error_description) {
				toast.error(error_description);
				navigate('/login');
				return;
			}

			if (code) {
				const { error } = await supabase.auth.exchangeCodeForSession(code);
				if (error) {
					toast.error(DICT.ERRORS.AUTH.LINK_EXPIRED);
					navigate('/login');
				} else {
					navigate('/dashboard');
				}
			} else {
				const { data } = await supabase.auth.getSession();
				navigate(data.session ? '/dashboard' : '/login');
			}
		};
		handleCodeExchange();
	}, [navigate]);

	return <Loading />;
};
