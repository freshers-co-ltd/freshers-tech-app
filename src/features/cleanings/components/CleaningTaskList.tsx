'use client';

import { CheckCircle2, ListChecks } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CleaningTask {
	id: string;
	description: string;
	is_completed: boolean;
	is_custom: boolean;
}

interface CleaningTaskListProps {
	tasks: CleaningTask[];
	interactive?: boolean;
	showCustomIndicator?: boolean;
	onTaskToggle?: (taskId: string) => void;
}

export function CleaningTaskList({
	tasks,
	interactive = false,
	showCustomIndicator = false,
	onTaskToggle,
}: CleaningTaskListProps) {
	const handleToggle = (taskId: string) => {
		if (interactive && onTaskToggle) {
			onTaskToggle(taskId);
		}
	};

	return (
		<div className="space-y-3">
			<h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
				<ListChecks className="size-4 text-primary" />
				{interactive ? 'Checklist' : 'Service Checklist'}
			</h4>
			<div className="rounded-md border bg-muted/10 divide-y overflow-hidden">
				{tasks.map((task, index) => (
					<div key={task.id} className="flex items-center gap-3 px-3 py-3">
						{interactive ? (
							<>
								<Checkbox
									id={task.id}
									checked={task.is_completed}
									onCheckedChange={() => handleToggle(task.id)}
									className="size-5 shrink-0"
								/>
								<Label
									htmlFor={task.id}
									className={`text-sm flex-1 cursor-pointer ${task.is_completed ? 'text-muted-foreground line-through' : 'font-medium'}`}>
									{task.description}
								</Label>
							</>
						) : (
							<>
								<span className="flex items-center justify-center size-5 shrink-0 text-[10px] font-bold text-muted-foreground/60">
									{String(index + 1).padStart(2, '0')}
								</span>
								<div className="flex flex-1 items-center justify-between min-w-0">
									<span className="text-sm font-medium wrap-break-word">
										{task.description}
										{showCustomIndicator && task.is_custom && (
											<span className="ml-2 text-[9px] font-black text-primary uppercase border border-primary/20 px-1 rounded-sm bg-primary/5 whitespace-nowrap">
												Custom
											</span>
										)}
									</span>
									{task.is_completed && (
										<CheckCircle2 className="size-3.5 text-green-500 shrink-0 ml-2" />
									)}
								</div>
							</>
						)}
					</div>
				))}
				{tasks.length === 0 && (
					<p className="text-sm text-muted-foreground text-center py-8">No tasks defined.</p>
				)}
			</div>
		</div>
	);
}
