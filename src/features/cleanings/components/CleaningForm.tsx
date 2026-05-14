'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DICT } from '@/dictionary';
import { cleaningService } from '@/features/admin/cleaningService';
import { useAuth } from '@/features/auth/AuthContext';
import { type CleaningRequest, STATUS_GROUPS } from '@/features/cleanings/cleaningService';
import { PropertyForm } from '@/features/properties/components/PropertyForm';
import { useProperties } from '@/features/properties/PropertyContext';
import type { Property, PropertyInsert } from '@/features/properties/propertyService';
import { supabase } from '@/lib/supabaseClient';

const cleaningFormSchema = z.object({
	property_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
		message: 'Please select a valid property',
	}),
	scheduled_start: z.date({ message: 'Please select a start date' }),
	instructions: z.string().optional(),
	stocks_included: z.boolean(),
	custom_tasks: z.array(
		z.object({ description: z.string().min(1, { message: 'Task description required' }) }),
	),
});

export type CleaningFormValues = z.infer<typeof cleaningFormSchema>;

type CleaningFormInput = {
	property_id: string;
	scheduled_start: Date;
	instructions?: string;
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
	const navigate = useNavigate();
	const { user } = useAuth();
	const [hostBasePrice, setHostBasePrice] = useState<number | null>(null);
	const [hostMultipliers, setHostMultipliers] = useState<Record<string, number> | null>(null);

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
				: new Date(Date.now() + 86400000),
			instructions: initialData?.instructions ?? '',
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
				instructions: initialData.instructions ?? '',
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
	const stocksIncluded = watch('stocks_included');

	useEffect(() => {
		let isMounted = true;
		async function fetchStandardTasks() {
			setStandardTasksLoading(true);
			setStandardTasksError(null);
			const result = await cleaningService.getStandardTasks();
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

	useEffect(() => {
		if (!user?.id) {
			return;
		}

		const isMounted = true;
		async function fetchHostPricing() {
			if (!user) {
				return;
			}

			const { data: profile } = await supabase
				.from('profiles')
				.select('base_price_per_cleaning')
				.eq('id', user.id)
				.single();

			const { data: config } = await supabase.rpc('get_cleaner_pay_config');

			if (isMounted) {
				setHostBasePrice(profile?.base_price_per_cleaning ?? null);
				setHostMultipliers(
					config && Array.isArray(config) && config[0]?.host_multipliers
						? (config[0].host_multipliers as Record<string, number>)
						: null,
				);
			}
		}
		fetchHostPricing();
	}, [user]);

	const selectedProperty = useMemo(
		() => displayedProperties.find((p) => p.id === selectedPropertyId),
		[displayedProperties, selectedPropertyId],
	);

	const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

	useEffect(() => {
		if (!selectedProperty || hostBasePrice === null) {
			setCalculatedPrice(null);
			return;
		}

		let isMounted = true;

		async function calcPrice() {
			if (hostBasePrice === null || !selectedProperty) {
				return;
			}

			const { data } = await supabase.rpc('calculate_service_cost', {
				p_bedrooms: selectedProperty.bedrooms,
				p_property_type: selectedProperty.type,
				p_stocks_included: stocksIncluded,
				p_base_price: hostBasePrice,
				p_host_multipliers: hostMultipliers,
			});

			if (isMounted) {
				setCalculatedPrice(data);
			}
		}
		calcPrice();

		return () => {
			isMounted = false;
		};
	}, [selectedProperty, stocksIncluded, hostBasePrice, hostMultipliers]);

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
			navigate('/error/500');
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
									<FieldLabel>Standard Tasks</FieldLabel>
									<div className="grid grid-cols-1 gap-1">
										{standardTasksLoading ? (
											<p className="text-muted-foreground text-sm py-2">Loading tasks...</p>
										) : standardTasksError ? (
											<p className="text-destructive text-sm py-2">Failed to load tasks</p>
										) : standardTasks.length === 0 ? (
											<p className="text-muted-foreground text-sm py-2">
												No standard tasks available
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
									<Button variant="outline" onClick={() => setStep(1)}>
										{DICT.COMMON.ACTIONS.BACK}
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
									{dict.BUTTONS.NEXT_DETAILS}
								</Button>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-6">
							<FieldGroup>
								<div className="flex items-center justify-between p-4 rounded-xl border bg-card">
									<div className="space-y-0.5">
										<FieldLabel className="text-base">Include Household Stocks</FieldLabel>
										<p className="text-xs text-muted-foreground">
											Toiletries, beverages, and cleaning supplies.
										</p>
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
									<FieldLabel>{dict.LABELS.INSTRUCTIONS}</FieldLabel>
									<Textarea
										{...register('instructions')}
										className="min-h-25 resize-none"
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
									{hostBasePrice === null ? (
										<p className="text-lg font-medium text-muted-foreground">Not set</p>
									) : (
										<p className="text-2xl font-black text-primary">
											{DICT.FORMAT.CURRENCY}
											{calculatedPrice?.toFixed(2) ?? '0.00'}
										</p>
									)}
								</div>
							</FieldGroup>

							<div className="flex gap-3 pt-4 border-t">
								{!isRestricted && (
									<Button variant="outline" onClick={() => setStep(2)}>
										{DICT.COMMON.ACTIONS.BACK}
									</Button>
								)}
								<Button type="submit" className="flex-1" disabled={isSubmitting}>
									{isSubmitting ? dict.BUTTONS.SUBMITTING : dict.BUTTONS.SUBMIT}
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
