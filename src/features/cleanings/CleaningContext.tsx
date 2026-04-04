'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import {
	type CleaningRequest,
	type CreateCleaningRequestPayload,
	cleaningService,
	type UpdateCleaningRequestPayload,
} from './cleaningService';

interface CleaningContextType {
	cleanings: CleaningRequest[];
	isLoading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	createCleaning: (payload: CreateCleaningRequestPayload) => Promise<boolean>;
	updateCleaning: (id: string, update: UpdateCleaningRequestPayload) => Promise<boolean>;
	deleteCleaning: (id: string) => Promise<boolean>;
}

const CleaningContext = createContext<CleaningContextType | undefined>(undefined);

export function CleaningProvider({ children }: { children: ReactNode }) {
	const [cleanings, setCleanings] = useState<CleaningRequest[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();

	const fetchCleanings = useCallback(async () => {
		if (!user) {
			setCleanings([]);
			setIsLoading(false);
			return;
		}

		if (cleanings.length === 0) {
			setIsLoading(true);
		}

		setError(null);
		const { data, error: fetchError } = await cleaningService.getCleaningRequests();

		if (fetchError) {
			setError(fetchError);
			toast.error(fetchError);
		} else {
			setCleanings(data || []);
		}

		setIsLoading(false);
	}, [user, cleanings.length]);

	useEffect(() => {
		fetchCleanings();
	}, [fetchCleanings]);

	const createCleaning = async (payload: CreateCleaningRequestPayload): Promise<boolean> => {
		const { error: createError } = await cleaningService.createCleaningRequest(payload);

		if (createError) {
			toast.error(createError);
			return false;
		}

		await fetchCleanings();
		return true;
	};

	const updateCleaning = async (
		id: string,
		update: UpdateCleaningRequestPayload,
	): Promise<boolean> => {
		const { error: updateError } = await cleaningService.updateCleaningRequest(id, update);

		if (updateError) {
			toast.error(updateError);
			return false;
		}

		await fetchCleanings();
		return true;
	};

	const deleteCleaning = async (id: string): Promise<boolean> => {
		const { error: deleteError } = await cleaningService.deleteCleaningRequest(id);

		if (deleteError) {
			toast.error(deleteError);
			return false;
		}

		setCleanings((prev) => {
			return prev.filter((c) => {
				return c.id !== id;
			});
		});

		return true;
	};

	return (
		<CleaningContext.Provider
			value={{
				cleanings,
				isLoading,
				error,
				refresh: fetchCleanings,
				createCleaning,
				updateCleaning,
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
