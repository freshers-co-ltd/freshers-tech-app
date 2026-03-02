import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './Login';

vi.mock('@/components/LoginForm', () => ({
	LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

describe('LoginPage', () => {
	it('renders logo and login form', () => {
		render(<LoginPage />);
		const logo = screen.getByAltText('Logo');
		expect(logo).toBeDefined();
		expect(screen.getByTestId('login-form')).toBeDefined();
	});
});
