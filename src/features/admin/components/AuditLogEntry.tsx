'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/features/admin/analyticsService';

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
			<div className="flex items-center justify-between p-4">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-foreground truncate">
						<span>{log.actor_name || 'System'}</span>
						<span className="font-normal">
							{' '}
							{actionLabel} {log.target_table} table
						</span>
					</p>
				</div>
				<div className="flex items-center gap-3 shrink-0 ml-2">
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
			<div className="text-sm text-muted-foreground px-4 pb-3">
				{new Date(log.created_at).toLocaleString()}
			</div>
			{isExpanded && changeCount > 0 && (
				<div className="border-t px-4 py-3 bg-muted/30">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-muted-foreground">
								<th className="pb-2 font-medium">Field</th>
								<th className="pb-2 font-medium">Old Value</th>
								<th className="pb-2 font-medium">New Value</th>
							</tr>
						</thead>
						<tbody>
							{diffs.map((diff) => (
								<tr key={diff.field} className="border-t border-muted">
									<td className="py-2 font-mono text-xs text-foreground">{diff.field}</td>
									<td className="py-2 font-mono text-xs text-muted-foreground">{diff.oldValue}</td>
									<td className="py-2 font-mono text-xs text-foreground">{diff.newValue}</td>
								</tr>
							))}
						</tbody>
					</table>
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
