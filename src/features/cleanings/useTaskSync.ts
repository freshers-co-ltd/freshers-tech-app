'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CleaningRequest, CleaningTask } from '@/features/cleanings/types';
import { CLEANING_STATUS } from '@/features/cleanings/types';

interface UseTaskSyncOptions {
	cleaning: CleaningRequest;
	updateTasksBatch: (
		cleaningId: string,
		updates: { id: string; is_completed: boolean }[],
	) => Promise<{ success: boolean }>;
}

interface UseTaskSyncResult {
	localTasks: CleaningTask[];
	handleTaskToggle: (taskId: string) => void;
	handleSyncTasks: () => Promise<void>;
}

export function useTaskSync({ cleaning, updateTasksBatch }: UseTaskSyncOptions): UseTaskSyncResult {
	const [localTasks, setLocalTasks] = useState<CleaningTask[]>(cleaning.tasks || []);

	const tasksRef = useRef<CleaningTask[]>(cleaning.tasks || []);
	const localTasksRef = useRef(localTasks);

	useEffect(() => {
		setLocalTasks(cleaning.tasks || []);
		tasksRef.current = cleaning.tasks || [];
	}, [cleaning.tasks]);

	useEffect(() => {
		localTasksRef.current = localTasks;
	}, [localTasks]);

	const handleSyncTasks = useCallback(async () => {
		const originalTasks = tasksRef.current;
		const currentLocal = localTasksRef.current;

		const updates = currentLocal
			.filter((lt) => {
				const original = originalTasks.find((ot) => ot.id === lt.id);
				return original && original.is_completed !== lt.is_completed;
			})
			.map((t) => ({
				cleaning_id: cleaning.id,
				id: t.id,
				is_completed: t.is_completed,
			}));

		if (updates.length > 0) {
			try {
				await updateTasksBatch(cleaning.id, updates);
			} catch (error) {
				console.error(error);
			}
		}
	}, [cleaning.id, updateTasksBatch]);

	const handleTaskToggle = useCallback(
		(taskId: string) => {
			if (cleaning.status !== CLEANING_STATUS.IN_PROGRESS) {
				return;
			}
			setLocalTasks((prev) =>
				prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)),
			);
		},
		[cleaning.status],
	);

	return {
		localTasks,
		handleTaskToggle,
		handleSyncTasks,
	};
}
