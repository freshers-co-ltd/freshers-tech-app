'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { cleaningService as adminCleaningService } from '@/features/admin/services/cleaningService';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { StandardTask } from '@/features/cleanings/types';

interface TaskItem extends StandardTask {
	isNew?: boolean;
	isDirty?: boolean;
	isDeleted?: boolean;
}

interface UseStandardTasksDialogOptions {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface UseStandardTasksDialogResult {
	tasks: TaskItem[];
	loading: boolean;
	saving: boolean;
	newTask: string;
	validationErrors: Record<string, string>;
	visibleTasks: TaskItem[];
	hasChanges: boolean;
	setNewTask: (value: string) => void;
	handleAddTask: () => void;
	handleToggleActive: (taskId: string) => void;
	handleUpdateDescription: (taskId: string, description: string) => void;
	handleDeleteTask: (taskId: string) => void;
	handleSave: () => Promise<void>;
}

export function useStandardTasksDialog({
	open,
	onOpenChange,
}: UseStandardTasksDialogOptions): UseStandardTasksDialogResult {
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

	return {
		tasks,
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
	};
}
