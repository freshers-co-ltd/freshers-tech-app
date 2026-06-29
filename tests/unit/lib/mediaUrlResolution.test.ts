import { describe, expect, it } from 'vitest';
import { mediaService } from '@/lib/mediaService';

const PLACEHOLDER = '/placeholder-image.webp';

describe('mediaService.getMediaUrl', () => {
	it('returns placeholder for null path', () => {
		expect(mediaService.getMediaUrl(null, 'cleaning-media')).toBe(PLACEHOLDER);
	});

	it('returns placeholder for "Placeholder" string', () => {
		expect(mediaService.getMediaUrl('Placeholder', 'cleaning-media')).toBe(PLACEHOLDER);
	});

	it('returns placeholder for empty string', () => {
		expect(mediaService.getMediaUrl('', 'cleaning-media')).toBe(PLACEHOLDER);
	});

	it('returns placeholder for whitespace-only string', () => {
		expect(mediaService.getMediaUrl('   ', 'cleaning-media')).toBe(PLACEHOLDER);
	});

	it('returns HTTPS URL as-is', () => {
		const url = 'https://example.com/images/photo.jpg';
		expect(mediaService.getMediaUrl(url, 'cleaning-media')).toBe(url);
	});

	it('returns HTTP URL as-is', () => {
		const url = 'http://example.com/images/photo.jpg';
		expect(mediaService.getMediaUrl(url, 'cleaning-media')).toBe(url);
	});

	it('returns blob URL as-is', () => {
		const url = 'blob:abc123-def456';
		expect(mediaService.getMediaUrl(url, 'cleaning-media')).toBe(url);
	});

	it('returns placeholder for storage path (no http/blob prefix)', () => {
		expect(mediaService.getMediaUrl('user123/cleaning-media/photo.jpg', 'cleaning-media')).toBe(
			PLACEHOLDER,
		);
	});
});
