'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/features/admin/analyticsService';
import { formatDate } from '@/lib/utils';

const ACTION_LABELS: Record<string, string> = {
	INSERT: 'created',
	UPDATE: 'updated',
	DELETE: 'deleted',
};

interface AuditLogEntryProps {
	log: AuditLogEntry;
}

interface DiffEntry {
	field: string;
	oldValue: string;
	newValue: string;
}

function formatValue(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (value === undefined) {
		return 'undefined';
	}
	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}
	if (typeof value === 'number') {
		return value.toString();
	}
	if (typeof value === 'string') {
		if (value.length > 50) {
			return `${value.slice(0, 50)}...`;
		}
		return value;
	}
	if (Array.isArray(value)) {
		return JSON.stringify(value);
	}
	if (typeof value === 'object') {
		const str = JSON.stringify(value);
		if (str.length > 50) {
			return `${str.slice(0, 50)}...`;
		}
		return str;
	}
	return String(value);
}

function computeDiff(
	oldData: Record<string, unknown> | null,
	newData: Record<string, unknown> | null,
): DiffEntry[] {
	const diffs: DiffEntry[] = [];
	const allKeys = new Set<string>();

	if (oldData) {
		for (const k of Object.keys(oldData)) {
			allKeys.add(k);
		}
	}
	if (newData) {
		for (const k of Object.keys(newData)) {
			allKeys.add(k);
		}
	}

	for (const field of allKeys) {
		const oldVal = oldData?.[field];
		const newVal = newData?.[field];

		const oldStr = formatValue(oldVal);
		const newStr = formatValue(newVal);

		if (oldStr !== newStr) {
			diffs.push({ field, oldValue: oldStr, newValue: newStr });
		}
	}

	return diffs;
}

export function AuditLogEntryComponent({ log }: AuditLogEntryProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const actionLabel = ACTION_LABELS[log.action_type] || log.action_type.toLowerCase();
	const diffs = computeDiff(log.old_data, log.new_data);
	const changeCount = diffs.length;

	return (
		<div className="rounded-lg border bg-card">
			<div className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between md:gap-0">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-foreground whitespace-normal break-words">
						<span>{log.actor_name || 'System'}</span>
						<span className="font-normal">
							{' '}
							{actionLabel} {log.target_table} table
						</span>
					</p>
				</div>
				<div className="flex items-center gap-3 shrink-0">
					{changeCount > 0 && (
						<span className="text-sm text-muted-foreground">
							{changeCount} field{changeCount !== 1 ? 's' : ''} changed
						</span>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsExpanded(!isExpanded)}
						className="flex items-center gap-1">
						{isExpanded ? (
							<>
								<ChevronUp className="h-4 w-4" />
								<span>Hide</span>
							</>
						) : (
							<>
								<ChevronDown className="h-4 w-4" />
								<span>Show</span>
							</>
						)}
					</Button>
				</div>
			</div>
			<div className="text-sm text-muted-foreground px-4 pb-3">{formatDate(log.created_at)}</div>
			{isExpanded && changeCount > 0 && (
				<div className="border-t px-4 py-3 bg-muted/30">
					<div className="overflow-x-auto md:table md:w-full md:text-sm">
						<tbody className="block md:table-row-group">
							{diffs.map((diff) => (
								<div
									key={diff.field}
									className="block md:table-row border-b border-muted pb-4 mb-4 last:mb-0 md:pb-0 md:mb-0 md:border-0">
									<div className="hidden md:table-header-group">
										<tr className="text-left text-muted-foreground">
											<th className="pb-2 font-medium">Field</th>
											<th className="pb-2 font-medium">Old Value</th>
											<th className="pb-2 font-medium">New Value</th>
										</tr>
									</div>
									<div className="block md:table-cell py-2 md:py-2">
										<div className="md:hidden text-xs text-muted-foreground mb-1">Field</div>
										<div className="font-mono text-xs text-foreground">{diff.field}</div>
									</div>
									<div className="block md:table-cell py-2 md:py-2">
										<div className="md:hidden text-xs text-muted-foreground mb-1">Old Value</div>
										<div className="font-mono text-xs text-muted-foreground whitespace-nowrap">
											{diff.oldValue}
										</div>
									</div>
									<div className="block md:table-cell py-2 md:py-2">
										<div className="md:hidden text-xs text-muted-foreground mb-1">New Value</div>
										<div className="font-mono text-xs text-foreground whitespace-nowrap">
											{diff.newValue}
										</div>
									</div>
								</div>
							))}
						</tbody>
					</div>
				</div>
			)}
			{isExpanded && changeCount === 0 && (
				<div className="border-t px-4 py-3 text-sm text-muted-foreground">
					No field changes recorded
				</div>
			)}
		</div>
	);
}
