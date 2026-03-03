import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { BubbleBackground } from '@/components/Background';
import { FormCard } from '@/components/FormCard';

export function ResetPasswordPage() {
	return (
		<div className="relative flex flex-col items-center justify-center w-full min-h-dvh bg-background overflow-y-auto">
			<BubbleBackground seedOffset={3} />
			<div className="relative z-1 flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-4">
				<div className="flex items-center justify-center w-full min-h-0 flex-1">
					<FormCard>
						<ResetPasswordForm />
					</FormCard>
				</div>
			</div>
		</div>
	);
}
