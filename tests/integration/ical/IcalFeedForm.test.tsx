import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DICT } from '@/dictionary';
import { IcalFeedForm } from '@/features/ical/components/IcalFeedForm';
import { renderWithProviders } from '~/utils';

const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });
const mockOnCancel = vi.fn();

describe('IcalFeedForm', () => {
	it('pre-fills platform Select when an Airbnb URL is entered', async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<IcalFeedForm propertyId="prop-1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
		);

		const urlInput = screen.getByLabelText(DICT.ICAL.URL);
		await user.type(urlInput, 'https://www.airbnb.com/calendar/ical/12345.ics');
		await user.tab();

		const airbnbTexts = screen.getAllByText(DICT.ICAL.SOURCES.AIRBNB);
		expect(airbnbTexts.length).toBeGreaterThanOrEqual(1);
	});

	it('shows generic confirmation checkbox when Other is selected', async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<IcalFeedForm propertyId="prop-1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
		);

		const selectTrigger = screen.getByRole('combobox');
		await user.click(selectTrigger);
		const genericOptions = screen.getAllByText(DICT.ICAL.SOURCES.GENERIC);
		await user.click(genericOptions[genericOptions.length - 1]);

		expect(screen.getByLabelText(DICT.ICAL.GENERIC_CONFIRM)).toBeInTheDocument();
	});

	it('calls onSubmit with correct payload on valid submission', async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<IcalFeedForm propertyId="prop-1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
		);

		await user.type(
			screen.getByLabelText(DICT.ICAL.URL),
			'https://www.airbnb.com/calendar/ical/12345.ics',
		);
		await user.tab();
		await user.click(screen.getByRole('button', { name: DICT.COMMON.ACTIONS.CREATE }));

		expect(mockOnSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				propertyId: 'prop-1',
				source: 'airbnb',
			}),
		);
	});

	it('calls onCancel when cancel button is clicked', async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<IcalFeedForm propertyId="prop-1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
		);

		await user.click(screen.getByRole('button', { name: DICT.COMMON.ACTIONS.CANCEL }));
		expect(mockOnCancel).toHaveBeenCalled();
	});
});
