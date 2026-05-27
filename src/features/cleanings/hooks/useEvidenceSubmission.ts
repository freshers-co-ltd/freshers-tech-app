'use client';

import { useState } from 'react';
import { toast } from '@/components/Toast';
import { DICT } from '@/dictionary';
import type { EvidenceFormValues } from '@/features/cleanings/components/CleaningEvidenceForm';
import type {
	CleaningRequest,
	CleaningUpdate,
	EvidenceInsert,
	ReportInsert,
} from '@/features/cleanings/types';
import { mediaService } from '@/lib/mediaService';

interface UseEvidenceSubmissionConfig {
	cleaning: CleaningRequest;
	addEvidence: (payload: EvidenceInsert) => Promise<{ success: boolean }>;
	upsertReport: (payload: ReportInsert) => Promise<{ success: boolean }>;
	updateCleaning: (id: string, payload: CleaningUpdate) => Promise<{ success: boolean }>;
	handleSyncTasks: () => Promise<void>;
}

export function useEvidenceSubmission({
	cleaning,
	addEvidence,
	upsertReport,
	updateCleaning,
	handleSyncTasks,
}: UseEvidenceSubmissionConfig) {
	const [showEvidenceForm, setShowEvidenceForm] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);

	const onFormSubmit = async (values: EvidenceFormValues, files: File[]) => {
		if (!cleaning.cleaner_id) {
			return;
		}
		setIsProcessing(true);
		try {
			await handleSyncTasks();

			for (const file of files) {
				const { path, error: uploadError } = await mediaService.uploadMedia(
					cleaning.id,
					file,
					'cleaning-media',
				);
				if (uploadError) {
					throw new Error(uploadError);
				}
				if (path) {
					await addEvidence({
						cleaning_id: cleaning.id,
						uploader_id: cleaning.cleaner_id,
						media_url: path,
						type: file.type.startsWith('video') ? 'video' : 'image',
					});
				}
			}

			await upsertReport({
				cleaning_id: cleaning.id,
				cleaner_id: cleaning.cleaner_id,
				broken_items_report: values.broken_items_report ?? null,
				low_supplies_report: values.low_supplies_report ?? null,
			});

			await updateCleaning(cleaning.id, { clock_out_time: new Date().toISOString() });
			toast.success(DICT.CLEANINGS.DETAIL.COMPLETION.SUCCESS);
			setShowEvidenceForm(false);
		} catch {
			toast.error(DICT.CLEANINGS.DETAIL.COMPLETION.FAILED);
		} finally {
			setIsProcessing(false);
		}
	};

	return {
		showEvidenceForm,
		setShowEvidenceForm,
		isFullScreen,
		setIsFullScreen,
		selectedMediaIndex,
		setSelectedMediaIndex,
		isProcessing,
		isFinishDisabled: isProcessing,
		onFormSubmit,
	};
}
