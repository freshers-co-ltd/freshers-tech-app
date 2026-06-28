import { useNavigate } from 'react-router-dom';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { MfaChallengeForm } from '@/features/auth/components/MfaChallengeForm';

export function MfaChallengePage() {
	const { resolveMfaAction } = useAuth();
	const navigate = useNavigate();

	const handleComplete = () => {
		resolveMfaAction();
		navigate('/dashboard');
	};

	return (
		<div className="flex h-dvh overflow-hidden flex-col items-center justify-center p-4 md:p-8 bg-background">
			<FormContainer variant="page" className="w-full max-w-md">
				<header className="space-y-1.5 mb-6 text-center">
					<h1 className="text-2xl font-bold">{DICT.AUTH.MFA.CHALLENGE.TITLE}</h1>
				</header>
				<MfaChallengeForm onComplete={handleComplete} />
			</FormContainer>
		</div>
	);
}
