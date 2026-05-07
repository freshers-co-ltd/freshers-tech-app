'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
	FileInput,
	FileUploader,
	FileUploaderContent,
	FileUploaderItem,
} from '@/components/ui/file-upload';
import { Textarea } from '@/components/ui/textarea';
import { DICT } from '@/dictionary';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const evidenceSchema = z.object({
	broken_items_report: z.string().optional(),
	low_supplies_report: z.string().optional(),
	has_evidence: z.boolean().refine((val) => val === true, {
		message: 'At least one photo or video of evidence is required',
	}),
});

export type EvidenceFormValues = z.infer<typeof evidenceSchema>;

interface CleaningEvidenceFormProps {
	cleaningId: string;
	cleanerId: string;
	onSubmit: (values: EvidenceFormValues, files: File[]) => Promise<void>;
	onCancel?: () => void;
}

const FileSvgDraw = ({ accept }: { accept?: Record<string, string[]> }) => {
	const allowedExtensions = accept
		? Object.values(accept)
				.flat()
				.map((ext) => ext.replace('.', '').toUpperCase())
				.join(', ')
		: 'Files';

	return (
		<>
			<svg
				className="size-8 mb-3 text-primary"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 20 16">
				<path
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
				/>
			</svg>
			<p className="mb-1 text-sm text-primary">
				<span className="font-semibold">{DICT.COMMON.IMAGES.UPLOAD_PROMPT}</span>{' '}
				{DICT.COMMON.IMAGES.UPLOAD_DRAG_DROP}
			</p>
			<p className="text-xs text-primary">{allowedExtensions}</p>
		</>
	);
};

export function CleaningEvidenceForm({ onSubmit, onCancel }: CleaningEvidenceFormProps) {
	const [files, setFiles] = useState<File[] | null>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<EvidenceFormValues>({
		resolver: zodResolver(evidenceSchema),
		defaultValues: {
			broken_items_report: '',
			low_supplies_report: '',
			has_evidence: false,
		},
	});

	const handleFormSubmit = async (values: EvidenceFormValues) => {
		setIsSubmitting(true);
		try {
			await onSubmit(values, files || []);
		} finally {
			setIsSubmitting(false);
		}
	};

	const onFilesChange = (newFiles: File[] | null) => {
		setFiles(newFiles);
		form.setValue('has_evidence', !!(newFiles && newFiles.length > 0), {
			shouldValidate: form.formState.isSubmitted,
		});
	};

	return (
		<form
			onSubmit={(e) => {
				e.stopPropagation();
				form.handleSubmit(handleFormSubmit)(e);
			}}
			className="space-y-4">
			<FieldGroup>
				<Field>
					<FieldLabel>Any broken or damaged items?</FieldLabel>
					<Textarea
						{...form.register('broken_items_report')}
						placeholder="Describe any issues found..."
					/>
				</Field>

				<Field>
					<FieldLabel>Any supplies running low?</FieldLabel>
					<Textarea
						{...form.register('low_supplies_report')}
						placeholder="List items like toilet paper, soap, etc..."
					/>
				</Field>

				<Field>
					<FieldLabel>Cleaning Evidence</FieldLabel>
					<FileUploader
						value={files}
						onValueChange={onFilesChange}
						dropzoneOptions={{
							maxFiles: 10,
							maxSize: MAX_FILE_SIZE,
							accept: {
								'image/*': ['.jpg', '.jpeg', '.png'],
								'video/*': ['.mp4', '.mov'],
							},
						}}
						className="file-dropzone">
						<FileInput className="flex-col-center w-full pt-3 pb-4">
							<FileSvgDraw
								accept={{
									'image/*': ['.jpg', '.jpeg', '.png'],
									'video/*': ['.mp4', '.mov'],
								}}
							/>
						</FileInput>
						<FileUploaderContent className="flex flex-row flex-wrap items-center gap-2 mt-2">
							{files?.map((file, i) => (
								<FileUploaderItem
									key={`${file.name}-${file.lastModified}-${i}`}
									index={i}
									className="p-0 overflow-hidden border rounded-md size-20">
									{file.type.startsWith('image/') ? (
										<img
											src={URL.createObjectURL(file)}
											alt="preview"
											className="object-cover size-20"
										/>
									) : (
										<div className="flex-center size-20 bg-muted text-[10px] text-center p-1">
											Video Evidence
										</div>
									)}
								</FileUploaderItem>
							))}
						</FileUploaderContent>
					</FileUploader>
					{form.formState.errors.has_evidence && (
						<FieldError>{form.formState.errors.has_evidence.message}</FieldError>
					)}
				</Field>
			</FieldGroup>

			<div className="pt-2 border-t border-border flex gap-3">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						onClick={onCancel}
						disabled={isSubmitting || form.formState.isSubmitting}>
						Back
					</Button>
				)}
				<Button
					type="submit"
					className="flex-1"
					disabled={isSubmitting || form.formState.isSubmitting}>
					{isSubmitting ? 'Uploading Evidence...' : 'Complete Cleaning'}
				</Button>
			</div>
		</form>
	);
}
