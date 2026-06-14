import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { CleaningForm } from '@/features/cleanings/components/CleaningForm';
import { HostCleaningsPage } from '@/pages/host/Cleanings';
import { buildCleaning, buildProperty, buildRawCleaning } from '~/factories';
import { renderWithProviders } from '~/utils';
import { mockRpcData, mockTableData } from '~/utils/supabaseMocks';

describe('Host Cleanings Page', () => {
	let cleanupFrom: (() => void) | null = null;
	let cleanupRpc: (() => void) | null = null;

	afterEach(() => {
		cleanupFrom?.();
		cleanupRpc?.();
		cleanupFrom = null;
		cleanupRpc = null;
	});

	const renderPage = (initialEntries = ['/host/cleanings']) => {
		return renderWithProviders(<HostCleaningsPage />, {
			routes: [{ path: '/host/cleanings', element: <HostCleaningsPage /> }],
			initialEntries,
		});
	};

	it('shows empty state when no cleanings exist', async () => {
		renderPage();

		expect(await screen.findByText(DICT.CLEANINGS.EMPTY.MESSAGE_HOST)).toBeInTheDocument();
	});

	it('shows cleaning cards when data loads', async () => {
		cleanupFrom = mockTableData('cleanings', [buildRawCleaning()]);

		renderPage();

		expect(await screen.findByText('123 Test Street')).toBeInTheDocument();
	});

	it('shows error toast when loading fails', async () => {
		cleanupFrom = mockTableData('cleanings', null, 'Failed to load cleanings');

		renderPage();

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Failed to load cleanings');
		});
	});

	it('opens create form dialog when New button clicked', async () => {
		const user = userEvent.setup();
		cleanupFrom = mockTableData({
			cleanings: { data: [buildRawCleaning()] },
			properties: { data: [buildProperty()] },
		});

		renderPage();

		await user.click(screen.getByRole('button', { name: /new cleaning request/i }));

		expect(await screen.findByText(DICT.CLEANINGS.CREATE.TITLE)).toBeInTheDocument();
	});

	it('creates cleaning via form submission', async () => {
		const user = userEvent.setup();
		const property = buildProperty();
		// Pre-set property_id via initialData so we skip the Radix Select interaction
		const initialCleaning = buildCleaning({
			property_id: property.id,
			scheduled_start: new Date('2026-05-25T10:00:00').toISOString(),
		});

		const onSubmit = vi.fn().mockResolvedValue(undefined);

		cleanupFrom = mockTableData({
			cleanings: { data: [buildRawCleaning({ id: 'cleaning_456' })] },
			properties: { data: [property] },
			standard_tasks: {
				data: [
					{
						id: 'std_1',
						description: 'Vacuum',
						is_active: true,
						created_at: new Date().toISOString(),
					},
				],
			},
		});
		cleanupRpc = mockRpcData({
			get_cleaner_pay_config: {
				data: [
					{
						hourly_rate: 25,
						target_times: { studio: 1, '1_bed': 1.5, '2_bed': 2, '3_bed': 3, '4_bed': 4 },
						host_multipliers: { studio: 1, '1_bed': 1.2, '2_bed': 1.5, '3_bed': 2, '4_bed': 2.5 },
					},
				],
			},
			calculate_service_cost: { data: 120 },
			create_cleaning_request: { data: 'cleaning_456' },
		});

		const formElement = (
			<CleaningForm
				initialData={initialCleaning}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
				availableProperties={[property]}
			/>
		);
		renderWithProviders(formElement, {
			routes: [{ path: '/host/cleanings', element: formElement }],
			initialEntries: ['/host/cleanings'],
		});

		expect(await screen.findByText('Vacuum')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /add task/i }));
		const taskInput = screen.getByPlaceholderText(/e\.g\./i);
		await user.type(taskInput, 'Clean the windows');

		await user.click(screen.getByRole('button', { name: /service details/i }));

		await user.click(screen.getByTestId('date-picker'));
		const dayButton = await screen.findByRole('gridcell', { name: /25/i });
		await user.click(dayButton);

		await user.keyboard('{Escape}');

		await user.click(screen.getByRole('button', { name: /update cleaning request/i }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});

		const [submittedValues] = onSubmit.mock.calls[0];
		expect(submittedValues.property_id).toBe(property.id);
		expect(submittedValues.scheduled_start).toBeInstanceOf(Date);
		expect(submittedValues.custom_tasks).toContainEqual(
			expect.objectContaining({ description: 'Clean the windows' }),
		);
	});

	it('opens detail view when cleaning card clicked', async () => {
		cleanupFrom = mockTableData('cleanings', [buildRawCleaning()]);

		renderPage();

		const addressEl = (await screen.findAllByText('123 Test Street'))[0];
		// Use fireEvent.click for the card since the CleaningCard container has
		// pointer-events: none rendering userEvent.click unpredictable.
		fireEvent.click(addressEl);

		expect(await screen.findByRole('dialog')).toBeInTheDocument();
	});

	it('shows delete confirmation dialog when delete clicked', async () => {
		const user = userEvent.setup();
		cleanupFrom = mockTableData('cleanings', [buildRawCleaning()]);

		renderPage();

		const addressEl = (await screen.findAllByText('123 Test Street'))[0];
		// Use fireEvent.click for the card (same reason as above)
		fireEvent.click(addressEl);

		expect(await screen.findByRole('dialog')).toBeInTheDocument();

		const deleteButton = screen.getByRole('button', { name: /delete/i });
		await user.click(deleteButton);

		expect(await screen.findByText(DICT.CLEANINGS.DELETE.TITLE)).toBeInTheDocument();
	});
});
