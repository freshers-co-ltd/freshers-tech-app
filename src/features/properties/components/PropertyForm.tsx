'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
	FileInput,
	FileUploader,
	FileUploaderContent,
	FileUploaderItem,
} from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import type { Property, PropertyInsert } from '@/features/properties/propertyService';
import { mediaService } from '@/lib/mediaService';
import { cn } from '@/lib/utils';

const POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const propertySchema = z.object({
	address_line_1: z.string().min(1, DICT.FORMS.VALIDATION.ADDRESS_REQUIRED),
	address_line_2: z.string().optional(),
	town_city: z.string().min(1, DICT.FORMS.VALIDATION.TOWN_REQUIRED),
	postcode: z.string().regex(POSTCODE_REGEX, DICT.FORMS.VALIDATION.POSTCODE_INVALID),
	type: z.enum(['house', 'apartment', 'other']),
	bedrooms: z.coerce.number().min(0, DICT.FORMS.VALIDATION.NUMBER_INVALID),
	bathrooms: z.coerce.number().min(0, DICT.FORMS.VALIDATION.NUMBER_INVALID),
	main_image_url: z.string().optional(),
	has_main_image: z.boolean().refine((val) => val === true, {
		message: DICT.FORMS.VALIDATION.IMAGE_REQUIRED,
	}),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;

type PropertyFormInput = {
	address_line_1: string;
	address_line_2?: string;
	town_city: string;
	postcode: string;
	type: 'house' | 'apartment' | 'other';
	bedrooms: unknown;
	bathrooms: unknown;
	has_main_image: boolean;
};

interface PropertyFormProps {
	initialData?: Property;
	onSubmit: (data: PropertyInsert) => Promise<void>;
	onCancel: () => void;
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
				<span className="font-semibold">{DICT.FORMS.LABELS.UPLOAD_PROMPT}</span>{' '}
				{DICT.FORMS.LABELS.UPLOAD_DRAG_DROP}
			</p>
			<p className="text-xs text-primary">{allowedExtensions}</p>
		</>
	);
};

export function PropertyForm({ initialData, onSubmit, onCancel }: PropertyFormProps) {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [mainImage, setMainImage] = useState<File[] | null>(null);
	const [extraImages, setExtraImages] = useState<File[] | null>([]);
	const [isUploading, setIsUploading] = useState(false);

	const [extraImagesPaths, setExtraImagesPaths] = useState<string[]>(
		initialData?.extra_images_urls || [],
	);

	const form = useForm<PropertyFormInput, undefined, PropertyFormValues>({
		resolver: zodResolver(propertySchema),
		defaultValues: {
			address_line_1: initialData?.address_line_1 ?? '',
			address_line_2: initialData?.address_line_2 ?? '',
			town_city: initialData?.town_city ?? '',
			postcode: initialData?.postcode ?? '',
			type: (initialData?.type as 'house' | 'apartment' | 'other') ?? 'apartment',
			bedrooms: initialData?.bedrooms ?? 1,
			bathrooms: initialData?.bathrooms ?? 1,
			has_main_image: !!initialData?.main_image_url,
		},
	});

	useEffect(() => {
		if (initialData) {
			form.reset({
				address_line_1: initialData.address_line_1,
				address_line_2: initialData.address_line_2 ?? '',
				town_city: initialData.town_city,
				postcode: initialData.postcode,
				type: initialData.type as 'house' | 'apartment' | 'other',
				bedrooms: initialData.bedrooms,
				bathrooms: initialData.bathrooms,
				has_main_image: !!initialData.main_image_url,
			});
			setExtraImagesPaths(initialData.extra_images_urls || []);
		}
	}, [initialData, form]);

	useEffect(() => {
		const hasImage = (mainImage && mainImage.length > 0) || !!initialData?.main_image_url;
		form.setValue('has_main_image', hasImage, { shouldValidate: form.formState.isSubmitted });
	}, [mainImage, initialData, form]);

	const removeExistingImage = (pathToRemove: string) => {
		setExtraImagesPaths((prev) => {
			return prev.filter((path) => {
				return path !== pathToRemove;
			});
		});
	};

	const remainingSlots = Math.max(0, 10 - extraImagesPaths.length);

	const handleFormSubmit = async (values: PropertyFormValues) => {
		if (!user) {
			return;
		}

		setIsUploading(true);
		try {
			let mainImagePath = initialData?.main_image_url || '';
			const finalExtraImagesPaths = [...extraImagesPaths];
			const { has_main_image, ...databaseValues } = values;

			if (mainImage?.[0]) {
				const { path: uploadedPath, error } = await mediaService.uploadMedia(
					user.id,
					mainImage[0] || null,
					'property-media',
				);
				if (error) {
					throw new Error(error);
				}
				if (uploadedPath) {
					mainImagePath = uploadedPath;
				}
			}

			if (extraImages && extraImages.length > 0) {
				const totalImages = extraImagesPaths.length + extraImages.length;
				if (totalImages > 10) {
					form.setError('root', { message: DICT.FORMS.VALIDATION.IMAGE_LIMIT });
					setIsUploading(false);
					return;
				}

				for (const file of extraImages) {
					const { path: uploadedPath, error } = await mediaService.uploadMedia(
						user.id,
						file || null,
						'property-media',
					);
					if (!error && uploadedPath) {
						finalExtraImagesPaths.push(uploadedPath);
					}
				}
			}

			const payload: PropertyInsert = {
				...databaseValues,
				host_id: user.id,
				main_image_url: mainImagePath,
				extra_images_urls: finalExtraImagesPaths,
			};

			if (initialData?.id) {
				payload.id = initialData.id;
			}

			await onSubmit(payload);
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error('Submission error:', err);
			}
			navigate('/error/500');
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<form
			onSubmit={(e) => {
				e.stopPropagation();
				form.handleSubmit(handleFormSubmit)(e);
			}}
			className="space-y-6">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="address_line_1">{DICT.FORMS.LABELS.ADDRESS_LINE_1}</FieldLabel>
					<Input
						{...form.register('address_line_1')}
						id="address_line_1"
						placeholder={DICT.FORMS.PLACEHOLDERS.ADDRESS_LINE_1}
					/>
					{form.formState.errors.address_line_1 && (
						<FieldError>{form.formState.errors.address_line_1.message}</FieldError>
					)}
				</Field>

				<Field>
					<FieldLabel htmlFor="address_line_2">{DICT.FORMS.LABELS.ADDRESS_LINE_2}</FieldLabel>
					<Input
						{...form.register('address_line_2')}
						id="address_line_2"
						placeholder={DICT.FORMS.PLACEHOLDERS.ADDRESS_LINE_2}
					/>
				</Field>

				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="town_city">{DICT.FORMS.LABELS.TOWN_CITY}</FieldLabel>
						<Input
							{...form.register('town_city')}
							id="town_city"
							placeholder={DICT.FORMS.PLACEHOLDERS.TOWN_CITY}
						/>
						{form.formState.errors.town_city && (
							<FieldError>{form.formState.errors.town_city.message}</FieldError>
						)}
					</Field>
					<Field>
						<FieldLabel htmlFor="postcode">{DICT.FORMS.LABELS.POSTCODE}</FieldLabel>
						<Input
							{...form.register('postcode')}
							id="postcode"
							placeholder={DICT.FORMS.PLACEHOLDERS.POSTCODE}
							className="uppercase"
						/>
						{form.formState.errors.postcode && (
							<FieldError>{form.formState.errors.postcode.message}</FieldError>
						)}
					</Field>
				</div>

				<Field>
					<FieldLabel>{DICT.FORMS.LABELS.PROPERTY_TYPE}</FieldLabel>
					<Select
						onValueChange={(value) => form.setValue('type', value as PropertyFormValues['type'])}
						defaultValue={form.getValues('type')}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="apartment">{DICT.PROPERTIES.TYPES.APARTMENT}</SelectItem>
							<SelectItem value="house">{DICT.PROPERTIES.TYPES.HOUSE}</SelectItem>
							<SelectItem value="other">{DICT.PROPERTIES.TYPES.OTHER}</SelectItem>
						</SelectContent>
					</Select>
				</Field>

				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="bedrooms">{DICT.FORMS.LABELS.BEDROOMS}</FieldLabel>
						<Input
							{...form.register('bedrooms')}
							id="bedrooms"
							type="number"
							min="0"
							onKeyDown={(e) => (['-', 'e'].includes(e.key) ? e.preventDefault() : null)}
						/>
						{form.formState.errors.bedrooms && (
							<FieldError>{form.formState.errors.bedrooms.message}</FieldError>
						)}
					</Field>
					<Field>
						<FieldLabel htmlFor="bathrooms">{DICT.FORMS.LABELS.BATHROOMS}</FieldLabel>
						<Input
							{...form.register('bathrooms')}
							id="bathrooms"
							type="number"
							min="0"
							onKeyDown={(e) => (['-', 'e'].includes(e.key) ? e.preventDefault() : null)}
						/>
					</Field>
				</div>

				<Field>
					<FieldLabel>{DICT.FORMS.LABELS.MAIN_IMAGE}</FieldLabel>
					<FileUploader
						value={mainImage}
						onValueChange={setMainImage}
						dropzoneOptions={{
							maxFiles: 1,
							maxSize: MAX_FILE_SIZE,
							accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
						}}
						className="file-dropzone">
						<FileInput className="flex-col-center w-full pt-3 pb-4">
							<FileSvgDraw accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }} />
						</FileInput>
						<FileUploaderContent className="flex flex-row items-center gap-2 mt-2">
							{mainImage?.map((file, i) => (
								<FileUploaderItem
									key={`${file.name}-${file.lastModified}-${i}`}
									index={i}
									className="p-0 overflow-hidden border rounded-md size-20">
									<img
										src={URL.createObjectURL(file)}
										alt="Preview"
										className="object-cover size-20"
									/>
								</FileUploaderItem>
							))}
							{!mainImage?.length && initialData?.main_image_url && (
								<div className="relative p-0 overflow-hidden border rounded-md size-20">
									<img
										src={mediaService.getMediaUrl(
											initialData.main_image_url || null,
											'property-media',
										)}
										alt="Current"
										className="object-cover size-20"
									/>
									<div className="absolute top-0 right-0 p-1 bg-primary text-[8px] text-white">
										{DICT.FORMS.LABELS.CURRENT_IMAGE}
									</div>
								</div>
							)}
						</FileUploaderContent>
					</FileUploader>
					{form.formState.errors.has_main_image && (
						<FieldError>{form.formState.errors.has_main_image.message}</FieldError>
					)}
				</Field>

				<Field>
					<FieldLabel>
						{DICT.FORMS.LABELS.ADDITIONAL_IMAGES} (
						{extraImagesPaths.length + (extraImages?.length || 0)}/10)
					</FieldLabel>
					<FileUploader
						value={extraImages}
						onValueChange={(files) => setExtraImages(files?.slice(0, remainingSlots) || [])}
						dropzoneOptions={{
							maxFiles: remainingSlots,
							maxSize: MAX_FILE_SIZE,
							accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
						}}
						className={cn('file-dropzone', remainingSlots <= 0 && 'cursor-not-allowed')}>
						<FileInput className="flex-col-center w-full pt-3 pb-4 **:opacity-100!">
							<FileSvgDraw accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }} />
							{remainingSlots <= 0 && (
								<p className="mt-2 text-xs font-medium text-center text-destructive">
									{DICT.FORMS.LABELS.LIMIT_REACHED}
								</p>
							)}
						</FileInput>
						<FileUploaderContent className="flex flex-row flex-wrap items-center gap-2 mt-2">
							{extraImagesPaths.map((path) => (
								<div
									key={path}
									className="relative p-0 overflow-hidden border rounded-md group size-20">
									<img
										src={mediaService.getMediaUrl(path || null, 'property-media')}
										alt="Extra"
										className="object-cover size-20 opacity-80"
									/>
									<button
										type="button"
										onClick={() => removeExistingImage(path)}
										className="absolute p-1 text-white transition-opacity rounded-sm sm:opacity-0 top-1 right-1 bg-destructive group-hover:opacity-100">
										<Trash2 className="size-3" />
									</button>
								</div>
							))}
							{extraImages?.map((file, i) => (
								<FileUploaderItem
									key={`${file.name}-${file.lastModified}-${i}`}
									index={i}
									className="p-0 overflow-hidden border rounded-md size-20">
									<img
										src={URL.createObjectURL(file)}
										alt={file.name}
										className="object-cover size-20"
									/>
								</FileUploaderItem>
							))}
						</FileUploaderContent>
					</FileUploader>
				</Field>
			</FieldGroup>

			<div className="flex justify-end gap-3 pt-4 overflow-visible border-t border-border">
				<Button type="button" variant="outline" onClick={onCancel}>
					{DICT.PROPERTIES.ACTIONS.CANCEL}
				</Button>
				<Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
					{isUploading
						? DICT.PROPERTIES.ACTIONS.UPLOADING
						: initialData
							? DICT.PROPERTIES.ACTIONS.UPDATE
							: DICT.PROPERTIES.ACTIONS.ADD}
				</Button>
			</div>
		</form>
	);
}
