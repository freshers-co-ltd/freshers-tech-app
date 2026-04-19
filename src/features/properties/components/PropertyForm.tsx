'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { FileSvgDraw } from '@/components/ui/file-upload-components';
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

const POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const propertySchema = z.object({
	address_line_1: z.string().min(1, DICT.FORMS.VALIDATION.ADDRESS_REQUIRED),
	address_line_2: z.string().optional(),
	town_city: z.string().min(1, DICT.FORMS.VALIDATION.TOWN_REQUIRED),
	postcode: z
		.string()
		.regex(POSTCODE_REGEX, DICT.FORMS.VALIDATION.POSTCODE_INVALID)
		.transform((val) => {
			const cleaned = val.replace(/\s+/g, '').toUpperCase();
			const incode = cleaned.slice(-3);
			const outcode = cleaned.slice(0, -3);
			return `${outcode} ${incode}`;
		}),
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

export function PropertyForm({ initialData, onSubmit, onCancel }: PropertyFormProps) {
	const { user } = useAuth();
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

	const remainingSlots = useMemo(
		() => Math.max(0, 10 - extraImagesPaths.length),
		[extraImagesPaths.length],
	);

	const removeExistingImage = (pathToRemove: string) => {
		setExtraImagesPaths((prev) => prev.filter((path) => path !== pathToRemove));
	};

	const handleFormSubmit = async (values: PropertyFormValues) => {
		if (!user) {
			return;
		}

		setIsUploading(true);
		try {
			let mainImagePath = initialData?.main_image_url || '';
			const { has_main_image, ...databaseValues } = values;

			if (mainImage?.[0]) {
				const { path: uploadedPath, error } = await mediaService.uploadMedia(
					user.id,
					mainImage[0],
					'property-media',
				);
				if (error) {
					throw new Error(error);
				}
				if (uploadedPath) {
					mainImagePath = uploadedPath;
				}
			}

			let finalExtraImagesPaths = [...extraImagesPaths];

			if (extraImages && extraImages.length > 0) {
				const totalImages = extraImagesPaths.length + extraImages.length;
				if (totalImages > 10) {
					form.setError('root', { message: DICT.FORMS.VALIDATION.IMAGE_LIMIT });
					setIsUploading(false);
					return;
				}

				const uploadPromises = extraImages.map((file) =>
					mediaService.uploadMedia(user.id, file, 'property-media'),
				);
				const results = await Promise.allSettled(uploadPromises);

				const newPaths = results
					.map((res) => (res.status === 'fulfilled' && res.value.path ? res.value.path : null))
					.filter((path): path is string => !!path);

				finalExtraImagesPaths = [...finalExtraImagesPaths, ...newPaths];
				setExtraImagesPaths(finalExtraImagesPaths);
				setExtraImages([]);
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
					<input
						type="hidden"
						{...form.register('has_main_image', {
							setValueAs: () => true,
						})}
					/>
					<MainImageUpload
						value={mainImage}
						onChange={setMainImage}
						initialImage={initialData?.main_image_url}
					/>
				</Field>

				<Field>
					<FieldLabel>
						{DICT.FORMS.LABELS.ADDITIONAL_IMAGES} (
						{extraImagesPaths.length + (extraImages?.length || 0)}/10)
					</FieldLabel>
					<ExtraImagesUpload
						value={extraImages}
						onChange={(files) => setExtraImages(files?.slice(0, remainingSlots) || [])}
						existingImages={extraImagesPaths}
						onRemoveImage={removeExistingImage}
						showLimitReached={remainingSlots <= 0}
					/>
				</Field>
			</FieldGroup>

			<div className="flex justify-end gap-3 pt-4 overflow-visible border-t border-border">
				<Button variant="outline" onClick={onCancel}>
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

interface MainImageUploadProps {
	value: File[] | null;
	onChange: (files: File[] | null) => void;
	initialImage?: string;
}

function MainImageUpload({ value, onChange, initialImage }: MainImageUploadProps) {
	return (
		<FileUploader
			value={value}
			onValueChange={onChange}
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
				{value?.map((file, i) => (
					<FileUploaderItem
						key={`${file.name}-${file.lastModified}-${i}`}
						index={i}
						className="p-0 overflow-hidden border rounded-md size-20">
						<img src={URL.createObjectURL(file)} alt="Preview" className="object-cover size-20" />
					</FileUploaderItem>
				))}
				{!value?.length && initialImage && (
					<div className="relative p-0 overflow-hidden border rounded-md size-20">
						<img
							src={mediaService.getMediaUrl(initialImage, 'property-media')}
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
	);
}

interface ExtraImagesUploadProps {
	value: File[] | null;
	onChange: (files: File[] | null) => void;
	existingImages?: string[];
	onRemoveImage?: (path: string) => void;
	showLimitReached?: boolean;
}

function ExtraImagesUpload({
	value,
	onChange,
	existingImages,
	onRemoveImage,
	showLimitReached,
}: ExtraImagesUploadProps) {
	return (
		<FileUploader
			value={value}
			onValueChange={onChange}
			dropzoneOptions={{
				maxFiles: 10,
				maxSize: MAX_FILE_SIZE,
				accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
			}}
			className="file-dropzone">
			<FileInput className="flex-col-center w-full pt-3 pb-4">
				<FileSvgDraw accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }} />
				{showLimitReached && (
					<p className="mt-2 text-xs font-medium text-center text-destructive">
						{DICT.FORMS.LABELS.LIMIT_REACHED}
					</p>
				)}
			</FileInput>
			<FileUploaderContent className="flex flex-row items-center gap-2 mt-2">
				{existingImages?.map((path) => (
					<div
						key={path}
						className="relative p-0 overflow-hidden border rounded-md size-20 group">
						<img
							src={mediaService.getMediaUrl(path, 'property-media')}
							alt="Extra"
							className="object-cover size-20"
						/>
						{onRemoveImage && (
							<button
								type="button"
								onClick={() => onRemoveImage(path)}
								className="absolute p-1 text-white transition-opacity rounded-sm opacity-0 group-hover:opacity-100 top-1 right-1 bg-destructive">
								<Trash2 className="size-3" />
							</button>
						)}
					</div>
				))}
				{value?.map((file, i) => (
					<FileUploaderItem
						key={`${file.name}-${file.lastModified}-${i}`}
						index={i}
						className="p-0 overflow-hidden border rounded-md size-20">
						<img src={URL.createObjectURL(file)} alt="Preview" className="object-cover size-20" />
					</FileUploaderItem>
				))}
			</FileUploaderContent>
		</FileUploader>
	);
}
