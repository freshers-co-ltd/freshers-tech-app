'use client';

import { ArrowDownUp, ListFilter, Search } from 'lucide-react';
import { useState } from 'react';
import { DebouncedInput } from '@/components/ui/debounced-input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DICT } from '@/dictionary';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CleaningCard } from '@/features/cleanings/components/CleaningCard';
import { useCleaningFilters } from '@/features/cleanings/hooks/useCleaningFilters';
import type { CleaningStatus } from '@/features/cleanings/types';
import { CLEANING_STATUS, STATUS_GROUPS } from '@/features/cleanings/types';

interface CleaningGridProps {
	onView: (id: string) => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	userRole: 'host' | 'cleaner';
}

export function CleaningGrid({ onView, onEdit, onDelete, userRole }: CleaningGridProps) {
	const { cleanings } = useCleanings();
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [sortBy, setSortBy] = useState('date_desc');

	const dict = DICT.CLEANINGS;

	const filteredCleanings = useCleaningFilters(cleanings, { searchQuery, statusFilter, sortBy });

	const isHost = userRole === 'host';
	const statusGroups = isHost ? STATUS_GROUPS.HOST_ALL : STATUS_GROUPS.CLEANER_VIEW;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1 sm:max-w-100">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<DebouncedInput
						placeholder={dict.SEARCH.PLACEHOLDER}
						value={searchQuery}
						onValueChange={setSearchQuery}
						debounceMs={300}
						className="h-8 pl-9 focus-visible:ring-1"
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="h-10 w-full sm:w-fit">
						<div className="flex items-center gap-2">
							<ListFilter className="size-4 text-muted-foreground" />
							<SelectValue placeholder={dict.SEARCH.ALL_STATUSES} />
						</div>
					</SelectTrigger>
					<SelectContent align="end">
						<SelectItem value="all">{dict.SEARCH.ALL_STATUSES}</SelectItem>
						{statusGroups.map((status: CleaningStatus) => {
							const displayLabel =
								!isHost && status === CLEANING_STATUS.CONFIRMED
									? dict.ASSIGNED
									: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');

							return (
								<SelectItem key={status} value={status}>
									{displayLabel}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>

				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger className="h-10 w-full sm:w-fit">
						<div className="flex items-center gap-2">
							<ArrowDownUp className="size-4 text-muted-foreground" />
							<SelectValue placeholder={DICT.COMMON.LABELS.SORT} />
						</div>
					</SelectTrigger>
					<SelectContent align="end">
						<SelectItem value="date_desc">{dict.SORT.DATE_DESC}</SelectItem>
						<SelectItem value="date_asc">{dict.SORT.DATE_ASC}</SelectItem>
						{isHost && <SelectItem value="requested_desc">{dict.SORT.REQUESTED_DESC}</SelectItem>}
					</SelectContent>
				</Select>
			</div>

			{filteredCleanings.length === 0 ? (
				<div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
					{dict.SEARCH.NO_RESULTS}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{filteredCleanings.map((cleaning) => (
						<CleaningCard
							key={cleaning.id}
							cleaning={cleaning}
							userRole={userRole}
							onView={onView}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
}
