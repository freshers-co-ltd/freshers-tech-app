'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import {
	cleaningsService,
	evidenceService,
	reportsService,
	tasksService,
} from '@/features/cleanings/services/cleaningsService';
import type {
	CleaningRequest,
	CleaningUpdate,
	CreateCleaningRequestPayload,
	EvidenceInsert,
	ReportInsert,
	TaskInsert,
	TaskUpdate,
	UpdateCleaningRequestPayload,
} from '@/features/cleanings/types';

export function useCleaningsOperations(setCleanings: Dispatch<SetStateAction<CleaningRequest[]>>) {
	const upsertCleaning = useCallback(
		async (
			payload: CreateCleaningRequestPayload | (UpdateCleaningRequestPayload & { id: string }),
		) => {
			const isUpdate = 'id' in payload;

			const { data, error } = isUpdate
				? await cleaningsService.updateCleaningRequestRPC(
						payload.id,
						payload as UpdateCleaningRequestPayload,
					)
				: await cleaningsService.createCleaningRequest(payload as CreateCleaningRequestPayload);

			if (error) {
				toast.error(error);
				return { success: false };
			}

			if (data) {
				setCleanings((prev) => {
					const exists = prev.find((c) => c.id === data.id);
					return exists ? prev.map((c) => (c.id === data.id ? data : c)) : [data, ...prev];
				});
				toast.success(
					isUpdate ? DICT.CLEANINGS.EDIT.TOAST_SUCCESS : DICT.CLEANINGS.CREATE.TOAST_SUCCESS,
				);
				return { success: true, data };
			}

			return { success: false };
		},
		[setCleanings],
	);

	const updateCleaning = useCallback(
		async (id: string, payload: CleaningUpdate) => {
			const { data, error } = await cleaningsService.updateCleaningRequest(id, payload);

			if (error) {
				toast.error(error);
				return { success: false };
			}

			if (data) {
				setCleanings((prev) => prev.map((c) => (c.id === data.id ? data : c)));
				return { success: true, data };
			}

			return { success: false };
		},
		[setCleanings],
	);

	const deleteCleaning = useCallback(
		async (id: string, hard: boolean = false) => {
			const { error } = hard
				? await cleaningsService.hardDeleteCleaningRequest(id)
				: await cleaningsService.softDeleteCleaningRequest(id);

			if (error) {
				toast.error(error);
				return { success: false };
			}

			setCleanings((prev) => prev.filter((c) => c.id !== id));
			toast.success(DICT.CLEANINGS.DELETE.TOAST_SUCCESS);
			return { success: true };
		},
		[setCleanings],
	);

	const insertTask = useCallback(
		async (payload: TaskInsert) => {
			const { data, error } = await tasksService.insertTask(payload);
			if (error) {
				toast.error(error);
				return { success: false };
			}
			if (data) {
				setCleanings((prev) =>
					prev.map((c) => {
						if (c.id === payload.cleaning_id) {
							return { ...c, tasks: [...(c.tasks || []), data] };
						}
						return c;
					}),
				);
			}
			return { success: true };
		},
		[setCleanings],
	);

	const updateTask = useCallback(
		async (payload: TaskUpdate) => {
			const { data, error } = await tasksService.updateTask(payload);
			if (error) {
				toast.error(error);
				return { success: false };
			}
			if (data) {
				setCleanings((prev) =>
					prev.map((c) => {
						if (c.id === payload.cleaning_id) {
							return {
								...c,
								tasks: c.tasks?.map((t) => (t.id === payload.id ? data : t)),
							};
						}
						return c;
					}),
				);
			}
			return { success: true };
		},
		[setCleanings],
	);

	const updateTasksBatch = useCallback(
		async (cleaningId: string, updates: TaskUpdate[]) => {
			const snapshotRef: { current: CleaningRequest[] } = { current: [] };
			setCleanings((prev) => {
				snapshotRef.current = prev;
				return prev.map((c) => {
					if (c.id === cleaningId) {
						return {
							...c,
							tasks: c.tasks?.map((t) => {
								const update = updates.find((u) => u.id === t.id);
								if (update && typeof update.is_completed === 'boolean') {
									return { ...t, is_completed: update.is_completed };
								}
								return t;
							}),
						};
					}
					return c;
				});
			});

			const results = await Promise.all(updates.map((u) => tasksService.updateTask(u)));
			const errors = results.filter((r) => r.error);

			if (errors.length > 0) {
				const failedIds = new Set(updates.filter((_, i) => results[i]?.error).map((u) => u.id));
				setCleanings((prev) =>
					prev.map((c) => {
						if (c.id !== cleaningId) {
							return c;
						}
						return {
							...c,
							tasks: c.tasks?.map((t) => {
								if (failedIds.has(t.id)) {
									return (
										snapshotRef.current
											.find((s) => s.id === cleaningId)
											?.tasks?.find((st) => st.id === t.id) ?? t
									);
								}
								return t;
							}),
						};
					}),
				);
				toast.error('Some tasks failed to save.');
				return { success: false };
			}

			return { success: true };
		},
		[setCleanings],
	);

	const deleteTask = useCallback(
		async (id: string, hard: boolean = false) => {
			const { error } = hard
				? await tasksService.hardDeleteTask(id)
				: await tasksService.softDeleteTask(id);

			if (error) {
				toast.error(error);
				return { success: false };
			}
			setCleanings((prev) =>
				prev.map((c) => ({
					...c,
					tasks: c.tasks?.filter((t) => t.id !== id),
				})),
			);
			return { success: true };
		},
		[setCleanings],
	);

	const addEvidence = useCallback(
		async (payload: EvidenceInsert) => {
			const { data, error } = await evidenceService.insertEvidence(payload);
			if (error) {
				toast.error(error);
				return { success: false };
			}
			if (data) {
				setCleanings((prev) =>
					prev.map((c) => {
						if (c.id === payload.cleaning_id) {
							return { ...c, evidence: [...(c.evidence || []), data] };
						}
						return c;
					}),
				);
			}
			return { success: true };
		},
		[setCleanings],
	);

	const deleteEvidence = useCallback(
		async (id: string, hard: boolean = false) => {
			const { error } = hard
				? await evidenceService.hardDeleteEvidence(id)
				: await evidenceService.softDeleteEvidence(id);

			if (error) {
				toast.error(error);
				return { success: false };
			}
			setCleanings((prev) =>
				prev.map((c) => ({
					...c,
					evidence: c.evidence?.filter((e) => e.id !== id),
				})),
			);
			return { success: true };
		},
		[setCleanings],
	);

	const upsertReport = useCallback(
		async (payload: ReportInsert) => {
			const { data, error } = await reportsService.upsertReport(payload);
			if (error) {
				toast.error(error);
				return { success: false };
			}
			if (data) {
				setCleanings((prev) =>
					prev.map((c) => {
						if (c.id === payload.cleaning_id) {
							return { ...c, report: data };
						}
						return c;
					}),
				);
			}
			return { success: true };
		},
		[setCleanings],
	);

	return {
		upsertCleaning,
		updateCleaning,
		deleteCleaning,
		insertTask,
		updateTask,
		updateTasksBatch,
		deleteTask,
		addEvidence,
		deleteEvidence,
		upsertReport,
	};
}
