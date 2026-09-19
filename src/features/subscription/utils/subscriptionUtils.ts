import { DICT } from '@/dictionary';
import type { Profile, SubscriptionStatus } from '@/features/auth/types';

export function hasActiveSubscription(profile: Profile): boolean {
	if (profile.role !== 'host') {
		return true;
	}
	if (profile.is_invited) {
		return true;
	}
	return profile.host_subscription_status === 'active';
}

export function getSubscriptionDisplayStatus(status: SubscriptionStatus | null): {
	label: string;
	color: 'green' | 'yellow' | 'red' | 'gray';
} {
	switch (status) {
		case 'active':
			return { label: DICT.SUBSCRIPTION.STATUS_ACTIVE, color: 'green' };
		case 'past_due':
		case 'unpaid':
			return { label: DICT.SUBSCRIPTION.STATUS_PAYMENT_ISSUE, color: 'yellow' };
		case 'incomplete':
			return { label: DICT.SUBSCRIPTION.STATUS_PENDING, color: 'gray' };
		case null:
			return { label: DICT.SUBSCRIPTION.UNSUBSCRIBED, color: 'gray' };
		default:
			return { label: DICT.SUBSCRIPTION.STATUS_INACTIVE, color: 'red' };
	}
}

export function needsSubscription(profile: Profile): boolean {
	if (profile.role !== 'host') {
		return false;
	}
	if (profile.is_invited) {
		return false;
	}
	return profile.host_subscription_status !== 'active';
}
