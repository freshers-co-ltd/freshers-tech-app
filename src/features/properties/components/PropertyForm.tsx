'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
	type Property,
	type PropertyInsert,
	propertyTypeValues,
} from '@/features/properties/propertyService';
import {
	DEFAULT_FILE_SIZE_LIMIT,
	getBucketConfig,
	mediaService,
	mimeTypesToAccept,
} from '@/lib/mediaService';

const POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;

const propertySchema = z.object({
	address_line_1: z.string().min(1, DICT.COMMON.VALIDATION.ADDRESS_REQUIRED),
	address_line_2: z.string().optional(),
	town_city: z.string().min(1, DICT.COMMON.VALIDATION.TOWN_REQUIRED),
	postcode: z
		.string()
		.regex(POSTCODE_REGEX, DICT.COMMON.VALIDATION.POSTCODE_INVALID)
		.transform((val) => {
			const cleaned = val.replace(/\s+/g, '').toUpperCase();
			const incode = cleaned.slice(-3);
			const outcode = cleaned.slice(0, -3);
			return `${outcode} ${incode}`;
		}),
	type: z.enum(propertyTypeValues),
	bedrooms: z.coerce.number().min(0, DICT.COMMON.VALIDATION.NUMBER_INVALID),
	bathrooms: z.coerce.number().min(0, DICT.COMMON.VALIDATION.NUMBER_INVALID),
	main_image_url: z.string().optional(),
	has_main_image: z.boolean().refine((val) => val === true, {
		message: DICT.COMMON.VALIDATION.IMAGE_REQUIRED,
	}),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;

type PropertyFormInput = {
	address_line_1: string;
	address_line_2?: string;
	town_city: string;
	postcode: string;
	type: (typeof propertyTypeValues)[number];
	bedrooms: unknown;
	bathrooms: unknown;
	has_main_image: boolean;
};

interface PropertyFormProps {
	initialData?: Property;
	onSubmit: (data: PropertyInsert) => Promise<void>;
	onCancel: () => void;
	cancelLabel?: string;
}

export function PropertyForm({ initialData, onSubmit, onCancel, cancelLabel }: PropertyFormProps) {
	const { user } = useAuth();
	const [mainImage, setMainImage] = useState<File[] | null>(null);
	const [extraImages, setExtraImages] = useState<File[] | null>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [extraImagesPaths, setExtraImagesPaths] = useState<string[]>(
		initialData?.extra_images_urls || [],
	);

	const [bucketConfig, setBucketConfig] = useState({
		maxSize: DEFAULT_FILE_SIZE_LIMIT,
		accept: { 'image/*': ['.jpg', '.jpeg', '.png'] } as Record<string, string[]>,
	});

	const fetchBucketConfig = useCallback(async () => {
		const config = await getBucketConfig('property-media');
		setBucketConfig({
			maxSize: config.fileSizeLimit,
			accept:
				config.allowedMimeTypes.length > 0
					? mimeTypesToAccept(config.allowedMimeTypes)
					: { 'image/*': ['.jpg', '.jpeg', '.png'] },
		});
	}, []);

	useEffect(() => {
		fetchBucketConfig();
	}, [fetchBucketConfig]);

	const form = useForm<PropertyFormInput, undefined, PropertyFormValues>({
		resolver: zodResolver(propertySchema),
		defaultValues: {
			address_line_1: initialData?.address_line_1 ?? '',
			address_line_2: initialData?.address_line_2 ?? '',
			town_city: initialData?.town_city ?? '',
			postcode: initialData?.postcode ?? '',
			type: (initialData?.type as (typeof propertyTypeValues)[number]) ?? propertyTypeValues[0],
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

	useEffect(() => {
		const hasImage = !!(mainImage?.[0] || initialData?.main_image_url);
		form.setValue('has_main_image', hasImage);

		if (hasImage) {
			form.clearErrors('has_main_image');
		}
	}, [mainImage, initialData?.main_image_url, form]);

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
					form.setError('root', { message: DICT.COMMON.VALIDATION.IMAGE_LIMIT });
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
					<FieldLabel htmlFor="address_line_1">{DICT.COMMON.LABELS.ADDRESS_LINE_1}</FieldLabel>
					<Input
						{...form.register('address_line_1')}
						id="address_line_1"
						type="text"
						placeholder={DICT.COMMON.PLACEHOLDERS.ADDRESS_LINE_1}
					/>
					{form.formState.errors.address_line_1 && (
						<FieldError>{form.formState.errors.address_line_1.message}</FieldError>
					)}
				</Field>

				<Field>
					<FieldLabel htmlFor="address_line_2">{DICT.COMMON.LABELS.ADDRESS_LINE_2}</FieldLabel>
					<Input
						{...form.register('address_line_2')}
						id="address_line_2"
						placeholder={DICT.COMMON.PLACEHOLDERS.ADDRESS_LINE_2}
					/>
				</Field>

				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="town_city">{DICT.COMMON.LABELS.TOWN_CITY}</FieldLabel>
						<Input
							{...form.register('town_city')}
							id="town_city"
							placeholder={DICT.COMMON.PLACEHOLDERS.TOWN_CITY}
						/>
						{form.formState.errors.town_city && (
							<FieldError>{form.formState.errors.town_city.message}</FieldError>
						)}
					</Field>
					<Field>
						<FieldLabel htmlFor="postcode">{DICT.COMMON.LABELS.POSTCODE}</FieldLabel>
						<Input
							{...form.register('postcode')}
							id="postcode"
							placeholder={DICT.COMMON.PLACEHOLDERS.POSTCODE}
							className="uppercase"
						/>
						{form.formState.errors.postcode && (
							<FieldError>{form.formState.errors.postcode.message}</FieldError>
						)}
					</Field>
				</div>

				<Field>
					<FieldLabel>{DICT.COMMON.LABELS.PROPERTY_TYPE}</FieldLabel>
					<Select
						onValueChange={(value) => form.setValue('type', value as PropertyFormValues['type'])}
						defaultValue={form.getValues('type')}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{propertyTypeValues.map((type) => (
								<SelectItem key={type} value={type}>
									{DICT.PROPERTIES.TYPES[type.toUpperCase() as 'APARTMENT' | 'HOUSE' | 'STUDIO']}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="bedrooms">{DICT.COMMON.LABELS.BEDROOMS}</FieldLabel>
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
						<FieldLabel htmlFor="bathrooms">{DICT.COMMON.LABELS.BATHROOMS}</FieldLabel>
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
					<FieldLabel>{DICT.COMMON.IMAGES.MAIN}</FieldLabel>
					<FileUploader
						value={mainImage}
						onValueChange={setMainImage}
						existingImages={initialData?.main_image_url ? [initialData.main_image_url] : []}
						onRemoveExisting={() => setMainImage(null)}
						dropzoneOptions={{
							maxFiles: 1,
							maxSize: bucketConfig.maxSize,
							accept: bucketConfig.accept,
						}}
						orientation="horizontal"
						className="file-dropzone">
						<FileInput className="flex-col-center w-full pt-3 pb-4">
							<FileSvgDraw accept={bucketConfig.accept} />
						</FileInput>
						<FileUploaderContent className="flex flex-wrap gap-2 mt-2 w-full">
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
						</FileUploaderContent>
					</FileUploader>
					{form.formState.errors.has_main_image && (
						<FieldError>{form.formState.errors.has_main_image.message}</FieldError>
					)}
				</Field>

				<Field>
					<FieldLabel>
						{DICT.COMMON.IMAGES.ADDITIONAL} ({extraImagesPaths.length + (extraImages?.length || 0)}
						/10)
					</FieldLabel>
					<FileUploader
						value={extraImages}
						onValueChange={(files) => setExtraImages(files?.slice(0, remainingSlots) || [])}
						existingImages={extraImagesPaths}
						onRemoveExisting={removeExistingImage}
						dropzoneOptions={{
							maxFiles: 10,
							maxSize: bucketConfig.maxSize,
							accept: bucketConfig.accept,
						}}
						orientation="horizontal"
						className="file-dropzone">
						<FileInput className="flex-col-center w-full pt-3 pb-4">
							<FileSvgDraw accept={bucketConfig.accept} />
							{remainingSlots <= 0 && (
								<p className="mt-2 text-xs font-medium text-center text-destructive">
									{DICT.COMMON.IMAGES.LIMIT_REACHED}
								</p>
							)}
						</FileInput>
						<FileUploaderContent className="flex flex-wrap gap-2 mt-2 w-full">
							{extraImages?.map((file, i) => (
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
						</FileUploaderContent>
					</FileUploader>
				</Field>
			</FieldGroup>

			<div className="flex justify-end gap-3 pt-4 overflow-visible border-t border-border">
				<Button type="button" variant="outline" onClick={onCancel}>
					{cancelLabel ?? DICT.COMMON.ACTIONS.CANCEL}
				</Button>
				<Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
					{isUploading
						? DICT.PROPERTIES.UPLOADING
						: initialData
							? DICT.COMMON.ACTIONS.UPDATE_PROPERTY
							: DICT.COMMON.ACTIONS.ADD_PROPERTY}
				</Button>
			</div>
		</form>
	);
}
