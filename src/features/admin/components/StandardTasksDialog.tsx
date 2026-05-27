'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cleaningService as adminCleaningService } from '@/features/admin/services/cleaningService';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { StandardTask } from '@/features/cleanings/types';

interface StandardTasksDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface TaskItem extends StandardTask {
	isNew?: boolean;
	isDirty?: boolean;
	isDeleted?: boolean;
}

export function StandardTasksDialog({ open, onOpenChange }: StandardTasksDialogProps) {
	const [tasks, setTasks] = useState<TaskItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [newTask, setNewTask] = useState('');
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	const fetchTasks = useCallback(async () => {
		setLoading(true);
		const result = await cleaningsService.getStandardTasks();
		if (result.error) {
			toast.error(result.error);
		} else {
			setTasks(result.data || []);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		if (open) {
			fetchTasks();
		} else {
			setTasks([]);
			setNewTask('');
			setValidationErrors({});
		}
	}, [open, fetchTasks]);

	const handleAddTask = () => {
		if (!newTask.trim()) {
			return;
		}
		const task: TaskItem = {
			id: crypto.randomUUID(),
			description: newTask.trim(),
			is_active: true,
			created_at: new Date().toISOString(),
			isNew: true,
			isDirty: true,
		};
		setTasks([...tasks, task]);
		setNewTask('');
	};

	const handleToggleActive = (taskId: string) => {
		setTasks(
			tasks.map((t) => (t.id === taskId ? { ...t, is_active: !t.is_active, isDirty: true } : t)),
		);
	};

	const handleUpdateDescription = (taskId: string, description: string) => {
		setTasks(tasks.map((t) => (t.id === taskId ? { ...t, description, isDirty: true } : t)));
		if (validationErrors[taskId]) {
			setValidationErrors((prev) => {
				const next = { ...prev };
				delete next[taskId];
				return next;
			});
		}
	};

	const handleDeleteTask = (taskId: string) => {
		setTasks(tasks.map((t) => (t.id === taskId ? { ...t, isDeleted: true, isDirty: true } : t)));
	};

	const handleSave = async () => {
		const errors: Record<string, string> = {};
		tasks
			.filter((t) => !t.isDeleted)
			.forEach((t) => {
				if (!t.description.trim()) {
					errors[t.id] = 'Description is required';
				}
			});

		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}

		const allTasks = tasks
			.filter((t) => !t.isDeleted)
			.map((t) => ({
				id: t.isNew ? null : t.id,
				description: t.description,
				is_active: t.is_active,
			}));

		const tasksToDelete = tasks.filter((t) => t.isDeleted && t.id).map((t) => t.id);

		setSaving(true);
		const result = await adminCleaningService.updateStandardTasks(allTasks, tasksToDelete);
		setSaving(false);

		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Standard tasks updated successfully');
			onOpenChange(false);
		}
	};

	const hasChanges = tasks.some((t) => t.isDirty);
	const visibleTasks = tasks.filter((t) => !t.isDeleted);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-screen md:max-w-lg sm:w-full h-[95svh] max-h-[85vh] flex flex-col p-0 overflow-hidden">
				<DialogHeader className="p-3 shrink-0">
					<DialogTitle>Standard Tasks</DialogTitle>
					<DialogDescription>
						Manage the default tasks shown when creating a cleaning request
					</DialogDescription>
				</DialogHeader>

				{loading ? (
					<Loading absolute={false} />
				) : (
					<div className="flex-1 min-h-0 flex flex-col pb-2 gap-4 overflow-hidden">
						<ScrollArea className="flex-1 min-h-0 px-2">
							<div className="space-y-2 mr-0.5">
								{visibleTasks.map((task) => (
									<div
										key={task.id}
										className="flex justify-center items-center gap-2 p-2 rounded-md border">
										<Checkbox
											checked={task.is_active}
											onCheckedChange={() => handleToggleActive(task.id)}
											className="shrink-0 mt-1"
										/>
										<div className="flex-1 min-w-0">
											<Input
												value={task.description}
												onChange={(e) => handleUpdateDescription(task.id, e.target.value)}
												className="flex-1 h-8"
												disabled={!task.is_active}
											/>
											{validationErrors[task.id] && (
												<p className="text-destructive text-sm mt-1">{validationErrors[task.id]}</p>
											)}
										</div>
										<Button
											variant="destructive"
											size="icon"
											className="size-8 shrink-0 mt-1"
											onClick={() => handleDeleteTask(task.id)}>
											<Trash2 className="size-4" />
										</Button>
									</div>
								))}
								{visibleTasks.length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-4">
										No standard tasks yet
									</p>
								)}
							</div>
						</ScrollArea>

						<div className="flex gap-2 px-2">
							<Input
								placeholder="Add new task..."
								value={newTask}
								onChange={(e) => setNewTask(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleAddTask();
									}
								}}
								className="flex-1"
							/>
							<Button onClick={handleAddTask} disabled={!newTask.trim()}>
								<Plus className="size-4" />
							</Button>
						</div>

						<div className="flex justify-end gap-2 pt-2 px-2 border-t">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={saving || !hasChanges}>
								{saving ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
