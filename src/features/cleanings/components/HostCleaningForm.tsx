'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, type SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { DICT } from '@/dictionary';
import {
	type CleaningRequest,
	calculateServiceCost,
	STATUS_GROUPS,
} from '@/features/cleanings/cleaningService';
import { PropertyForm } from '@/features/properties/components/PropertyForm';
import { useProperties } from '@/features/properties/PropertyContext';
import type { PropertyInsert } from '@/features/properties/propertyService';
import { supabase } from '@/lib/supabaseClient';

const hostCleaningSchema = z.object({
	property_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
		message: 'Please select a valid property',
	}),
	scheduled_start: z.date({ message: 'Please select a start date' }),
	instructions: z.string().optional(),
	custom_tasks: z.array(
		z.object({ description: z.string().min(1, { message: 'Task description required' }) }),
	),
});

export type HostCleaningFormValues = z.infer<typeof hostCleaningSchema>;

type HostCleaningFormInput = {
	property_id: string;
	scheduled_start: Date;
	instructions?: string;
	custom_tasks: { description: string }[];
};

interface HostCleaningFormProps {
	initialData?: CleaningRequest;
	onSubmit: (values: HostCleaningFormValues) => Promise<void>;
	onCancel: () => void;
}

export function HostCleaningForm({ initialData, onSubmit, onCancel }: HostCleaningFormProps) {
	const isRestricted = initialData
		? STATUS_GROUPS.CAN_EDIT_RESTRICTED.includes(initialData.status)
		: false;
	const [step, setStep] = useState<1 | 2 | 3>(isRestricted ? 3 : initialData ? 2 : 1);
	const [entryMode, setEntryMode] = useState<'select' | 'create'>('select');
	const [standardTasks, setStandardTasks] = useState<{ id: string; description: string }[]>([]);
	const { properties, upsertProperty } = useProperties();
	const navigate = useNavigate();

	const d = DICT.CLEANINGS.FORM;

	const form = useForm<HostCleaningFormInput, object, HostCleaningFormValues>({
		resolver: zodResolver(hostCleaningSchema),
		mode: 'onChange',
		shouldUnregister: false,
		defaultValues: {
			property_id: initialData?.property_id ?? '',
			scheduled_start: initialData
				? new Date(initialData.scheduled_start)
				: new Date(Date.now() + 86400000),
			instructions: initialData?.instructions ?? '',
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
				instructions: initialData.instructions ?? '',
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
			const { data } = await supabase
				.from('standard_tasks')
				.select('id, description')
				.eq('is_active', true);

			if (data && isMounted) {
				setStandardTasks(data);
			}
		}
		fetchStandardTasks();

		return () => {
			isMounted = false;
		};
	}, []);

	const selectedProperty = useMemo(
		() => properties.find((p) => p.id === selectedPropertyId),
		[properties, selectedPropertyId],
	);

	const calculatedPrice = useMemo(() => {
		if (!selectedProperty) {
			return 0;
		}
		return calculateServiceCost(selectedProperty.bedrooms, selectedProperty.bathrooms);
	}, [selectedProperty]);

	const handlePropertySubmit = async (propertyData: PropertyInsert): Promise<void> => {
		const result = await upsertProperty(propertyData);
		if (result.data) {
			const property = result.data;
			setValue('property_id', property.id, {
				shouldValidate: true,
				shouldDirty: true,
				shouldTouch: true,
			});
			setStep(2);
		}
	};

	const handleFinalSubmit: SubmitHandler<HostCleaningFormValues> = async (values) => {
		try {
			await onSubmit(values);
		} catch {
			navigate('/error/500');
		}
	};

	return (
		<div className="space-y-6">
			{step === 1 && entryMode === 'create' ? (
				<PropertyForm onSubmit={handlePropertySubmit} onCancel={onCancel} />
			) : (
				<form onSubmit={handleSubmit(handleFinalSubmit)} className="space-y-6">
					<input type="hidden" {...register('property_id')} />

					{step === 1 && entryMode === 'select' && (
						<FieldGroup>
							<div className="flex gap-2 p-1 border rounded-md bg-muted/50">
								<Button
									variant={entryMode === 'select' ? 'default' : 'ghost'}
									className="flex-1"
									onClick={() => setEntryMode('select')}>
									{d.LABELS.SELECT_PROPERTY}
								</Button>
								<Button variant="ghost" className="flex-1" onClick={() => setEntryMode('create')}>
									{d.LABELS.NEW_PROPERTY}
								</Button>
							</div>

							<div className="space-y-4">
								<Field>
									<FieldLabel>{DICT.FORMS.LABELS.ADDRESS}</FieldLabel>
									<Controller
										control={control}
										name="property_id"
										render={({ field }) => (
											<Select onValueChange={field.onChange} value={field.value}>
												<SelectTrigger>
													<SelectValue placeholder={d.LABELS.SELECT_PROPERTY} />
												</SelectTrigger>
												<SelectContent>
													{properties.map((p) => (
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
									className="w-full"
									onClick={async () => {
										const isValid = await trigger('property_id');
										if (isValid) {
											setStep(2);
										}
									}}>
									{d.BUTTONS.NEXT_DETAILS}
								</Button>
							</div>
						</FieldGroup>
					)}

					{step === 2 && (
						<div className="space-y-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<FieldLabel>Standard Tasks</FieldLabel>
									<div className="grid grid-cols-1 gap-2">
										{standardTasks.map((task) => (
											<div
												key={task.id}
												className="flex items-center gap-2 px-2 py-1 rounded-lg border bg-muted text-sm">
												<CheckCircle2 className="size-4 text-green-600 shrink-0" />
												<span className="text-muted-foreground">{task.description}</span>
											</div>
										))}
									</div>
								</div>

								<FieldGroup className="gap-0!">
									<FieldLabel className="mb-2">{d.LABELS.CUSTOM_TASKS}</FieldLabel>
									<div className="space-y-3">
										{fields.map((field, index) => (
											<div key={field.id} className="flex gap-2">
												<Field className="flex-1">
													<Input
														{...register(`custom_tasks.${index}.description` as const)}
														placeholder={d.PLACEHOLDERS.TASK}
													/>
													{errors.custom_tasks?.[index]?.description && (
														<FieldError>
															{errors.custom_tasks[index]?.description?.message}
														</FieldError>
													)}
												</Field>
												<Button variant="ghost" size="icon" onClick={() => remove(index)}>
													<Trash2 className="size-4 text-destructive" />
												</Button>
											</div>
										))}
										<Button
											variant="outline"
											size="sm"
											className="w-full border-dashed"
											onClick={() => append({ description: '' })}>
											<Plus className="mr-2 size-4" /> {d.BUTTONS.ADD_TASK}
										</Button>
										{errors.custom_tasks?.root?.message && (
											<FieldError>{errors.custom_tasks.root.message}</FieldError>
										)}
									</div>
								</FieldGroup>
							</div>

							<div className="flex gap-3">
								{!initialData && (
									<Button variant="outline" onClick={() => setStep(1)}>
										{DICT.COMMON.BACK}
									</Button>
								)}
								<Button
									className="flex-1"
									onClick={async () => {
										const isValid = await trigger('custom_tasks');
										if (isValid) {
											setStep(3);
										}
									}}>
									{d.BUTTONS.NEXT_DETAILS}
								</Button>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-6">
							<FieldGroup>
								<Field>
									<FieldLabel>{d.LABELS.INSTRUCTIONS}</FieldLabel>
									<Textarea
										{...register('instructions')}
										className="min-h-25 resize-none"
										placeholder={d.PLACEHOLDERS.INSTRUCTIONS}
									/>
								</Field>

								<Field>
									<FieldLabel>{d.LABELS.SCHEDULED_DATE}</FieldLabel>
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
										{d.LABELS.COST}
									</p>
									<p className="text-2xl font-black text-primary">£{calculatedPrice.toFixed(2)}</p>
								</div>

								<div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-xs">
									<Info className="size-4 shrink-0 mt-0.5" />
									<p>{d.INFO.PRICING_NOTICE}</p>
								</div>
							</FieldGroup>

							<div className="flex gap-3 pt-4 border-t">
								{!isRestricted && (
									<Button variant="outline" onClick={() => setStep(2)}>
										{DICT.COMMON.BACK}
									</Button>
								)}
								<Button type="submit" className="flex-1" disabled={isSubmitting}>
									{isSubmitting ? d.BUTTONS.SUBMITTING : d.BUTTONS.SUBMIT}
								</Button>
							</div>
						</div>
					)}
				</form>
			)}
		</div>
	);
}