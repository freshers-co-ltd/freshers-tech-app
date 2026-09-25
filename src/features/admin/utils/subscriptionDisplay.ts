import { DICT } from '@/dictionary';
import type { Database } from '@/lib/database.types';

type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

export type AdminDisplayStatus = 'active' | 'payment_issue' | 'inactive' | 'pending';

export function getAdminDisplayStatus(
	status: SubscriptionStatus | null,
	isInvited: boolean,
): AdminDisplayStatus | null {
	if (isInvited) {
		return null;
	}
	if (!status) {
		return null;
	}
	if (status === 'active') {
		return 'active';
	}
	if (status === 'past_due' || status === 'unpaid') {
		return 'payment_issue';
	}
	if (status === 'incomplete') {
		return 'pending';
	}
	return 'inactive';
}

export function getAdminDisplayBadge(status: AdminDisplayStatus) {
	switch (status) {
		case 'active':
			return { label: DICT.SUBSCRIPTION.STATUS_ACTIVE, color: 'green' as const };
		case 'payment_issue':
			return { label: DICT.SUBSCRIPTION.STATUS_PAYMENT_ISSUE, color: 'yellow' as const };
		case 'pending':
			return { label: DICT.SUBSCRIPTION.STATUS_PENDING, color: 'gray' as const };
		case 'inactive':
			return { label: DICT.SUBSCRIPTION.STATUS_INACTIVE, color: 'red' as const };
		default:
			return null;
	}
}
