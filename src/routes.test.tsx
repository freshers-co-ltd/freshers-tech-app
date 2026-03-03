import { describe, expect, it } from 'vitest';
import { router } from './routes';

describe('Router Configuration', () => {
	it('contains the correct base paths', () => {
		const rootRoute = router.routes[0];
		expect(rootRoute).toBeDefined();

		const routes = rootRoute?.children;
		const paths = routes?.map((r) => r.path);

		expect(paths).toContain('login');
		expect(paths).toContain('signup');
		expect(paths).toContain('resetpassword');
	});

	it('defines AuthLayout as the root element', () => {
		const rootRoute = router.routes[0];
		expect(rootRoute?.path).toBe('/');
	});
});
