'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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

interface HostPricingConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function HostPricingConfigDialog({ open, onOpenChange }: HostPricingConfigDialogProps) {
	const [config, setConfig] = useState<CleanerPayConfig | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const fetchConfig = useCallback(async () => {
		setLoading(true);
		const result = await cleaningService.getCleanerPayConfig();
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
		const result = await cleaningService.updateCleanerPayConfig(config);
		setSaving(false);

		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Property multipliers updated successfully');
			onOpenChange(false);
		}
	};

	const updateMultiplier = (key: keyof CleanerPayConfig['host_multipliers'], value: string) => {
		if (!config) {
			return;
		}
		const multiplier = parseFloat(value);
		if (!Number.isNaN(multiplier)) {
			setConfig({
				...config,
				host_multipliers: { ...config.host_multipliers, [key]: multiplier },
			});
		}
	};

	if (!config) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Property Price Multipliers</DialogTitle>
					</DialogHeader>
					{loading && (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					)}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-screen-md sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Property Price Multipliers</DialogTitle>
					<DialogDescription>
						Configure multipliers for each property type. The base price is set per host in their
						profile.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-3">
						<Label>Price Multiplier by Property Type</Label>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">Studio</Label>
								<Input
									type="number"
									step="0.1"
									value={config.host_multipliers.studio}
									onChange={(e) => updateMultiplier('studio', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">1 Bedroom</Label>
								<Input
									type="number"
									step="0.1"
									value={config.host_multipliers['1_bed']}
									onChange={(e) => updateMultiplier('1_bed', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">2 Bedrooms</Label>
								<Input
									type="number"
									step="0.1"
									value={config.host_multipliers['2_bed']}
									onChange={(e) => updateMultiplier('2_bed', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">3 Bedrooms</Label>
								<Input
									type="number"
									step="0.1"
									value={config.host_multipliers['3_bed']}
									onChange={(e) => updateMultiplier('3_bed', e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm text-muted-foreground">4+ Bedrooms</Label>
								<Input
									type="number"
									step="0.1"
									value={config.host_multipliers['4_bed']}
									onChange={(e) => updateMultiplier('4_bed', e.target.value)}
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
