'use client';

import { FormContainer } from '@/components/ui/form-container';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export function ForgotPasswordPage() {
	return (
		<div className="relative flex md:items-center justify-center h-dvh w-full md:p-8 overflow-hidden bg-background">
			<FormContainer variant="page" className="max-w-sm lg:max-w-md">
				<ForgotPasswordForm />
			</FormContainer>
		</div>
	);
}
