'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import {
	type CleaningRequest,
	type CreateCleaningRequestPayload,
	type UpdateCleaningRequestPayload,
	cleaningService,
} from '@/features/cleanings/cleaningService';

interface CleaningContextType {
	cleanings: CleaningRequest[];
	isLoading: boolean;
	fetchCleanings: () => Promise<void>;
	upsertCleaning: (
		payload: CreateCleaningRequestPayload | (UpdateCleaningRequestPayload & { id: string }),
	) => Promise<{ success: boolean; data?: CleaningRequest }>;
	deleteCleaning: (id: string) => Promise<{ success: boolean }>;
}

const CleaningContext = createContext<CleaningContextType | undefined>(undefined);

export function CleaningProvider({ children }: { children: ReactNode }) {
	const [cleanings, setCleanings] = useState<CleaningRequest[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { user, profile } = useAuth();

	const fetchCleanings = useCallback(async () => {
		if (!user) {
			setCleanings([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const { data, error } = await cleaningService.getCleaningRequests();

		if (error) {
			toast.error(error);
		} else if (data) {
			setCleanings(data);
		}

		setIsLoading(false);
	}, [user]);

	useEffect(() => {
		if (user && profile?.role === 'host') {
			fetchCleanings();
		} else if (user && profile) {
			setIsLoading(false);
		}
	}, [user, profile, fetchCleanings]);

	const upsertCleaning = async (
		payload: CreateCleaningRequestPayload | (UpdateCleaningRequestPayload & { id: string }),
	) => {
		const isUpdate = 'id' in payload;

		const { data, error } = isUpdate
			? await cleaningService.updateCleaningRequest(
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

	const deleteCleaning = async (id: string) => {
		const { error } = await cleaningService.deleteCleaningRequest(id);

		if (error) {
			toast.error(error);
			return { success: false };
		}

		setCleanings((prev) => prev.filter((c) => c.id !== id));
		return { success: true };
	};

	return (
		<CleaningContext.Provider
			value={{
				cleanings,
				isLoading,
				fetchCleanings,
				upsertCleaning,
				deleteCleaning,
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
