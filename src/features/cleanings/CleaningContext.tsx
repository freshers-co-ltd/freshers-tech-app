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
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
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
import { useVisibilityReconnect } from '@/hooks/useVisibilityReconnect';
import { useCleaningsOperations } from './hooks/useCleaningsOperations';
import { useCleaningsRealtime } from './hooks/useCleaningsRealtime';

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

	const operations = useCleaningsOperations(setCleanings);

	const fetchCleanings = useCallback(
		async (signal?: AbortSignal) => {
			if (!user) {
				setCleanings([]);
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			const { data, error } = await cleaningsService.getCleaningRequests();

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

	const { reconnect: reconnectChannel } = useCleaningsRealtime({
		user,
		profile,
		onCleaningChange: fetchCleanings,
	});

	useVisibilityReconnect({
		enabled: !!user && !!profile,
		onVisible: async () => {
			await fetchCleanings();
			reconnectChannel();
		},
	});

	return (
		<CleaningContext.Provider
			value={{
				cleanings,
				isLoading,
				fetchCleanings,
				upsertCleaning: operations.upsertCleaning,
				updateCleaning: operations.updateCleaning,
				deleteCleaning: operations.deleteCleaning,
				insertTask: operations.insertTask,
				updateTask: operations.updateTask,
				updateTasksBatch: operations.updateTasksBatch,
				deleteTask: operations.deleteTask,
				addEvidence: operations.addEvidence,
				deleteEvidence: operations.deleteEvidence,
				upsertReport: operations.upsertReport,
				createCleaning: operations.upsertCleaning,
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
