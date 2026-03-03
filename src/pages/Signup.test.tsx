import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignupPage } from './Signup';

// Mocking SignupForm as it's a child component not yet under test
vi.mock('@/components/SignupForm', () => ({
	SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
}));

describe('SignupPage', () => {
	it('renders role selection by default', () => {
		render(<SignupPage />);
		expect(screen.getByText(/Join FreshersCo/i)).toBeDefined();
		expect(screen.getByText(/Host/i)).toBeDefined();
		expect(screen.getByText(/Cleaner/i)).toBeDefined();
	});

	it('displays SignupForm when Host is selected', () => {
		render(<SignupPage />);
		const hostButton = screen.getByText(/Host/i).closest('button');
		if (hostButton) {
			fireEvent.click(hostButton);
		}

		expect(screen.getByText(/Register as host/i)).toBeDefined();
		expect(screen.getByTestId('signup-form')).toBeDefined();
	});

	it('returns to selection when "Back to selection" is clicked', () => {
		render(<SignupPage />);
		const cleanerButton = screen.getByText(/Cleaner/i).closest('button');
		if (cleanerButton) {
			fireEvent.click(cleanerButton);
		}

		const backButton = screen.getByText(/Back to selection/i);
		fireEvent.click(backButton);

		expect(screen.getByText(/Select how you'll be using our platform/i)).toBeDefined();
	});
});
