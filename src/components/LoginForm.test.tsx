import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm Behavioral Logic', () => {
	const renderComponent = () =>
		render(
			<BrowserRouter>
				<LoginForm />
			</BrowserRouter>,
		);

	it('enforces email format validation', async () => {
		const user = userEvent.setup();
		renderComponent();

		const emailInput = screen.getByLabelText(/Email/i);
		emailInput.closest('form')?.setAttribute('noValidate', 'true');

		await user.type(emailInput, 'invalid-email');
		await user.click(screen.getByRole('button', { name: /Login/i }));

		expect(await screen.findByText(/Invalid email address/i)).toBeInTheDocument();
	});

	it('enforces minimum password length', async () => {
		const user = userEvent.setup();
		renderComponent();

		const passwordInput = screen.getByLabelText(/Password/i);
		await user.type(passwordInput, '12345');
		await user.click(screen.getByRole('button', { name: /Login/i }));

		expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
	});
});
