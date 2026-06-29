'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/Toast';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { CleanerPayConfig } from '@/features/cleanings/types';

interface UseCleanerPayConfigDialogOptions {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

interface UseCleanerPayConfigDialogResult {
	config: CleanerPayConfig | null;
	loading: boolean;
	saving: boolean;
	updateHourlyRate: (value: string) => void;
	updateBathroomTime: (value: string) => void;
	updateTargetTime: (key: keyof CleanerPayConfig['target_times'], value: string) => void;
	handleSave: () => Promise<void>;
}

export function useCleanerPayConfigDialog({
	open,
	onOpenChange,
	onSuccess,
}: UseCleanerPayConfigDialogOptions): UseCleanerPayConfigDialogResult {
	const [config, setConfig] = useState<CleanerPayConfig | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const fetchConfig = useCallback(async () => {
		setLoading(true);
		const result = await cleaningsService.getCleanerPayConfig();
		if (result.error) {
			toast.error(result.error);
		} else {
			setConfig(result.data ?? null);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		if (open) {
			fetchConfig();
		}
	}, [open, fetchConfig]);

	const handleSave = async () => {
		if (!config) {
			return;
		}

		setSaving(true);
		const result = await cleaningsService.updateCleanerPayConfig(config);
		setSaving(false);

		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Pay rates updated successfully');
			onSuccess?.();
			onOpenChange(false);
		}
	};

	const updateHourlyRate = (value: string) => {
		if (!config) {
			return;
		}
		const rate = parseFloat(value);
		if (!Number.isNaN(rate)) {
			setConfig({ ...config, hourly_rate: rate });
		}
	};

	const updateBathroomTime = (value: string) => {
		if (!config) {
			return;
		}
		const hours = parseFloat(value);
		if (!Number.isNaN(hours)) {
			setConfig({ ...config, bathroom_time: hours });
		}
	};

	const updateTargetTime = (key: keyof CleanerPayConfig['target_times'], value: string) => {
		if (!config) {
			return;
		}
		const hours = parseFloat(value);
		if (!Number.isNaN(hours)) {
			setConfig({
				...config,
				target_times: { ...config.target_times, [key]: hours },
			});
		}
	};

	return {
		config,
		loading,
		saving,
		updateHourlyRate,
		updateBathroomTime,
		updateTargetTime,
		handleSave,
	};
}
