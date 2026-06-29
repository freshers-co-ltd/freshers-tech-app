'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, type SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DICT } from '@/dictionary';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import type { CleaningRequest } from '@/features/cleanings/types';
import { STATUS_GROUPS } from '@/features/cleanings/types';
import { PropertyForm } from '@/features/properties/components/PropertyForm';
import { useProperties } from '@/features/properties/PropertyContext';
import type { Property, PropertyInsert } from '@/features/properties/types';

const cleaningFormSchema = z.object({
	property_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
		message: 'Please select a valid property',
	}),
	scheduled_start: z.date({ message: 'Please select a start date' }),
	information: z.string().optional(),
	stocks_included: z.boolean(),
	custom_tasks: z.array(
		z.object({ description: z.string().min(1, { message: 'Task description required' }) }),
	),
});

export type CleaningFormValues = z.infer<typeof cleaningFormSchema>;

type CleaningFormInput = {
	property_id: string;
	scheduled_start: Date;
	information?: string;
	stocks_included: boolean;
	custom_tasks: { description: string }[];
};

interface CleaningFormProps {
	initialData?: CleaningRequest;
	onSubmit: (values: CleaningFormValues) => Promise<void>;
	onCancel?: () => void;
	disableCreateProperty?: boolean;
	availableProperties?: {
		id: string;
		address_line_1: string;
		postcode: string;
		bedrooms: number;
		type: string;
		price_per_cleaning?: number | null;
	}[];
}

