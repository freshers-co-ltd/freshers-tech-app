import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import { useCleaningsOperations } from '@/features/cleanings/hooks/useCleaningsOperations';
import { tasksService } from '@/features/cleanings/services/cleaningsService';
import type { CleaningRequest, CleaningTask } from '@/features/cleanings/types';
import { CLEANING_STATUS } from '@/features/cleanings/types';

vi.mock('@/components/Toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock('@/features/cleanings/services/cleaningsService', () => ({
	cleaningsService: {},
	evidenceService: {},
	reportsService: {},
	tasksService: { updateTask: vi.fn() },
}));

function createTask(overrides?: Partial<CleaningTask>): CleaningTask {
	return {
		id: 'task_1',
		description: 'Vacuum rooms',
		is_completed: false,
		is_custom: false,
		...overrides,
	};
}

function createCleaning(): CleaningRequest {
	return {
		id: 'cleaning_123',
		host_id: 'host_1',
		cleaner_id: null,
		property_id: 'prop_1',
		status: CLEANING_STATUS.IN_PROGRESS,
		scheduled_start: '2026-06-23T10:00:00Z',
		information: null,
		stocks_included: false,
		source: 'manual',
		service_cost: null,
		cleaner_pay: null,
		clock_in_time: null,
		clock_out_time: null,
		created_at: '2026-06-22T10:00:00Z',
		updated_at: '2026-06-22T10:00:00Z',
		deleted_at: null,
		property: null,
		cleaner: null,
		tasks: [
			createTask({ id: 'task_1' }),
			createTask({ id: 'task_2', description: 'Clean windows' }),
		],
		evidence: [],
		report: null,
	} as CleaningRequest;
}

function Harness({ initialCleanings }: { initialCleanings: CleaningRequest[] }) {
	const [cleanings, setCleanings] = useState<CleaningRequest[]>(initialCleanings);
	const { updateTasksBatch } = useCleaningsOperations(setCleanings);
	return (
		<div>
			<button
				type="button"
				onClick={() => {
					void updateTasksBatch('cleaning_123', [
						{ id: 'task_1', is_completed: true },
						{ id: 'task_2', is_completed: true },
					]);
				}}>
				run
			</button>
			<pre data-testid="cleanings">{JSON.stringify(cleanings)}</pre>
		</div>
	);
}

function readState(): CleaningRequest[] {
	return JSON.parse(screen.getByTestId('cleanings').textContent ?? '[]') as CleaningRequest[];
}

describe('useCleaningsOperations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(tasksService.updateTask).mockImplementation(async (payload) => {
			if (payload.id === 'task_1') {
				return { data: null, error: 'Failed' };
			}
			return { data: createTask({ id: 'task_2', is_completed: true }), error: null };
		});
	});

	it('rolls back only the failed tasks to their original values', async () => {
		render(<Harness initialCleanings={[createCleaning()]} />);

		fireEvent.click(screen.getByText('run'));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(DICT.CLEANINGS.DETAIL.TASKS.TOAST_SAVE_FAILED);
		});

		const tasks = readState()[0].tasks;
		const task1 = tasks.find((t) => t.id === 'task_1');
		const task2 = tasks.find((t) => t.id === 'task_2');
		expect(task1?.is_completed).toBe(false);
		expect(task2?.is_completed).toBe(true);
	});

	it('keeps all optimistic updates when every task succeeds', async () => {
		vi.mocked(tasksService.updateTask).mockImplementation(async (payload) => ({
			data: createTask({ id: payload.id ?? 'task_1', is_completed: true }),
			error: null,
		}));

		render(<Harness initialCleanings={[createCleaning()]} />);

		fireEvent.click(screen.getByText('run'));

		await waitFor(() => {
			const tasks = readState()[0].tasks;
			expect(tasks.every((t) => t.is_completed)).toBe(true);
		});
	});
});
