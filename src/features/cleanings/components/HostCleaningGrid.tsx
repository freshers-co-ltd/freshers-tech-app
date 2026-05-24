'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
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
import { CleaningGridSkeleton } from '@/features/cleanings/components/CleaningGridSkeleton';
import { STATUS_GROUPS } from '@/features/cleanings/types';

interface HostCleaningGridProps {
	onView: (id: string) => void;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function HostCleaningGrid({ onView, onEdit, onDelete }: HostCleaningGridProps) {
	const { cleanings, isLoading } = useCleanings();
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [sortBy, setSortBy] = useState('date_desc');

	const dict = DICT.CLEANINGS;

	const filteredCleanings = useMemo(() => {
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

	if (isLoading) {
		return <CleaningGridSkeleton />;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center">
				<div className="relative flex-1 md:max-w-72">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={dict.SEARCH.PLACEHOLDER}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 h-8"
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full md:w-40">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{dict.SEARCH.ALL_STATUSES}</SelectItem>
						{STATUS_GROUPS.ALL.map((status) => (
							<SelectItem key={status} value={status}>
								{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger className="w-full md:w-48">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="date_desc">{dict.SORT.DATE_DESC}</SelectItem>
						<SelectItem value="date_asc">{dict.SORT.DATE_ASC}</SelectItem>
						<SelectItem value="requested_desc">{dict.SORT.REQUESTED_DESC}</SelectItem>
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
							userRole="host"
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
