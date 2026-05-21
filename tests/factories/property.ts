import type { Property } from '@/features/properties/propertyService';

export function buildProperty(overrides?: Partial<Property>): Property {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		host_id: 'user_123',
		address_line_1: '123 Test Street',
		address_line_2: null,
		town_city: 'London',
		postcode: 'SW1A 1AA',
		type: 'house',
		bedrooms: 3,
		bathrooms: 2,
		main_image_url: '',
		extra_images_urls: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		deleted_at: null,
		...overrides,
	};
}
