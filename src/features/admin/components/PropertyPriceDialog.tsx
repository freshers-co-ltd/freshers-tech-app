'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { usePropertyPriceDialog } from '@/features/admin/hooks/usePropertyPriceDialog';

interface PropertyPriceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	propertyId: string;
	propertyAddress: string;
	currentPrice: number | null;
	onSuccess?: () => void;
}

export function PropertyPriceDialog({
	open,
	onOpenChange,
	propertyId,
	propertyAddress,
	currentPrice,
	onSuccess,
}: PropertyPriceDialogProps) {
	const [price, setPrice] = useState(currentPrice?.toString() || '');
	const { saving, handleSave: savePrice } = usePropertyPriceDialog({
		propertyId,
		onSuccess: () => {
			onSuccess?.();
			handleOpen(false);
		},
	});

	const handleOpen = (isOpen: boolean) => {
		if (!isOpen) {
			setPrice(currentPrice?.toString() || '');
		}
		onOpenChange(isOpen);
	};

	const handleSave = async () => {
		await savePrice(price);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpen}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Set Property Price</DialogTitle>
					<DialogDescription>
						Set the cleaning price for {propertyAddress}. Every cleaning at this property will use
						this price.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="property-price">Price per cleaning (£)</Label>
						<Input
							id="property-price"
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
