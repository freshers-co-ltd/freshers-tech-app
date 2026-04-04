import { FormContainer } from '@/components/ui/form-container';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export function ResetPasswordPage() {
	return (
		<div className="relative flex md:items-center justify-center h-dvh w-full p-4 md:p-8 overflow-hidden bg-background">
			<FormContainer variant="page" className="max-w-sm lg:max-w-md">
				<ResetPasswordForm />
			</FormContainer>
		</div>
	);
}
