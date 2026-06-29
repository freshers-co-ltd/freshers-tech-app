'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Loading } from '@/components/Loading';
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
import { useStandardTasksDialog } from '@/features/admin/hooks/useStandardTasksDialog';

interface StandardTasksDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function StandardTasksDialog({ open, onOpenChange }: StandardTasksDialogProps) {
	const {
		loading,
		saving,
		newTask,
		validationErrors,
		visibleTasks,
		hasChanges,
		setNewTask,
		handleAddTask,
		handleToggleActive,
		handleUpdateDescription,
		handleDeleteTask,
		handleSave,
	} = useStandardTasksDialog({ open, onOpenChange });

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
