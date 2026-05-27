'use client';

import { useMemo } from 'react';
import type { CleaningRequest } from '@/features/cleanings/types';

interface UseCleaningFiltersOptions {
	searchQuery: string;
	statusFilter: string;
	sortBy: string;
}

export function useCleaningFilters(
	cleanings: CleaningRequest[],
	{ searchQuery, statusFilter, sortBy }: UseCleaningFiltersOptions,
) {
	return useMemo(() => {
		let result = [...cleanings];

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(c) =>
					c.property?.address_line_1.toLowerCase().includes(query) ||
					c.property?.postcode.toLowerCase().includes(query),
			);
		}

		if (statusFilter !== 'all') {
			result = result.filter((c) => c.status === statusFilter);
		}

		result.sort((a, b) => {
			if (sortBy === 'date_asc') {
				return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
			}
			if (sortBy === 'date_desc') {
				return new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime();
			}
			if (sortBy === 'requested_desc') {
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			}
			return 0;
		});

		return result;
	}, [cleanings, searchQuery, statusFilter, sortBy]);
}
