import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export function useInactivityLogout(timeoutMs = 30 * 60 * 1000) {
	const navigate = useNavigate();

	useEffect(() => {
		const isTrusted = localStorage.getItem('trust_device') === 'true';
		if (isTrusted) {
			return;
		}

		let timer: number;

		const logout = async () => {
			console.log('[Inactivity Trigger] Initiating logout via URL param');

			navigate('/login?reason=inactivity', { replace: true });

			await supabase.auth.signOut();
		};

		const resetTimer = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(logout, timeoutMs);
		};

		const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

		events.forEach((event) => {
			window.addEventListener(event, resetTimer);
		});

		resetTimer();

		return () => {
			window.clearTimeout(timer);
			events.forEach((event) => {
				window.removeEventListener(event, resetTimer);
			});
		};
	}, [timeoutMs, navigate]);
}
