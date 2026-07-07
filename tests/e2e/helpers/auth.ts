import type { Page } from '@playwright/test';
import type { MockUser } from './mock-data';

interface AuthSession {
	access_token: string;
	token_type: string;
	expires_in: number;
	expires_at: number;
	refresh_token: string;
	user: {
		id: string;
		aud: string;
		role: string;
		email: string;
		email_confirmed_at: string;
		phone: string;
		confirmed_at: string;
		last_sign_in_at: string;
		app_metadata: { provider: string; providers: string[] };
		user_metadata: { role: string; full_name: string };
		identities: Array<{ id: string; provider: string }>;
		created_at: string;
		updated_at: string;
	};
}

function buildAuthSession(userData: MockUser): AuthSession {
	return {
		access_token: `mock-at-${userData.id}`,
		token_type: 'bearer',
		expires_in: 3600,
		expires_at: Math.floor(Date.now() / 1000) + 3600,
		refresh_token: `mock-rt-${userData.id}`,
		user: {
			id: userData.id,
			aud: 'authenticated',
			role: 'authenticated',
			email: userData.email,
			email_confirmed_at: '2025-01-01T00:00:00Z',
			phone: '',
			confirmed_at: '2025-01-01T00:00:00Z',
			last_sign_in_at: '2025-06-29T00:00:00Z',
			app_metadata: { provider: 'email', providers: ['email'] },
			user_metadata: { role: userData.role, full_name: userData.full_name },
			identities: [{ id: userData.id, provider: 'email' }],
			created_at: userData.created_at,
			updated_at: userData.last_seen_at,
		},
	};
}

export async function seedAuthSession(page: Page, userData: MockUser): Promise<void> {
	const session = buildAuthSession(userData);
	await page.addInitScript(
		({ token }: { token: string }) => {
			window.localStorage.setItem('trust_device', 'true');
			window.localStorage.setItem('sb-auth-token', token);
		},
		{ token: JSON.stringify(session) },
	);
}

export { buildAuthSession };
