import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/types';
import { CleaningActionButtons } from '@/features/cleanings/components/CleaningActionButtons';
import { CLEANING_STATUS } from '@/features/cleanings/types';

function renderButtons(props: {
	userRole: UserRole;
	status?: (typeof CLEANING_STATUS)[keyof typeof CLEANING_STATUS];
	onVerify?: (id: string) => void;
}) {
	return render(
		<CleaningActionButtons
			userRole={props.userRole}
			status={props.status ?? CLEANING_STATUS.UNVERIFIED}
			cleaningId="cleaning_1"
			onVerify={props.onVerify}
		/>,
	);
}

describe('CleaningActionButtons', () => {
	it('shows Verify and Reject buttons to admins for unverified cleanings', () => {
		renderButtons({ userRole: 'admin' });

		expect(screen.getByRole('button', { name: DICT.ICAL.VERIFY })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: DICT.ICAL.REJECT })).toBeInTheDocument();
	});

	it('calls onVerify with the cleaning id when an admin clicks Verify', async () => {
		const user = userEvent.setup();
		const onVerify = vi.fn();
		renderButtons({ userRole: 'admin', onVerify });

		await user.click(screen.getByRole('button', { name: DICT.ICAL.VERIFY }));

		expect(onVerify).toHaveBeenCalledWith('cleaning_1');
	});

	it('keeps Verify and Reject buttons for hosts for unverified cleanings', () => {
		renderButtons({ userRole: 'host' });

		expect(screen.getByRole('button', { name: DICT.ICAL.VERIFY })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: DICT.ICAL.REJECT })).toBeInTheDocument();
	});

	it('shows Edit and Delete without Verify for admin requested cleanings', () => {
		renderButtons({ userRole: 'admin', status: CLEANING_STATUS.REQUESTED });

		expect(screen.getByRole('button', { name: DICT.COMMON.ACTIONS.EDIT })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: DICT.COMMON.ACTIONS.DELETE })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: DICT.ICAL.VERIFY })).not.toBeInTheDocument();
	});

	it('shows Clock In for cleaner confirmed cleanings', () => {
		renderButtons({ userRole: 'cleaner', status: CLEANING_STATUS.CONFIRMED });

		expect(screen.getByRole('button', { name: 'Clock In' })).toBeInTheDocument();
	});
});
