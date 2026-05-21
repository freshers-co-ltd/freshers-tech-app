import type { Profile } from '@/features/auth/authService';

export function buildProfile(overrides?: Partial<Profile>): Profile {
	return {
		id: 'user_123',
		full_name: 'Test User',
		email: 'test@example.com',
		role: 'host',
		avatar_url: null,
		is_verified: false,
		...overrides,
	};
}
