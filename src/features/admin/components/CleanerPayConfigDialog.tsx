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
import { type CleanerPayConfig, cleaningService } from '@/features/cleanings/cleaningService';

interface CleanerPayConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const isValidDecimal = (value: string) => /^\d*\.?\d{0,2}$/.test(value);

const buildRawInputs = (data: CleanerPayConfig) => ({
	hourlyRate: data.hourly_rate.toFixed(2),
	bathroomTime: data.bathroom_time.toFixed(2),
	studio: data.target_times.studio.toFixed(2),
	'1_bed': data.target_times['1_bed'].toFixed(2),
	'2_bed': data.target_times['2_bed'].toFixed(2),
	'3_bed': data.target_times['3_bed'].toFixed(2),
	'4_bed': data.target_times['4_bed'].toFixed(2),
});

export function CleanerPayConfigDialog({ open, onOpenChange }: CleanerPayConfigDialogProps) {
	const [config, setConfig] = useState<CleanerPayConfig | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

	const fetchConfig = useCallback(async () => {
		setLoading(true);
		const result = await cleaningService.getCleanerPayConfig();
		if (result.error) {
			toast.error(result.error);
		} else {
			setConfig(result.data ?? null);
			if (result.data) {
				setRawInputs(buildRawInputs(result.data));
			}
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
		const result = await cleaningService.updateCleanerPayConfig(config);
		setSaving(false);

		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Pay rates updated successfully');
			onOpenChange(false);
		}
	};

	const updateHourlyRate = (value: string) => {
		if (!config || !isValidDecimal(value)) {
			return;
		}
		const rate = parseFloat(value);
		if (!Number.isNaN(rate)) {
			setConfig({ ...config, hourly_rate: rate });
		}
		setRawInputs((prev) => ({ ...prev, hourlyRate: value }));
	};

	const commitHourlyRate = () => {
		if (!config) {
			return;
		}
		setRawInputs((prev) => ({
			...prev,
			hourlyRate: config.hourly_rate.toFixed(2),
		}));
	};

	const updateBathroomTime = (value: string) => {
		if (!config || !isValidDecimal(value)) {
			return;
		}
		const hours = parseFloat(value);
		if (!Number.isNaN(hours)) {
			setConfig({ ...config, bathroom_time: hours });
		}
		setRawInputs((prev) => ({ ...prev, bathroomTime: value }));
	};

	const commitBathroomTime = () => {
		if (!config) {
			return;
		}
		setRawInputs((prev) => ({
			...prev,
			bathroomTime: config.bathroom_time.toFixed(2),
		}));
	};

	const updateTargetTime = (key: keyof CleanerPayConfig['target_times'], value: string) => {
		if (!config || !isValidDecimal(value)) {
			return;
		}
		const hours = parseFloat(value);
		if (!Number.isNaN(hours)) {
			setConfig({
				...config,
				target_times: { ...config.target_times, [key]: hours },
			});
		}
		setRawInputs((prev) => ({ ...prev, [key]: value }));
	};

	const commitTargetTime = (key: keyof CleanerPayConfig['target_times']) => {
		if (!config) {
			return;
		}
		setRawInputs((prev) => ({
			...prev,
			[key]: config.target_times[key].toFixed(2),
		}));
	};

	if (!config) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pay Rates</DialogTitle>
					</DialogHeader>
					{loading && <Loading />}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-screen-md sm:max-w-lg">
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
								value={rawInputs.hourlyRate ?? config.hourly_rate.toFixed(2)}
								onChange={(e) => updateHourlyRate(e.target.value)}
								onBlur={commitHourlyRate}
								className="flex-1"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="bathroomTime">Time per additional bathroom (hours)</Label>
						<div className="flex items-center gap-2">
							<Input
								id="bathroomTime"
								type="number"
								step="0.01"
								min="0"
								value={rawInputs.bathroomTime ?? config.bathroom_time.toFixed(2)}
								onChange={(e) => updateBathroomTime(e.target.value)}
								onBlur={commitBathroomTime}
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
									step="0.01"
									value={rawInputs.studio ?? config.target_times.studio.toFixed(2)}
									onChange={(e) => updateTargetTime('studio', e.target.value)}
									onBlur={() => commitTargetTime('studio')}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">1 Bedroom</Label>
								<Input
									type="number"
									step="0.01"
									value={rawInputs['1_bed'] ?? config.target_times['1_bed'].toFixed(2)}
									onChange={(e) => updateTargetTime('1_bed', e.target.value)}
									onBlur={() => commitTargetTime('1_bed')}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">2 Bedrooms</Label>
								<Input
									type="number"
									step="0.01"
									value={rawInputs['2_bed'] ?? config.target_times['2_bed'].toFixed(2)}
									onChange={(e) => updateTargetTime('2_bed', e.target.value)}
									onBlur={() => commitTargetTime('2_bed')}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">3 Bedrooms</Label>
								<Input
									type="number"
									step="0.01"
									value={rawInputs['3_bed'] ?? config.target_times['3_bed'].toFixed(2)}
									onChange={(e) => updateTargetTime('3_bed', e.target.value)}
									onBlur={() => commitTargetTime('3_bed')}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">4+ Bedrooms</Label>
								<Input
									type="number"
									step="0.01"
									value={rawInputs['4_bed'] ?? config.target_times['4_bed'].toFixed(2)}
									onChange={(e) => updateTargetTime('4_bed', e.target.value)}
									onBlur={() => commitTargetTime('4_bed')}
								/>
							</div>
						</div>
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
