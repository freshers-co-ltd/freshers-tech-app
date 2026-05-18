'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { userService } from '@/features/admin/userService';

interface HostBasePriceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hostId: string;
	currentPrice: number | null;
	onSuccess?: () => void;
}

export function HostBasePriceDialog({
	open,
	onOpenChange,
	hostId,
	currentPrice,
	onSuccess,
}: HostBasePriceDialogProps) {
	const [saving, setSaving] = useState(false);
	const [price, setPrice] = useState(currentPrice?.toString() || '');

	const handleOpen = (isOpen: boolean) => {
		if (!isOpen) {
			setPrice(currentPrice?.toString() || '');
		}
		onOpenChange(isOpen);
	};

	const handleSave = async () => {
		const basePrice = parseFloat(price);
		if (Number.isNaN(basePrice) || basePrice <= 0) {
			toast.error('Please enter a valid price greater than 0');
			return;
		}

		setSaving(true);
		const result = await userService.updateHostBasePrice(hostId, basePrice);
		setSaving(false);

		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Base price updated successfully');
			onSuccess?.();
			handleOpen(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpen}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Edit Base Price</DialogTitle>
					<DialogDescription>
						Set the base price per cleaning for this host. The final price is calculated by
						multiplying this base price with the property type multiplier.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="base-price">Base Price (£)</Label>
						<Input
							id="base-price"
							type="number"
							step="0.01"
							min="0"
							placeholder="50.00"
							value={price}
							onChange={(e) => setPrice(e.target.value)}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button variant="outline" onClick={() => handleOpen(false)}>
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
