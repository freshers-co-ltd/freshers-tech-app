import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { needsSubscription } from './utils/subscriptionUtils';

interface SubscriptionGateProps {
	children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
	const { profile, loading } = useAuth();

	if (loading) {
		return null;
	}

	if (!profile) {
		return <Navigate to="/login" replace />;
	}

	if (needsSubscription(profile)) {
		return <Navigate to="/host/subscription/pending" replace />;
	}

	return <>{children}</>;
}
