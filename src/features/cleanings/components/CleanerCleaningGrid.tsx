'use client';

import { ArrowDownUp, ListFilter, Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DICT } from '@/dictionary';
import { CleaningCard } from '@/features/cleanings/components/CleaningCard';
import { useCleanerCleanings } from '@/features/cleanings/hooks/useCleanerCleanings';
import { useCleaningFilters } from '@/features/cleanings/hooks/useCleaningFilters';
import type { CleaningStatus } from '@/features/cleanings/types';
import { CLEANING_STATUS, STATUS_GROUPS } from '@/features/cleanings/types';

interface CleanerCleaningGridProps {
	onView: (id: string) => void;
}

export function CleanerCleaningGrid({ onView }: CleanerCleaningGridProps) {
	const { cleanings } = useCleanerCleanings();
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [sortBy, setSortBy] = useState('date_asc');

	const dict = DICT.CLEANINGS;

	const filteredCleanings = useCleaningFilters(cleanings, { searchQuery, statusFilter, sortBy });

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1 sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={dict.SEARCH.PLACEHOLDER}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-8 pl-9 focus-visible:ring-1"
					/>
				</div>

				<div className="flex flex-row items-center gap-3">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="h-10 w-full sm:w-40">
							<div className="flex items-center gap-2">
								<ListFilter className="h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder={dict.SEARCH.ALL_STATUSES} />
							</div>
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="all">{dict.SEARCH.ALL_STATUSES}</SelectItem>
							{STATUS_GROUPS.CLEANER_VIEW.map((status: CleaningStatus) => {
								const displayLabel = status === CLEANING_STATUS.CONFIRMED ? 'assigned' : status;

								return (
									<SelectItem key={status} value={status}>
										{displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1).replace('_', ' ')}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>

					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="h-10 w-fit min-w-max max-w-full">
							<div className="flex items-center gap-2">
								<ArrowDownUp className="h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder={DICT.COMMON.LABELS.SORT} />
							</div>
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="date_asc">{dict.SORT.DATE_ASC}</SelectItem>
							<SelectItem value="date_desc">{dict.SORT.DATE_DESC}</SelectItem>
						</SelectContent>
					</Select>
				</div>
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
							userRole="cleaner"
							onView={onView}
						/>
					))}
				</div>
			)}
		</div>
	);
}
