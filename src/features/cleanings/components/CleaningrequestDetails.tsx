'use client';

import { Banknote, Bath, Bed, Clock, Info, NotepadText, User } from 'lucide-react';
import { DICT } from '@/dictionary';
import type { UserRole } from '@/features/auth/types';
import type { CleaningRequest } from '@/features/cleanings/types';
import { formatDate } from '@/lib/utils';

interface CleaningRequestDetailsProps {
	cleaning: CleaningRequest;
	userRole: UserRole;
	estimatedHours: number | null;
}

export function CleaningRequestDetails({
	cleaning,
	userRole,
	estimatedHours,
}: CleaningRequestDetailsProps) {
	const isAdmin = userRole === 'admin';
	const isHost = userRole === 'host';

	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
					<Clock className="size-5 text-primary shrink-0" />
					<div className="min-w-0">
						<p className="text-[10px] text-muted-foreground uppercase font-bold">Scheduled</p>
						<span>{formatDate(cleaning.scheduled_start)}</span>
						<span> at {formatDate(cleaning.scheduled_start, { variant: 'time' })}</span>
					</div>
				</div>

				<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
					<Banknote className="size-5 text-primary shrink-0" />
					<div className="min-w-0 flex gap-4">
						{isAdmin ? (
							<>
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold">Host Cost</p>
									{cleaning.service_cost === null ? (
										<p className="text-muted-foreground">Not set</p>
									) : (
										<p>
											{DICT.COMMON.CURRENCY}
											{cleaning.service_cost.toFixed(2)}
										</p>
									)}
								</div>
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold">
										Cleaner Pay
									</p>
									<p>
										{DICT.COMMON.CURRENCY}
										{cleaning.cleaner_pay?.toFixed(2) ?? '0.00'}
									</p>
								</div>
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold">Est. Time</p>
									<p>{estimatedHours ? `${estimatedHours.toFixed(1)}h` : '-'}</p>
								</div>
							</>
						) : isHost ? (
							<div>
								<p className="text-[10px] text-muted-foreground uppercase font-bold">Cost</p>
								{cleaning.service_cost === null ? (
									<p className="text-muted-foreground">Not set</p>
								) : (
									<p>
										{DICT.COMMON.CURRENCY}
										{cleaning.service_cost.toFixed(2)}
									</p>
								)}
							</div>
						) : (
							<>
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold">Earnings</p>
									<p>
										{DICT.COMMON.CURRENCY}
										{cleaning.cleaner_pay?.toFixed(2) ?? '0.00'}
									</p>
								</div>
								<div>
									<p className="text-[10px] text-muted-foreground uppercase font-bold">Est. Time</p>
									<p>{estimatedHours ? `${estimatedHours.toFixed(1)}h` : '-'}</p>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
					<Info className="size-5 text-primary shrink-0" />
					<div className="">
						<p className="text-[10px] text-muted-foreground uppercase font-bold">Details</p>
						<div className="flex gap-3">
							<div className="flex items-center gap-1">
								<Bed className="size-4 " />
								<span>{cleaning.property?.bedrooms}</span>
							</div>
							<div className="flex items-center gap-1">
								<Bath className="size-4" />
								<span>{cleaning.property?.bathrooms}</span>
							</div>
							<span className="ml-auto capitalize">{cleaning.property?.type}</span>
						</div>
					</div>
				</div>
				{(isHost || isAdmin) && (
					<div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
						<User className="size-5 text-primary shrink-0" />
						<div className="min-w-0">
							<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
								Assigned Cleaner
							</p>
							{cleaning.cleaner?.full_name ? (
								<span className="text-sm truncate">{cleaning.cleaner.full_name}</span>
							) : (
								<span className="text-sm text-muted-foreground">
									{DICT.CLEANINGS.DETAIL.PENDING_ASSIGNMENT}
								</span>
							)}
						</div>
					</div>
				)}
			</div>

			<div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 min-w-0">
				<NotepadText className="size-5 text-primary shrink-0 mt-0.5" />
				<div className="min-w-0 space-y-2">
					<p className="text-[10px] text-muted-foreground uppercase font-bold">
						{DICT.CLEANINGS.FORM.LABELS.INFORMATION}
					</p>
					{cleaning.information && <span className="text-sm block">{cleaning.information}</span>}
					<span>
						{DICT.CLEANINGS.DETAIL.TOILETRIES_RESTOCK}:{' '}
						{cleaning.stocks_included
							? DICT.CLEANINGS.DETAIL.RESTOCK_INCLUDED
							: DICT.CLEANINGS.DETAIL.RESTOCK_NOT_INCLUDED}
					</span>
				</div>
			</div>
		</>
	);
}
