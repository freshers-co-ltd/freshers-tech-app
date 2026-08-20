'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DICT } from '@/dictionary';
import {
	type CreateFeedPayload,
	ICAL_SOURCES,
	type IcalSource,
	isIcalSource,
} from '@/features/ical/types';

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const detectSourceFromUrl = (value: string): IcalSource | null => {
	try {
		const host = new URL(value).hostname.toLowerCase();
		if (host.includes('airbnb')) {
			return 'airbnb';
		}
		if (host.includes('booking')) {
			return 'booking';
		}
		if (host.includes('vrbo')) {
			return 'vrbo';
		}
	} catch {
		return null;
	}
	return null;
};

const feedSchema = z
	.object({
		url: z
			.string()
			.trim()
			.min(1, DICT.ICAL.ERRORS.INVALID_URL)
			.url(DICT.ICAL.ERRORS.INVALID_URL)
			.refine(isHttpUrl, DICT.ICAL.ERRORS.INVALID_URL),
		source: z.enum(ICAL_SOURCES),
		confirmGeneric: z.boolean(),
	})
	.superRefine((data, ctx) => {
		if (data.source === 'generic' && !data.confirmGeneric) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: DICT.ICAL.ERRORS.NOT_CONFIRMED,
				path: ['confirmGeneric'],
			});
		}
	});

export type FeedFormValues = z.infer<typeof feedSchema>;

interface IcalFeedFormProps {
	propertyId: string;
	onSubmit: (payload: CreateFeedPayload) => Promise<{ success: boolean }>;
	onCancel: () => void;
}

const SOURCE_LABEL_KEY = {
	airbnb: 'AIRBNB',
	booking: 'BOOKING',
	vrbo: 'VRBO',
	generic: 'GENERIC',
} as const satisfies Record<IcalSource, string>;

export function IcalFeedForm({ propertyId, onSubmit, onCancel }: IcalFeedFormProps) {
	const form = useForm<FeedFormValues>({
		resolver: zodResolver(feedSchema),
		defaultValues: {
			url: '',
			source: 'airbnb',
			confirmGeneric: false,
		},
	});

	const selectedSource = form.watch('source');
	const detectedSource = detectSourceFromUrl(form.watch('url'));

	const handleUrlBlur = () => {
		const url = form.getValues('url');
		const detected = detectSourceFromUrl(url);
		if (detected && form.getValues('source') !== detected) {
			form.setValue('source', detected);
		}
	};

	const handleFormSubmit = async (values: FeedFormValues) => {
		await onSubmit({
			propertyId,
			url: values.url,
			source: values.source,
			confirmGeneric: values.confirmGeneric,
		});
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
					<FieldLabel htmlFor="ical-url">{DICT.ICAL.URL}</FieldLabel>
					<Input
						{...form.register('url')}
						id="ical-url"
						type="url"
						placeholder="https://www.airbnb.co.uk/calendar/ical/..."
						onBlur={handleUrlBlur}
					/>
					{form.formState.errors.url && (
						<FieldError>{form.formState.errors.url.message}</FieldError>
					)}
					{!form.formState.errors.url && detectedSource && (
						<p className="text-xs text-muted-foreground">
							{DICT.ICAL.DETECTED_SOURCE_HINT.replace(
								'{platform}',
								DICT.ICAL.SOURCES[SOURCE_LABEL_KEY[detectedSource]],
							)}
						</p>
					)}
				</Field>

				<Field>
					<FieldLabel>{DICT.ICAL.SOURCE}</FieldLabel>
					<Select
						onValueChange={(value) => {
							const source = isIcalSource(value) ? value : 'generic';
							form.setValue('source', source);
						}}
						defaultValue={form.getValues('source')}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ICAL_SOURCES.map((source) => (
								<SelectItem key={source} value={source}>
									{DICT.ICAL.SOURCES[SOURCE_LABEL_KEY[source]]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				{selectedSource === 'generic' && (
					<Field>
						<div className="flex items-start gap-2">
							<Checkbox
								id="ical-confirm-generic"
								checked={form.watch('confirmGeneric')}
								onCheckedChange={(checked) => form.setValue('confirmGeneric', checked === true)}
							/>
							<label htmlFor="ical-confirm-generic" className="text-sm">
								{DICT.ICAL.GENERIC_CONFIRM}
							</label>
						</div>
						{form.formState.errors.confirmGeneric && (
							<FieldError>{form.formState.errors.confirmGeneric.message}</FieldError>
						)}
					</Field>
				)}
			</FieldGroup>

			<div className="flex justify-end gap-3 pt-4 overflow-visible border-t border-border">
				<Button type="button" variant="outline" onClick={onCancel}>
					{DICT.COMMON.ACTIONS.CANCEL}
				</Button>
				<Button type="submit" disabled={form.formState.isSubmitting}>
					{DICT.COMMON.ACTIONS.CREATE}
				</Button>
			</div>
		</form>
	);
}
