import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { Dialog } from '@/components/ui/dialog';
import { DICT } from '@/dictionary';
import { PropertyDetailView } from '@/features/properties/components/PropertyDetailView';
import type { Property } from '@/features/properties/types';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

const { MOCK_PROPERTY, mockGetFeeds, mockUpsertProperty } = vi.hoisted(() => ({
	MOCK_PROPERTY: {
		id: 'prop-1',
		created_at: '2026-09-01T00:00:00Z',
		updated_at: '2026-09-01T00:00:00Z',
		host_id: 'user_123',
		address_line_1: '123 Test St',
		address_line_2: null,
		town_city: 'London',
		postcode: 'SW1A 1AA',
		type: 'apartment',
		bedrooms: 2,
		bathrooms: 1,
		main_image_url: '',
		extra_images_urls: [],
		default_cleaning_time: '11:00:00',
		deleted_at: null,
		timezone: 'Europe/London',
		price_per_cleaning: null,
		cleaner_pay_override: null,
		main_cleaner_id: null,
	} satisfies Property,
	mockGetFeeds: vi.fn().mockResolvedValue({ data: [], error: null }),
	mockUpsertProperty: vi.fn().mockResolvedValue({
		data: {
			id: 'prop-1',
			created_at: '2026-09-01T00:00:00Z',
			updated_at: '2026-09-01T00:00:00Z',
			host_id: 'user_123',
			address_line_1: '123 Test St',
			address_line_2: null,
			town_city: 'London',
			postcode: 'SW1A 1AA',
			type: 'apartment',
			bedrooms: 2,
			bathrooms: 1,
			main_image_url: '',
			extra_images_urls: [],
			default_cleaning_time: '11:00:00',
			deleted_at: null,
			timezone: 'Europe/London',
			price_per_cleaning: null,
			cleaner_pay_override: null,
			main_cleaner_id: null,
		},
		error: null,
	}),
}));

vi.mock('@/features/ical/icalService', () => ({
	icalService: {
		getFeeds: (...args: unknown[]) => mockGetFeeds(...args),
		createFeed: vi.fn().mockResolvedValue({ data: null, error: null }),
		deleteFeed: vi.fn().mockResolvedValue({ error: null }),
		syncFeed: vi.fn().mockResolvedValue({ error: null }),
	},
}));

vi.mock('@/features/properties/propertyService', () => ({
	propertyService: {
		getProperties: vi.fn().mockResolvedValue({ data: [], error: null }),
		upsertProperty: (...args: unknown[]) => mockUpsertProperty(...args),
		softDeleteProperty: vi.fn().mockResolvedValue({ data: null, error: null }),
		hardDeleteProperty: vi.fn().mockResolvedValue({ data: null, error: null }),
	},
}));

let cleanupFrom: (() => void) | null = null;

afterEach(() => {
	cleanupFrom?.();
	cleanupFrom = null;
	mockUpsertProperty.mockClear();
	vi.mocked(toast.success).mockClear();
});

describe('PropertyDetailIcalFields', () => {
	it('renders TimeInput with default cleaning time', async () => {
		setMockUserRole('host');
		renderWithProviders(
			<Dialog open>
				<PropertyDetailView property={MOCK_PROPERTY} onEdit={vi.fn()} onDelete={vi.fn()} />
			</Dialog>,
		);
		expect(await screen.findByText('11:00')).toBeInTheDocument();
	});

	it('saves once on TimeInput close with DEFAULT_TIME_SAVED toast', async () => {
		setMockUserRole('host');
		const user = userEvent.setup();
		renderWithProviders(
			<Dialog open>
				<PropertyDetailView property={MOCK_PROPERTY} onEdit={vi.fn()} onDelete={vi.fn()} />
			</Dialog>,
		);

		await screen.findByText('11:00');
		const timeButton = screen.getByText('11:00');
		await user.click(timeButton);

		const hourButton = screen.getAllByRole('button', { name: '3' })[0];
		await user.click(hourButton);

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(mockUpsertProperty).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(DICT.PROPERTIES.DEFAULT_TIME_SAVED);
		});
	});

	it('does not show property updated successfully toast', async () => {
		setMockUserRole('host');
		const user = userEvent.setup();
		renderWithProviders(
			<Dialog open>
				<PropertyDetailView property={MOCK_PROPERTY} onEdit={vi.fn()} onDelete={vi.fn()} />
			</Dialog>,
		);

		await screen.findByText('11:00');
		const timeButton = screen.getByText('11:00');
		await user.click(timeButton);

		const hourButton = screen.getAllByRole('button', { name: '3' })[0];
		await user.click(hourButton);

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(mockUpsertProperty).toHaveBeenCalled();
		});
		expect(vi.mocked(toast.success)).not.toHaveBeenCalledWith(DICT.PROPERTIES.EDIT.TOAST_SUCCESS);
	});
});
