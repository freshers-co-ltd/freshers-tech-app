'use client';

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { toast } from '@/components/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import {
	type CleaningRequest,
	type CleaningUpdate,
	type CreateCleaningRequestPayload,
	cleaningService,
	type EvidenceInsert,
	type ReportInsert,
	type TaskInsert,
	type TaskUpdate,
	type UpdateCleaningRequestPayload,
} from '@/features/cleanings/cleaningService';
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import { supabase } from '@/lib/supabaseClient';

interface CleaningContextType {
	cleanings: CleaningRequest[];
	isLoading: boolean;
	fetchCleanings: () => Promise<void>;
	upsertCleaning: (
		payload: CreateCleaningRequestPayload | (UpdateCleaningRequestPayload & { id: string }),
	) => Promise<{ success: boolean; data?: CleaningRequest }>;
	updateCleaning: (
		id: string,
		payload: CleaningUpdate,
	) => Promise<{ success: boolean; data?: CleaningRequest }>;
	deleteCleaning: (id: string, hard?: boolean) => Promise<{ success: boolean }>;
	insertTask: (payload: TaskInsert) => Promise<{ success: boolean }>;
	updateTask: (payload: TaskUpdate) => Promise<{ success: boolean }>;
	updateTasksBatch: (cleaningId: string, updates: TaskUpdate[]) => Promise<{ success: boolean }>;
	deleteTask: (id: string, hard?: boolean) => Promise<{ success: boolean }>;
	addEvidence: (payload: EvidenceInsert) => Promise<{ success: boolean }>;
	deleteEvidence: (id: string, hard?: boolean) => Promise<{ success: boolean }>;
	upsertReport: (payload: ReportInsert) => Promise<{ success: boolean }>;
	createCleaning: (
		payload: CreateCleaningRequestPayload,
	) => Promise<{ success: boolean; data?: CleaningRequest }>;
}

const CleaningContext = createContext<CleaningContextType | undefined>(undefined);

