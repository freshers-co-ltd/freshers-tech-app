import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/components/Toast';
import { useTaskSync } from '@/features/cleanings/hooks/useTaskSync';
import type { CleaningRequest, CleaningTask } from '@/features/cleanings/types';
import { CLEANING_STATUS } from '@/features/cleanings/types';

vi.mock('@/components/Toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
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

function createCleaning(overrides?: Partial<CleaningRequest>): CleaningRequest {
	return {
		id: 'cleaning_123',
		host_id: 'host_1',
		cleaner_id: null,
		property_id: 'prop_1',
		status: CLEANING_STATUS.IN_PROGRESS,
		scheduled_start: '2026-06-23T10:00:00Z',
		information: null,
		stocks_included: false,
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
		...overrides,
	} as CleaningRequest;
}

describe('useTaskSync', () => {
	let mockUpdateTasksBatch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateTasksBatch = vi.fn().mockResolvedValue({ success: true });
	});

	it('initialises localTasks from cleaning.tasks', () => {
		const cleaning = createCleaning();
		const { result } = renderHook(() =>
			useTaskSync({ cleaning, updateTasksBatch: mockUpdateTasksBatch }),
		);

		expect(result.current.localTasks).toHaveLength(2);
		expect(result.current.localTasks[0].description).toBe('Vacuum rooms');
		expect(result.current.localTasks[1].description).toBe('Clean windows');
	});

	it('toggles a single task for IN_PROGRESS cleaning', () => {
		const cleaning = createCleaning({ status: CLEANING_STATUS.IN_PROGRESS });
		const { result } = renderHook(() =>
			useTaskSync({ cleaning, updateTasksBatch: mockUpdateTasksBatch }),
		);

		act(() => {
			result.current.handleTaskToggle('task_1');
		});

		expect(result.current.localTasks[0].is_completed).toBe(true);
		expect(result.current.localTasks[1].is_completed).toBe(false);
	});

	it('does nothing when cleaning status is not IN_PROGRESS', () => {
		const cleaning = createCleaning({ status: CLEANING_STATUS.CONFIRMED });
		const { result } = renderHook(() =>
			useTaskSync({ cleaning, updateTasksBatch: mockUpdateTasksBatch }),
		);

		act(() => {
			result.current.handleTaskToggle('task_1');
		});

		expect(result.current.localTasks[0].is_completed).toBe(false);
	});

	it('calls updateTasksBatch only for changed tasks', async () => {
		const cleaning = createCleaning({ status: CLEANING_STATUS.IN_PROGRESS });
		const { result } = renderHook(() =>
			useTaskSync({ cleaning, updateTasksBatch: mockUpdateTasksBatch }),
		);

		act(() => {
			result.current.handleTaskToggle('task_1');
		});

		await act(() => result.current.handleSyncTasks());

		expect(mockUpdateTasksBatch).toHaveBeenCalledWith('cleaning_123', [
			{ id: 'task_1', is_completed: true },
		]);
	});

	it('retries up to max attempts, then shows error toast and reverts changes', async () => {
		mockUpdateTasksBatch = vi.fn().mockResolvedValue({ success: false });
		const cleaning = createCleaning({
			status: CLEANING_STATUS.IN_PROGRESS,
			tasks: [createTask({ id: 'task_1' })],
		});
		const { result } = renderHook(() =>
			useTaskSync({ cleaning, updateTasksBatch: mockUpdateTasksBatch }),
		);

		act(() => {
			result.current.handleTaskToggle('task_1');
		});
		expect(result.current.localTasks[0].is_completed).toBe(true);

		for (let i = 0; i < 3; i++) {
			await act(() => result.current.handleSyncTasks());
		}

		expect(toast.error).toHaveBeenCalledWith('Failed to sync tasks after multiple attempts');

		await waitFor(() => {
			expect(result.current.localTasks[0].is_completed).toBe(false);
		});
	});

	it('auto-syncs after local changes via debounce', async () => {
		vi.useFakeTimers();
		const cleaning = createCleaning({
			status: CLEANING_STATUS.IN_PROGRESS,
			tasks: [createTask({ id: 'task_1' })],
		});
		const { result } = renderHook(() =>
			useTaskSync({ cleaning, updateTasksBatch: mockUpdateTasksBatch }),
		);

		act(() => {
			result.current.handleTaskToggle('task_1');
		});

		vi.advanceTimersByTime(2999);
		expect(mockUpdateTasksBatch).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		await vi.waitFor(() => {
			expect(mockUpdateTasksBatch).toHaveBeenCalled();
		});

		vi.useRealTimers();
	});
});
