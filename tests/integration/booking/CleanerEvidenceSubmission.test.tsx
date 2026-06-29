import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CleaningEvidenceForm } from '@/features/cleanings/components/CleaningEvidenceForm';

describe('Cleaner Evidence Submission', () => {
	it('renders form with text areas and submit button', () => {
		const onSubmit = vi.fn();

		render(<CleaningEvidenceForm cleaningId="c1" cleanerId="u1" onSubmit={onSubmit} />);

		expect(screen.getByText(/Any broken or damaged items/i)).toBeInTheDocument();
		expect(screen.getByText(/Any supplies running low/i)).toBeInTheDocument();
		expect(screen.getByText(/Cleaning Evidence/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Complete Cleaning/i })).toBeInTheDocument();
	});

	it('shows back button when onCancel is provided', () => {
		const onSubmit = vi.fn();
		const onCancel = vi.fn();

		render(
			<CleaningEvidenceForm
				cleaningId="c1"
				cleanerId="u1"
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>,
		);

		expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
	});

	it('calls onCancel when back button clicked', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		const onCancel = vi.fn();

		render(
			<CleaningEvidenceForm
				cleaningId="c1"
				cleanerId="u1"
				onSubmit={onSubmit}
				onCancel={onCancel}
			/>,
		);

		await user.click(screen.getByRole('button', { name: /Back/i }));

		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('accepts text input in broken items and low supplies fields', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(<CleaningEvidenceForm cleaningId="c1" cleanerId="u1" onSubmit={onSubmit} />);

		const brokenInput = screen.getByPlaceholderText(/Describe any issues found/i);
		const suppliesInput = screen.getByPlaceholderText(/List items like/i);

		await user.type(brokenInput, 'Broken vase in living room');
		await user.type(suppliesInput, 'Running low on toilet paper');

		expect(brokenInput).toHaveValue('Broken vase in living room');
		expect(suppliesInput).toHaveValue('Running low on toilet paper');
	});

	it('calls onSubmit with form values and files when submitted with evidence', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);

		const { container } = render(
			<CleaningEvidenceForm cleaningId="c1" cleanerId="u1" onSubmit={onSubmit} />,
		);

		const brokenInput = screen.getByPlaceholderText(/Describe any issues found/i);
		await user.type(brokenInput, 'Broken vase');

		const suppliesInput = screen.getByPlaceholderText(/List items like/i);
		await user.type(suppliesInput, 'Low on supplies');

		const fileInput = container.querySelector('input[type="file"]');
		if (!fileInput) {
			throw new Error('File input not found');
		}

		const testFile = new File(['test'], 'evidence.jpg', { type: 'image/jpeg' });
		fireEvent.change(fileInput, { target: { files: [testFile] } });

		await user.click(screen.getByRole('button', { name: /Complete Cleaning/i }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});

		const [values, files] = onSubmit.mock.calls[0] as [
			{ broken_items_report: string; low_supplies_report: string },
			File[],
		];
		expect(values.broken_items_report).toBe('Broken vase');
		expect(values.low_supplies_report).toBe('Low on supplies');
		expect(files).toHaveLength(1);
		expect(files[0].name).toBe('evidence.jpg');
	});
});
