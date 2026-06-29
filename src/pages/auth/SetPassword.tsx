import { FormContainer } from '@/components/ui/form-container';
import { SetPasswordForm } from '@/features/auth/components/SetPasswordForm';

export function SetPasswordPage() {
	return (
		<div className="relative flex md:items-center justify-center h-dvh w-full p-4 md:p-8 overflow-hidden bg-background">
			<FormContainer variant="page" className="max-w-sm lg:max-w-md">
				<SetPasswordForm />
			</FormContainer>
		</div>
	);
}
