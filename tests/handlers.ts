import { HttpResponse, http } from 'msw';

export const handlers = [
	http.post('*/auth/v1/token', async () => {
		return HttpResponse.json(
			{
				user: { id: '123', email: 'test@example.com' },
				session: { access_token: 'mock-token' },
			},
			{ status: 200 },
		);
	}),
];
