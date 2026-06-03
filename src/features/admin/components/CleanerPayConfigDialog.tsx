'use client';

import { Banknote, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { CleanerPayConfig } from '@/features/cleanings/types';

interface CleanerPayConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CleanerPayConfigDialog({ open, onOpenChange }: CleanerPayConfigDialogProps) {
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

	if (!config) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pay Rates</DialogTitle>
					</DialogHeader>
					{loading && <Loading absolute={false} />}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Cleaner Pay Rates</DialogTitle>
					<DialogDescription>
						Configure the hourly rate and target times for cleaner payments
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-2">
						<Label htmlFor="hourlyRate">Hourly Rate (£)</Label>
						<div className="flex items-center gap-2">
							<Banknote className="size-4 text-muted-foreground" />
							<Input
								id="hourlyRate"
								type="number"
								step="0.01"
								value={config.hourly_rate}
								onChange={(e) => updateHourlyRate(e.target.value)}
								className="flex-1"
							/>
						</div>
					</div>

					<div className="space-y-3">
						<Label>Target Hours by Property Type</Label>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">Studio</Label>
								<Input
									type="number"
									step="0.5"
									value={config.target_times.studio}
									onChange={(e) => updateTargetTime('studio', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">1 Bedroom</Label>
								<Input
									type="number"
									step="0.5"
									value={config.target_times['1_bed']}
									onChange={(e) => updateTargetTime('1_bed', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">2 Bedrooms</Label>
								<Input
									type="number"
									step="0.5"
									value={config.target_times['2_bed']}
									onChange={(e) => updateTargetTime('2_bed', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">3 Bedrooms</Label>
								<Input
									type="number"
									step="0.5"
									value={config.target_times['3_bed']}
									onChange={(e) => updateTargetTime('3_bed', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">4+ Bedrooms</Label>
								<Input
									type="number"
									step="0.5"
									value={config.target_times['4_bed']}
									onChange={(e) => updateTargetTime('4_bed', e.target.value)}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="bathroomTime">Time per additional bathroom (hours)</Label>
					<div className="flex items-center gap-2">
						<Input
							id="bathroomTime"
							type="number"
							step="0.5"
							min="0"
							value={config.bathroom_time}
							onChange={(e) => updateBathroomTime(e.target.value)}
							className="flex-1"
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
