'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/Toast';
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

function computeUpdates(
	localTasks: CleaningTask[],
	originalTasks: CleaningTask[],
): { id: string; is_completed: boolean }[] {
	return localTasks
		.filter((lt) => {
			const original = originalTasks.find((ot) => ot.id === lt.id);
			return original && original.is_completed !== lt.is_completed;
		})
		.map((t) => ({
			id: t.id,
			is_completed: t.is_completed,
		}));
}

export function useTaskSync({ cleaning, updateTasksBatch }: UseTaskSyncOptions): UseTaskSyncResult {
	const [localTasks, setLocalTasks] = useState<CleaningTask[]>(cleaning.tasks || []);
	const [hasLocalChanges, setHasLocalChanges] = useState(false);

	const originalTasksRef = useRef<CleaningTask[]>(cleaning.tasks || []);
	const localTasksRef = useRef(localTasks);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isSyncingRef = useRef(false);
	const syncRetryCountRef = useRef(0);
	const MAX_SYNC_RETRIES = 3;
	const shouldSyncOnUnmountRef = useRef(false);

	useEffect(() => {
		localTasksRef.current = localTasks;
	}, [localTasks]);

	useEffect(() => {
		if (hasLocalChanges) {
			return;
		}
		setLocalTasks(cleaning.tasks || []);
		originalTasksRef.current = cleaning.tasks || [];
	}, [cleaning.tasks, hasLocalChanges]);

	const handleSyncTasks = useCallback(async () => {
		if (isSyncingRef.current) {
			return;
		}

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}

		const original = originalTasksRef.current;
		const current = localTasksRef.current;

		const updates = computeUpdates(current, original);

		if (updates.length === 0) {
			setHasLocalChanges(false);
			return;
		}

		isSyncingRef.current = true;
		try {
			const result = await updateTasksBatch(cleaning.id, updates);
			if (result.success) {
				syncRetryCountRef.current = 0;
				shouldSyncOnUnmountRef.current = false;
				setHasLocalChanges(false);
			} else {
				syncRetryCountRef.current += 1;
				if (syncRetryCountRef.current >= MAX_SYNC_RETRIES) {
					toast.error('Failed to sync tasks after multiple attempts');
					syncRetryCountRef.current = 0;
					setHasLocalChanges(false);
				}
			}
		} catch {
			syncRetryCountRef.current += 1;
			if (syncRetryCountRef.current >= MAX_SYNC_RETRIES) {
				toast.error('Failed to sync tasks after multiple attempts');
				syncRetryCountRef.current = 0;
				setHasLocalChanges(false);
			}
		} finally {
			isSyncingRef.current = false;
		}
	}, [cleaning.id, updateTasksBatch]);

	const handleSyncTasksRef = useRef(handleSyncTasks);
	handleSyncTasksRef.current = handleSyncTasks;

	const cleaningIdRef = useRef(cleaning.id);
	cleaningIdRef.current = cleaning.id;

	const updateTasksBatchRef = useRef(updateTasksBatch);
	updateTasksBatchRef.current = updateTasksBatch;

	useEffect(() => {
		if (!hasLocalChanges) {
			return;
		}

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			handleSyncTasksRef.current();
		}, 3000);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [hasLocalChanges]);

	useEffect(() => {
		if (!hasLocalChanges) {
			return;
		}

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [hasLocalChanges]);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			if (shouldSyncOnUnmountRef.current) {
				const original = originalTasksRef.current;
				const current = localTasksRef.current;
				const id = cleaningIdRef.current;
				const batch = updateTasksBatchRef.current;
				const updates = computeUpdates(current, original);
				if (updates.length > 0) {
					batch(id, updates).catch(() => {});
				}
			}
		};
	}, []);

	const handleTaskToggle = useCallback(
		(taskId: string) => {
			if (cleaning.status !== CLEANING_STATUS.IN_PROGRESS) {
				return;
			}
			shouldSyncOnUnmountRef.current = true;
			setHasLocalChanges(true);
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
