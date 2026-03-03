import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loading } from '@/components/Loading';
import { supabase } from '@/lib/supabaseClient';

export const AuthCallback = () => {
	const navigate = useNavigate();

	useEffect(() => {
		const handleCodeExchange = async () => {
			const code = new URLSearchParams(window.location.search).get('code');
			if (code) {
				const { error } = await supabase.auth.exchangeCodeForSession(code);
				if (error) {
					toast.error('Authentication link expired.');
					navigate('/login');
					return;
				}
			}
		};
		handleCodeExchange();
	}, [navigate]);

	return <Loading />;
};