export function CleaningForm({
	initialData,
	onSubmit,
	disableCreateProperty = false,
	availableProperties,
}: CleaningFormProps) {
	const isRestricted = initialData
		? STATUS_GROUPS.CAN_EDIT_RESTRICTED.includes(initialData.status)
		: false;
	const [step, setStep] = useState<1 | 2 | 3>(isRestricted ? 3 : initialData ? 2 : 1);
	const [entryMode, setEntryMode] = useState<'select' | 'create'>(
		disableCreateProperty ? 'select' : 'select',
	);
	const [standardTasks, setStandardTasks] = useState<{ id: string; description: string }[]>([]);
	const [standardTasksLoading, setStandardTasksLoading] = useState(false);
	const [standardTasksError, setStandardTasksError] = useState<string | null>(null);
	const { properties: contextProperties, upsertProperty } = useProperties();

	const displayedProperties = availableProperties || contextProperties;

	const dict = DICT.CLEANINGS.FORM;

	const form = useForm<CleaningFormInput, object, CleaningFormValues>({
		resolver: zodResolver(cleaningFormSchema),
		mode: 'onChange',
		shouldUnregister: false,
		defaultValues: {
			property_id: initialData?.property_id ?? '',
			scheduled_start: initialData
				? new Date(initialData.scheduled_start)
				: ('' as unknown as Date),
			information: initialData?.information ?? '',
			stocks_included: initialData?.stocks_included ?? false,
			custom_tasks:
				initialData?.tasks
					?.filter((t) => t.is_custom)
					.map((t) => ({ description: t.description })) ?? [],
		},
	});

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		trigger,
		reset,
		formState: { errors, isSubmitting },
	} = form;

	useEffect(() => {
		if (initialData) {
			reset({
				property_id: initialData.property_id,
				scheduled_start: new Date(initialData.scheduled_start),
				information: initialData.information ?? '',
				stocks_included: initialData.stocks_included ?? false,
				custom_tasks:
					initialData.tasks
						?.filter((t) => t.is_custom)
						.map((t) => ({ description: t.description })) ?? [],
			});
		}
	}, [initialData, reset]);

	const { fields, append, remove } = useFieldArray({
		control,
		name: 'custom_tasks',
	});

	const selectedPropertyId = watch('property_id');

	useEffect(() => {
		let isMounted = true;
		async function fetchStandardTasks() {
			setStandardTasksLoading(true);
			setStandardTasksError(null);
			const result = await cleaningsService.getStandardTasks();
			if (isMounted) {
				if (result.error) {
					setStandardTasksError(result.error);
				} else {
					setStandardTasks(result.data || []);
				}
				setStandardTasksLoading(false);
			}
		}
		fetchStandardTasks();

		return () => {
			isMounted = false;
		};
	}, []);

	const selectedProperty = useMemo(
		() => displayedProperties.find((p) => p.id === selectedPropertyId),
		[displayedProperties, selectedPropertyId],
	);

	const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

	useEffect(() => {
		if (!selectedProperty) {
			setCalculatedPrice(null);
			return;
		}
		setCalculatedPrice(selectedProperty.price_per_cleaning ?? null);
	}, [selectedProperty]);

	const handlePropertySubmit = async (propertyData: PropertyInsert): Promise<void> => {
		const result = await upsertProperty(propertyData);
		if (result.data) {
			const property = result.data as Property;
			setValue('property_id', property.id, {
				shouldValidate: true,
				shouldDirty: true,
				shouldTouch: true,
			});
			setStep(2);
		}
	};

	const handlePropertyFormCancel = () => {
		setEntryMode('select');
		setStep(1);
	};

	const handleFinalSubmit: SubmitHandler<CleaningFormValues> = async (values) => {
		try {
			await onSubmit(values);
		} catch {
			toast.error(DICT.ERRORS.COMMON.GENERIC);
		}
	};

	return (
		<div className="space-y-6">
			{step === 1 && entryMode === 'create' ? (
				<PropertyForm
					onSubmit={handlePropertySubmit}
					onCancel={handlePropertyFormCancel}
					cancelLabel={DICT.COMMON.ACTIONS.BACK}
				/>
			) : (
				<form onSubmit={handleSubmit(handleFinalSubmit)} className="space-y-6">
					<input type="hidden" {...register('property_id')} />

					{step === 1 && entryMode === 'select' && (
						<FieldGroup>
							<div className="space-y-4">
								{!disableCreateProperty && (
									<>
										<Button
											type="button"
											variant="secondary"
											className="w-full"
											onClick={() => setEntryMode('create')}>
											{dict.LABELS.NEW_PROPERTY}
										</Button>
										<p className="text-center font-medium">OR</p>
									</>
								)}
								{displayedProperties.length > 0 && (
									<>
										<Field>
											<Controller
												control={control}
												name="property_id"
												render={({ field }) => (
													<Select onValueChange={field.onChange} value={field.value}>
														<SelectTrigger>
															<SelectValue placeholder={dict.LABELS.SELECT_PROPERTY} />
														</SelectTrigger>
														<SelectContent>
															{displayedProperties.map((p) => (
																<SelectItem key={p.id} value={p.id}>
																	{p.address_line_1}, {p.postcode}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
											{errors.property_id && <FieldError>{errors.property_id.message}</FieldError>}
										</Field>

										<Button
											type="button"
											className="w-full"
											onClick={async () => {
												const isValid = await trigger('property_id');
												if (isValid) {
													setStep(2);
												}
											}}>
											{dict.BUTTONS.NEXT_DETAILS}
										</Button>
									</>
								)}
							</div>
						</FieldGroup>
					)}

					{step === 2 && (
						<div className="space-y-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<FieldLabel>{DICT.CLEANINGS.FORM.LABELS.STANDARD_TASKS}</FieldLabel>
									<div className="grid grid-cols-1 gap-1">
										{standardTasksLoading ? (
											<p className="text-muted-foreground text-sm py-2">
												{DICT.CLEANINGS.FORM.LOADING_TASKS}
											</p>
										) : standardTasksError ? (
											<p className="text-destructive text-sm py-2">
												{DICT.CLEANINGS.FORM.FAILED_TASKS}
											</p>
										) : standardTasks.length === 0 ? (
											<p className="text-muted-foreground text-sm py-2">
												{DICT.CLEANINGS.FORM.NO_TASKS}
											</p>
										) : (
											standardTasks.map((task) => (
												<div
													key={task.id}
													className="flex items-center px-2 py-1 rounded-lg border bg-muted text-sm">
													<span>{task.description}</span>
												</div>
											))
										)}
									</div>
								</div>

								<FieldGroup className="gap-0!">
									<FieldLabel className="mb-2">{dict.LABELS.CUSTOM_TASKS}</FieldLabel>
									<div className="space-y-3">
										{fields.map((field, index) => (
											<div key={field.id} className="flex gap-2">
												<Field className="flex-1">
													<Input
														{...register(`custom_tasks.${index}.description` as const)}
														placeholder={dict.PLACEHOLDERS.TASK}
														onBlur={() => trigger(`custom_tasks.${index}.description`)}
													/>
													{errors.custom_tasks?.[index]?.description && (
														<FieldError>
															{errors.custom_tasks[index]?.description?.message}
														</FieldError>
													)}
												</Field>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => remove(index)}>
													<Trash2 className="size-4 text-destructive" />
												</Button>
											</div>
										))}
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="w-full border-dashed"
											onClick={() => append({ description: '' })}>
											<Plus className="mr-1 size-4" /> {dict.BUTTONS.ADD_TASK}
										</Button>
										{errors.custom_tasks?.root?.message && (
											<FieldError>{errors.custom_tasks.root.message}</FieldError>
										)}
									</div>
								</FieldGroup>
							</div>

							<div className="flex gap-3">
								{!initialData && (
									<Button type="button" variant="outline" onClick={() => setStep(1)}>
										{DICT.COMMON.ACTIONS.BACK}
									</Button>
								)}
								<Button
									type="button"
									className="flex-1"
									onClick={async () => {
										const isValid = await trigger('custom_tasks');
										if (isValid) {
											setStep(3);
										}
									}}>
									{dict.BUTTONS.NEXT_DETAILS}
								</Button>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-6">
							<FieldGroup>
								<div className="flex items-center justify-between bg-card">
									<div className="space-y-0.5">
										<FieldLabel className="text-sm">Include Toiletries Restock</FieldLabel>
									</div>
									<Controller
										control={control}
										name="stocks_included"
										render={({ field }) => (
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										)}
									/>
								</div>

								<Field>
									<FieldLabel>{dict.LABELS.INFORMATION}</FieldLabel>
									<Textarea
										{...register('information')}
										className="min-h-15 resize-none"
										placeholder={dict.PLACEHOLDERS.INSTRUCTIONS}
									/>
								</Field>

								<Field>
									<FieldLabel>{dict.LABELS.SCHEDULED_DATE}</FieldLabel>
									<Controller
										control={control}
										name="scheduled_start"
										render={({ field }) => (
											<DateTimePicker value={field.value} onChange={field.onChange} />
										)}
									/>
									{errors.scheduled_start && (
										<FieldError>{errors.scheduled_start.message}</FieldError>
									)}
								</Field>

								<div className="p-4 rounded-xl border bg-muted/20">
									<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{dict.LABELS.COST}
									</p>
									{initialData ? (
										<p className="text-2xl font-black text-primary">
											{DICT.COMMON.CURRENCY}
											{Number(initialData.service_cost).toFixed(2)}
										</p>
									) : calculatedPrice === null ? (
										<p className="text-lg font-medium text-muted-foreground">Not set</p>
									) : (
										<p className="text-2xl font-black text-primary">
											{DICT.COMMON.CURRENCY}
											{calculatedPrice?.toFixed(2) ?? '0.00'}
										</p>
									)}
								</div>
							</FieldGroup>

							<div className="flex gap-3 pt-4 border-t">
								{!isRestricted && (
									<Button type="button" variant="outline" onClick={() => setStep(2)}>
										{DICT.COMMON.ACTIONS.BACK}
									</Button>
								)}
								<Button type="submit" className="flex-1" disabled={isSubmitting}>
									{isSubmitting
										? initialData
											? DICT.CLEANINGS.EDIT.BUTTON_SUBMITTING
											: DICT.CLEANINGS.CREATE.BUTTON_SUBMITTING
										: initialData
											? DICT.CLEANINGS.EDIT.BUTTON_SUBMIT
											: DICT.CLEANINGS.CREATE.BUTTON_SUBMIT}
								</Button>
							</div>
						</div>
					)}
				</form>
			)}
		</div>
	);
}

CleaningForm.title = DICT.CLEANINGS.CREATE.TITLE;
CleaningForm.description = DICT.CLEANINGS.CREATE.MESSAGE;
