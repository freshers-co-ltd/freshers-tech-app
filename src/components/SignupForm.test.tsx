import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SignupForm } from './SignupForm';

describe('SignupForm Validation Logic', () => {
	const renderComponent = () =>
		render(
			<BrowserRouter>
				<SignupForm />
			</BrowserRouter>,
		);

	it('validates that passwords match', async () => {
		const user = userEvent.setup();
		renderComponent();

		await user.type(screen.getByLabelText(/^Password$/i), 'Password123!');
		await user.type(screen.getByLabelText(/Confirm Password/i), 'Password456!');
		await user.click(screen.getByRole('button', { name: /Create Account/i }));

		expect(await screen.findByText(/Passwords don't match/i)).toBeInTheDocument();
	});

	it('blocks submission on invalid name length', async () => {
		const user = userEvent.setup();
		renderComponent();

		await user.type(screen.getByLabelText(/Full Name/i), 'A');
		await user.click(screen.getByRole('button', { name: /Create Account/i }));

		expect(await screen.findByText(/Full name must be at least 2 characters/i)).toBeInTheDocument();
	});
});
