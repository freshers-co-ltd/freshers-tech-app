'use client';

import { useState } from 'react';
import { toast } from '@/components/Toast';
import { userService } from '@/features/admin/services/userService';

interface UsePropertyPriceDialogOptions {
	propertyId: string;
	onSuccess?: () => void;
}

interface UsePropertyPriceDialogResult {
	saving: boolean;
	handleSave: (price: string) => Promise<void>;
}

export function usePropertyPriceDialog({
	propertyId,
	onSuccess,
}: UsePropertyPriceDialogOptions): UsePropertyPriceDialogResult {
	const [saving, setSaving] = useState(false);

	const handleSave = async (price: string) => {
		const priceValue = parseFloat(price);
		if (Number.isNaN(priceValue) || priceValue <= 0) {
			toast.error('Please enter a valid price greater than 0');
			return;
		}

		setSaving(true);
		const result = await userService.updatePropertyPrice(propertyId, priceValue);
		setSaving(false);

		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Property price updated successfully');
			onSuccess?.();
		}
	};

	return {
		saving,
		handleSave,
	};
}