export function CleaningProvider({ children }: { children: ReactNode }) {
	const [cleanings, setCleanings] = useState<CleaningRequest[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { user, profile } = useAuth();
	const abortControllerRef = useRef<AbortController | null>(null);
	const cleaningChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const fetchCleanings = useCallback(
		async (signal?: AbortSignal) => {
			if (!user) {
				setCleanings([]);
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			const { data, error } = await cleaningService.getCleaningRequests();

			if (signal?.aborted) {
				return;
			}

			if (error) {
				toast.error(error);
			} else if (data) {
				setCleanings(data);
			}

			setIsLoading(false);
		},
		[user],
	);

	useEffect(() => {
		if (user && profile) {
			abortControllerRef.current?.abort();
			abortControllerRef.current = new AbortController();
			fetchCleanings(abortControllerRef.current.signal);
		}

		return () => {
			abortControllerRef.current?.abort();
		};
	}, [user, profile, fetchCleanings]);

	const cleanupChannel = useCallback(() => {
		if (cleaningChannelRef.current) {
			supabase.removeChannel(cleaningChannelRef.current);
			cleaningChannelRef.current = null;
		}
	}, []);

	const setupChannel = useCallback(() => {
		if (!user || !profile) {
			return;
		}

		if (cleaningChannelRef.current) {
			return;
		}

		const isCleaner = profile.role === 'cleaner';
		const isHost = profile.role === 'host';

		if (!isCleaner && !isHost) {
			return;
		}

		const filter = isCleaner ? `cleaner_id=eq.${user.id}` : `host_id=eq.${user.id}`;

		const newChannel = supabase
			.channel('cleanings-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cleanings',
					filter,
				},
				() => {
					fetchCleanings();
				},
			)
			.subscribe((status: string, err?: unknown) => {
				if (err) {
					console.error('[Cleanings] Channel error', { status, error: err });
				}
			});

		cleaningChannelRef.current = newChannel;
	}, [user, profile, fetchCleanings]);

	useEffect(() => {
		if (!user || !profile) {
			cleanupChannel();
			return;
		}

		setupChannel();

		return () => {
			cleanupChannel();
		};
	}, [user, profile, setupChannel, cleanupChannel]);

	const upsertCleaning = async (
		payload: CreateCleaningRequestPayload | (UpdateCleaningRequestPayload & { id: string }),
	) => {
		const isUpdate = 'id' in payload;

		const { data, error } = isUpdate
			? await cleaningService.updateCleaningRequestRPC(
					payload.id,
					payload as UpdateCleaningRequestPayload,
				)
			: await cleaningService.createCleaningRequest(payload as CreateCleaningRequestPayload);

		if (error) {
			toast.error(error);
			return { success: false };
		}

		if (data) {
			setCleanings((prev) => {
				const exists = prev.find((c) => c.id === data.id);
				return exists ? prev.map((c) => (c.id === data.id ? data : c)) : [data, ...prev];
			});
			return { success: true, data };
		}

		return { success: false };
	};

	const updateCleaning = async (id: string, payload: CleaningUpdate) => {
		const { data, error } = await cleaningService.updateCleaningRequest(id, payload);

		if (error) {
			toast.error(error);
			return { success: false };
		}

		if (data) {
			setCleanings((prev) => prev.map((c) => (c.id === data.id ? data : c)));
			return { success: true, data };
		}

		return { success: false };
	};

	const deleteCleaning = async (id: string, hard: boolean = false) => {
		const { error } = hard
			? await cleaningService.hardDeleteCleaningRequest(id)
			: await cleaningService.softDeleteCleaningRequest(id);

		if (error) {
			toast.error(error);
			return { success: false };
		}

		setCleanings((prev) => prev.filter((c) => c.id !== id));
		return { success: true };
	};

	const insertTask = async (payload: TaskInsert) => {
		const { data, error } = await cleaningService.insertTask(payload);
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
	};

	const updateTask = async (payload: TaskUpdate) => {
		const { data, error } = await cleaningService.updateTask(payload);
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
	};

	const updateTasksBatch = async (cleaningId: string, updates: TaskUpdate[]) => {
		setCleanings((prev) =>
			prev.map((c) => {
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
			}),
		);

		const results = await Promise.all(updates.map((u) => cleaningService.updateTask(u)));
		const errors = results.filter((r) => r.error);

		if (errors.length > 0) {
			toast.error('Some tasks failed to save.');
			return { success: false };
		}

		return { success: true };
	};

	const deleteTask = async (id: string, hard: boolean = false) => {
		const { error } = hard
			? await cleaningService.hardDeleteTask(id)
			: await cleaningService.softDeleteTask(id);

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
	};

	const addEvidence = async (payload: EvidenceInsert) => {
		const { data, error } = await cleaningService.insertEvidence(payload);
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
	};

	const deleteEvidence = async (id: string, hard: boolean = false) => {
		const { error } = hard
			? await cleaningService.hardDeleteEvidence(id)
			: await cleaningService.softDeleteEvidence(id);

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
	};

	const upsertReport = async (payload: ReportInsert) => {
		const { data, error } = await cleaningService.upsertReport(payload);
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
	};

	useVisibilityReconnect({
		enabled: !!user && !!profile,
		onVisible: async () => {
			await fetchCleanings();
			if (!cleaningChannelRef.current || cleaningChannelRef.current.state !== 'joined') {
				cleanupChannel();
				setupChannel();
			}
		},
	});

	return (
		<CleaningContext.Provider
			value={{
				cleanings,
				isLoading,
				fetchCleanings,
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
				createCleaning: upsertCleaning,
			}}>
			{children}
		</CleaningContext.Provider>
	);
}

export const useCleanings = () => {
	const context = useContext(CleaningContext);
	if (context === undefined) {
		throw new Error('useCleanings must be used within a CleaningProvider');
	}
	return context;
};
