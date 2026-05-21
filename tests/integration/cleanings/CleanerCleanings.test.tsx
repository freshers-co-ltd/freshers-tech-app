import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { CleanerCleaningsPage } from '@/pages/cleaner/Cleanings';
import { buildCleaningTask, buildRawCleaning } from '~/factories';
import { renderWithProviders } from '~/utils';
import { mockTableData, setMockUserRole } from '~/utils/supabaseMocks';

describe('Cleaner Cleanings Page', () => {
	let cleanupFrom: (() => void) | null = null;

	afterEach(() => {
		cleanupFrom?.();
		cleanupFrom = null;
	});

	const renderPage = () => {
		return renderWithProviders(<CleanerCleaningsPage />, {
			routes: [{ path: '/cleaner/cleanings', element: <CleanerCleaningsPage /> }],
			initialEntries: ['/cleaner/cleanings'],
		});
	};

	it('shows empty state when no cleanings assigned', async () => {
		setMockUserRole('cleaner');

		renderPage();

		expect(await screen.findByText(DICT.CLEANINGS.EMPTY.MESSAGE_CLEANER)).toBeInTheDocument();
	});

	it('shows assigned cleaning cards when data loads', async () => {
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData('cleanings', [buildRawCleaning({ cleaner_id: 'user_123' })]);

		renderPage();

		expect(await screen.findByText('123 Test Street')).toBeInTheDocument();
	});

	it('shows error toast when loading fails', async () => {
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData('cleanings', null, 'Failed to load cleanings');

		renderPage();

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Failed to load cleanings');
		});
	});

	it('opens detail view with tasks and clock-in for CONFIRMED status', async () => {
		const user = userEvent.setup();
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData('cleanings', [
			buildRawCleaning({
				cleaner_id: 'user_123',
				status: 'confirmed',
				tasks: [buildCleaningTask({ description: 'Vacuum all rooms' })],
			}),
		]);

		renderPage();

		const card = await screen.findByText('123 Test Street');
		await user.click(card);

		expect(await screen.findByText('Vacuum all rooms')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
	});

	it('shows IN_PROGRESS status with Finish button', async () => {
		const _user = userEvent.setup();
		setMockUserRole('cleaner');
		cleanupFrom = mockTableData('cleanings', [
			buildRawCleaning({
				cleaner_id: 'user_123',
				status: 'in_progress',
				tasks: [buildCleaningTask({ description: 'Vacuum all rooms', is_completed: true })],
			}),
		]);

		renderPage();

		const addressEl = (await screen.findAllByText('123 Test Street'))[0];
		const card = addressEl.closest('[data-slot="card"]') as HTMLElement;
		fireEvent.click(card);

		expect(
			await screen.findByRole('button', { name: /finish.*submit report/i }),
		).toBeInTheDocument();
	});
});
