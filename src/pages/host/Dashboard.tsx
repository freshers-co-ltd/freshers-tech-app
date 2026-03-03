import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BubbleBackground } from '@/components/Background';
import { authService } from '@/lib/authService';

export function HostDashboardPage() {
	const navigate = useNavigate();
	const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

	const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
		e.preventDefault();
		setIsLoggingOut(true);

		const { error } = await authService.signOut();

		if (error) {
			toast.error(error);
			setIsLoggingOut(false);
		} else {
			toast.success('Logged out successfully', { duration: 3000 });
			navigate('/login');
		}
	};

	return (
		<div className="relative min-h-screen w-full flex items-center justify-center p-4">
			{/* Background Layer */}
			<BubbleBackground seedOffset={10} />

			{/* Content Layer */}
			<main className="relative z-10 w-full max-w-2xl bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20">
				<div className="flex justify-between items-start mb-6">
					<h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
					<button
						type="button"
						onClick={handleLogout}
						disabled={isLoggingOut}
						className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
						{isLoggingOut ? 'Signing out...' : 'Log Out'}
					</button>
				</div>

				<div className="space-y-4 text-gray-700 leading-relaxed">
					<p>
						Welcome to the host dashboard! Here you can manage your properties, post jobs, and see
						their progress.
					</p>
					<p className="text-sm text-gray-500 italic text-pretty">
						Monitor your cleaning schedules and property status in real-time.
					</p>
				</div>
			</main>
		</div>
	);
}
