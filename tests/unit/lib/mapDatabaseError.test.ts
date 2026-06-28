import { describe, expect, it } from 'vitest';
import { DICT } from '@/dictionary';
import { mapAuthError } from '@/features/auth/services/authService';
import { mapDatabaseError } from '@/lib/serviceUtils';

describe('mapDatabaseError', () => {
	it('maps PGRST116 to record not found message', () => {
		const error = { code: 'PGRST116', message: '', details: '', hint: '' };
		expect(mapDatabaseError(error)).toBe(DICT.ERRORS.DATABASE.RECORD_NOT_FOUND);
	});

	it('maps 42501 to permission denied message', () => {
		const error = { code: '42501', message: '', details: '', hint: '' };
		expect(mapDatabaseError(error)).toBe(DICT.ERRORS.DATABASE.PERMISSION_DENIED);
	});

	it('maps 23505 to record exists message', () => {
		const error = { code: '23505', message: '', details: '', hint: '' };
		expect(mapDatabaseError(error)).toBe(DICT.ERRORS.DATABASE.RECORD_EXISTS);
	});

	it('returns network error when message includes "Failed to fetch"', () => {
		const error = { code: '', message: 'Failed to fetch', details: '', hint: '' };
		expect(mapDatabaseError(error)).toBe(DICT.ERRORS.COMMON.NETWORK);
	});

	it('falls back to error.message for unknown codes', () => {
		const error = {
			code: 'UNKNOWN',
			message: 'Something specific happened',
			details: '',
			hint: '',
		};
		expect(mapDatabaseError(error)).toBe('Something specific happened');
	});

	it('falls back to generic message when unknown code has no message', () => {
		const error = { code: 'UNKNOWN', message: '', details: '', hint: '' };
		expect(mapDatabaseError(error)).toBe(DICT.ERRORS.COMMON.GENERIC);
	});

	it('handles an AuthError-like object without a code', () => {
		const error = { name: 'AuthError', message: 'Email not confirmed' };
		expect(mapDatabaseError(error)).toBe('Email not confirmed');
	});

	it('returns generic when both code and message are empty', () => {
		const error = { message: '' };
		expect(mapDatabaseError(error)).toBe(DICT.ERRORS.COMMON.GENERIC);
	});
});

describe('mapAuthError', () => {
	it('maps user_already_exists to user exists message', () => {
		const error = { code: 'user_already_exists', message: '' };
		expect(mapAuthError(error)).toBe(DICT.ERRORS.AUTH.USER_EXISTS);
	});

	it('maps invalid_credentials to invalid credentials message', () => {
		const error = { code: 'invalid_credentials', message: 'Invalid login credentials' };
		expect(mapAuthError(error)).toBe(DICT.ERRORS.AUTH.INVALID_CREDENTIALS);
	});

	it('maps email_not_confirmed to email not confirmed message', () => {
		const error = { code: 'email_not_confirmed', message: 'Email not confirmed' };
		expect(mapAuthError(error)).toBe(DICT.ERRORS.AUTH.EMAIL_NOT_CONFIRMED);
	});

	it('maps user_banned to user banned message', () => {
		const error = { code: 'user_banned', message: 'User is banned' };
		expect(mapAuthError(error)).toBe(DICT.ERRORS.AUTH.USER_BANNED);
	});

	it('returns network error when message includes "Failed to fetch"', () => {
		const error = { code: 'unknown', message: 'Failed to fetch' };
		expect(mapAuthError(error)).toBe(DICT.ERRORS.COMMON.NETWORK);
	});

	it('falls back to error.message for unknown codes', () => {
		const error = { code: 'some_other_error', message: 'Something went wrong' };
		expect(mapAuthError(error)).toBe('Something went wrong');
	});

	it('handles error without a code', () => {
		const error = { message: 'Direct error message' };
		expect(mapAuthError(error)).toBe('Direct error message');
	});
});
