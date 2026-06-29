import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { AccountPage } from '@/pages/Account';
import { renderWithProviders } from '~/utils';
import { mockRpcData, setMockUserRole } from '~/utils/supabaseMocks';

describe('Account Page', () => {
	let cleanupRpc: (() => void) | null = null;

	afterEach(() => {
		cleanupRpc?.();
		cleanupRpc = null;
		localStorage.clear();
		sessionStorage.clear();
	});

	const renderPage = () => {
		return renderWithProviders(<AccountPage />, {
			routes: [{ path: '/host/account', element: <AccountPage /> }],
			initialEntries: ['/host/account'],
		});
	};

	it('renders all account sections', async () => {
		setMockUserRole('host');
		renderPage();

		expect(
			await screen.findByRole('heading', { name: DICT.ACCOUNT.TITLE, level: 1 }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: DICT.ACCOUNT.PERSONAL.TITLE, level: 2 }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: DICT.ACCOUNT.SECURITY.TITLE, level: 2 }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: DICT.ACCOUNT.PREFERENCES.TITLE, level: 2 }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: DICT.ACCOUNT.CONTACT.TITLE, level: 2 }),
		).toBeInTheDocument();
	});

	it('shows sign out button', async () => {
		setMockUserRole('host');
		renderPage();

		expect(
			await screen.findByRole('button', { name: DICT.ACCOUNT.BUTTON_SIGN_OUT }),
		).toBeInTheDocument();
	});

	it('shows delete account button', async () => {
		setMockUserRole('host');
		renderPage();

		expect(
			await screen.findByRole('button', { name: DICT.ACCOUNT.BUTTON_DELETE_ACCOUNT }),
		).toBeInTheDocument();
	});

	it('opens delete account confirmation on button click', async () => {
		const user = userEvent.setup();
		setMockUserRole('host');
		renderPage();

		await user.click(
			await screen.findByRole('button', { name: DICT.ACCOUNT.BUTTON_DELETE_ACCOUNT }),
		);

		await screen.findByRole('alertdialog');
		// Both the trigger button and dialog title have "Delete Account" text;
		// verify the dialog is open by checking for the confirm button
		expect(
			screen.getByRole('button', { name: DICT.ACCOUNT.DELETE_ACCOUNT.BUTTON_SUBMIT }),
		).toBeInTheDocument();
	});

	it('deletes account and shows success toast on confirm', async () => {
		const user = userEvent.setup();
		setMockUserRole('host');
		cleanupRpc = mockRpcData('purge_user_pii', { data: null, error: null });

		renderPage();

		await user.click(
			await screen.findByRole('button', { name: DICT.ACCOUNT.BUTTON_DELETE_ACCOUNT }),
		);
		await user.click(
			await screen.findByRole('button', { name: DICT.ACCOUNT.DELETE_ACCOUNT.BUTTON_SUBMIT }),
		);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(DICT.ACCOUNT.DELETE_ACCOUNT.TOAST_SUCCESS);
		});
	});

	it('shows error toast when account deletion fails', async () => {
		const user = userEvent.setup();
		setMockUserRole('host');
		cleanupRpc = mockRpcData('purge_user_pii', null, 'Deletion failed');

		renderPage();

		await user.click(
			await screen.findByRole('button', { name: DICT.ACCOUNT.BUTTON_DELETE_ACCOUNT }),
		);
		await user.click(
			await screen.findByRole('button', { name: DICT.ACCOUNT.DELETE_ACCOUNT.BUTTON_SUBMIT }),
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('Deletion failed');
		});
	});

	it('shows MFA status section for admin users', async () => {
		setMockUserRole('admin');
		renderPage();

		expect(await screen.findByText(DICT.AUTH.MFA.ACCOUNT_STATUS.TITLE)).toBeInTheDocument();
	});

	it('does not show MFA status section for non-admin users', async () => {
		setMockUserRole('host');
		renderPage();

		expect(screen.queryByText(DICT.AUTH.MFA.ACCOUNT_STATUS.TITLE)).not.toBeInTheDocument();
	});

	it('renders contact section with support and privacy links', async () => {
		setMockUserRole('host');
		renderPage();

		expect(await screen.findByText(DICT.ACCOUNT.CONTACT.SUPPORT.TITLE)).toBeInTheDocument();
		expect(screen.getByText(DICT.ACCOUNT.CONTACT.WEBSITE.TITLE)).toBeInTheDocument();
		// "Privacy Notice" appears in both sidebar nav and contact card
		const privacyElements = screen.getAllByText(DICT.ACCOUNT.CONTACT.PRIVACY.TITLE);
		expect(privacyElements.length).toBeGreaterThanOrEqual(2);
	});
});
