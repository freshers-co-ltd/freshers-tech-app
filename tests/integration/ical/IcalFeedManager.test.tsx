import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DICT } from '@/dictionary';
import { IcalFeedManager } from '@/features/ical/components/IcalFeedManager';
import { renderWithProviders } from '~/utils';
import { setMockUserRole } from '~/utils/supabaseMocks';

const { mockGetFeeds, mockSyncFeed, mockDeleteFeed, mockCreateFeed } = vi.hoisted(() => ({
	mockGetFeeds: vi.fn().mockResolvedValue({
		data: [
			{
				id: 'feed-1',
				property_id: 'prop-1',
				source: 'airbnb',
				url_display: 'https://www.airbnb.co.uk/calendar/ical/••••abcd',
				is_active: true,
				last_synced_at: '2026-09-15T10:00:00Z',
				last_sync_error: null,
				url_secret_id: null,
				created_at: '2026-09-01T00:00:00Z',
				properties: { address_line_1: '123 Test St', town_city: 'London' },
			},
		],
		error: null,
	}),
	mockSyncFeed: vi.fn().mockResolvedValue({ error: null }),
	mockDeleteFeed: vi.fn().mockResolvedValue({ error: null }),
	mockCreateFeed: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('@/features/ical/icalService', () => ({
	icalService: {
		getFeeds: (...args: unknown[]) => mockGetFeeds(...args),
		createFeed: (...args: unknown[]) => mockCreateFeed(...args),
		deleteFeed: (...args: unknown[]) => mockDeleteFeed(...args),
		syncFeed: (...args: unknown[]) => mockSyncFeed(...args),
	},
}));

let cleanupFrom: (() => void) | null = null;

afterEach(() => {
	cleanupFrom?.();
	cleanupFrom = null;
});

describe('IcalFeedManager', () => {
	it('renders feeds with masked url_display and status', async () => {
		setMockUserRole('host');
		renderWithProviders(<IcalFeedManager propertyId="prop-1" />);
		expect(await screen.findByText(/••••abcd/)).toBeInTheDocument();
		expect(screen.getByText(/Last synced/)).toBeInTheDocument();
	});

	it('shows Add dialog when button is clicked', async () => {
		setMockUserRole('host');
		const user = userEvent.setup();
		renderWithProviders(<IcalFeedManager propertyId="prop-1" />);
		await screen.findByText(/••••abcd/);
		await user.click(screen.getByRole('button', { name: DICT.ICAL.ADD }));
		expect(screen.getByText(DICT.ICAL.CREATE.TITLE)).toBeInTheDocument();
	});

	it('calls syncFeed on Sync button click', async () => {
		setMockUserRole('host');
		const user = userEvent.setup();
		renderWithProviders(<IcalFeedManager propertyId="prop-1" />);
		await screen.findByText(/••••abcd/);
		await user.click(screen.getByRole('button', { name: DICT.ICAL.SYNC_NOW }));
		await waitFor(() => {
			expect(mockSyncFeed).toHaveBeenCalledWith('feed-1');
		});
	});

	it('shows delete confirmation dialog', async () => {
		setMockUserRole('host');
		const user = userEvent.setup();
		renderWithProviders(<IcalFeedManager propertyId="prop-1" />);
		await screen.findByText(/••••abcd/);
		const deleteButtons = screen.getAllByRole('button', { name: DICT.COMMON.ACTIONS.DELETE });
		await user.click(deleteButtons[0]);
		expect(screen.getByText(DICT.ICAL.DELETE.TITLE)).toBeInTheDocument();
	});

	it('shows empty state when no feeds exist', async () => {
		setMockUserRole('host');
		mockGetFeeds.mockResolvedValueOnce({ data: [], error: null });
		renderWithProviders(<IcalFeedManager propertyId="prop-2" />);
		expect(await screen.findByText(DICT.ICAL.EMPTY)).toBeInTheDocument();
	});
});
