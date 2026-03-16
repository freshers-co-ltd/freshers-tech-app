'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2 } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService, type Profile } from '@/features/auth/authService';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

const personalSchema = z.object({
	full_name: z.string().trim().min(2, DICT.FORMS.VALIDATION.NAME_MIN),
	email: z.string().email(DICT.FORMS.VALIDATION.EMAIL_INVALID).trim(),
});

const securitySchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		password: z
			.string()
			.min(8, DICT.FORMS.VALIDATION.PASSWORD_MIN)
			.regex(/[0-9]/, { message: DICT.FORMS.VALIDATION.PASSWORD_NUMBER })
			.regex(/[^a-zA-Z0-9]/, { message: DICT.FORMS.VALIDATION.PASSWORD_SPECIAL }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: DICT.FORMS.VALIDATION.PASSWORDS_MATCH,
		path: ['confirmPassword'],
	});

type PersonalFormValues = z.infer<typeof personalSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

interface AccountFormProps {
	type: 'personal' | 'security';
	initialData?: Profile | null;
	userId?: string;
	onSuccess?: () => void;
}

export function AccountForm({ type, initialData, userId, onSuccess }: AccountFormProps) {
	const personalForm = useForm<PersonalFormValues>({
		resolver: zodResolver(personalSchema),
		defaultValues: {
			full_name: initialData?.full_name || '',
			email: initialData?.email || '',
		},
	});

	const securityForm = useForm<SecurityFormValues>({
		resolver: zodResolver(securitySchema),
		defaultValues: {
			currentPassword: '',
			password: '',
			confirmPassword: '',
		},
	});

	const onPersonalSubmit = async (values: PersonalFormValues) => {
		if (!userId) {
			return;
		}
		if (values.email !== initialData?.email) {
			const { error: emailErr } = await authService.updateEmail(values.email);
			if (emailErr) {
				toast.error(emailErr);
				return;
			}
			toast.info(DICT.ACCOUNT.NOTIFICATIONS.EMAIL_PENDING);
		}
		const { error } = await authService.updateProfile(userId, {
			full_name: values.full_name,
		});
		if (error) {
			toast.error(error);
		} else {
			toast.success(DICT.ACCOUNT.NOTIFICATIONS.UPDATE_SUCCESS);
			if (onSuccess) {
				onSuccess();
			}
		}
	};

	const onSecuritySubmit = async (values: SecurityFormValues) => {
		const { error: authError } = await authService.reauthenticate(values.currentPassword);
		if (authError) {
			toast.error('Current password incorrect');
			return;
		}
		const { error } = await authService.updatePassword(values.password);
		if (error) {
			toast.error(error);
		} else {
			toast.success(DICT.ACCOUNT.NOTIFICATIONS.PASSWORD_SUCCESS);
			securityForm.reset();
		}
	};

	if (type === 'personal') {
		return (
			<form onSubmit={personalForm.handleSubmit(onPersonalSubmit)} className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						control={personalForm.control}
						name="full_name"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.FULL_NAME}
								</FieldLabel>
								<Input {...field} aria-invalid={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
					<Controller
						control={personalForm.control}
						name="email"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.EMAIL}
								</FieldLabel>
								<Input {...field} type="email" aria-invalid={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
				</div>
				<Button className="font-medium" disabled={personalForm.formState.isSubmitting}>
					{personalForm.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
					{DICT.ACCOUNT.LABELS.SAVE_CHANGES}
				</Button>
			</form>
		);
	}

	return (
		<form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
			<div className="grid grid-cols-1 gap-4">
				<Controller
					control={securityForm.control}
					name="currentPassword"
					render={({ field, fieldState }) => (
						<Field className="space-y-1.5">
							<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Current Password
							</FieldLabel>
							<PasswordInput {...field} error={!!fieldState.error} />
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						control={securityForm.control}
						name="password"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.NEW_PASSWORD}
								</FieldLabel>
								<PasswordInput {...field} error={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
					<Controller
						control={securityForm.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.CONFIRM_PASSWORD}
								</FieldLabel>
								<PasswordInput {...field} error={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
				</div>
			</div>
			<Button className="font-medium" disabled={securityForm.formState.isSubmitting}>
				{securityForm.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
				{DICT.ACCOUNT.LABELS.UPDATE_PASSWORD}
			</Button>
		</form>
	);
}

export function AccountAvatar({
	profile,
	userId,
	onUploadSuccess,
}: {
	profile: Profile | null;
	userId?: string;
	onUploadSuccess: (url: string) => void;
}) {
	const [isUploading, setIsUploading] = useState(false);

	const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !userId) {
			return;
		}
		setIsUploading(true);
		const { url, error } = await authService.uploadAvatar(userId, file);
		if (error) {
			toast.error(error);
		} else if (url) {
			const { error: updateError } = await authService.updateProfile(userId, { avatar_url: url });
			if (updateError) {
				toast.error(updateError);
			} else {
				await supabase.auth.updateUser({
					data: { avatar_url: url },
				});
				onUploadSuccess(url);
				toast.success('Avatar updated');
			}
		}
		setIsUploading(false);
	};

	return (
		<div className="flex flex-col items-center text-center">
			<div className="relative">
				<Avatar className="size-24 md:size-32 border border-border">
					<AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
					<AvatarFallback className="text-2xl font-medium bg-muted">
						{profile?.full_name?.charAt(0) || '?'}
					</AvatarFallback>
				</Avatar>
				<label
					className={cn(
						'absolute bottom-0 right-0 p-2 bg-background border border-border rounded-full shadow-sm cursor-pointer hover:bg-accent transition-colors',
						isUploading && 'pointer-events-none',
					)}>
					{isUploading ? (
						<Loader2 className="size-4 animate-spin text-muted-foreground" />
					) : (
						<Camera className="size-4 text-muted-foreground" />
					)}
					<input
						type="file"
						className="hidden"
						accept="image/*"
						onChange={handleUpload}
						disabled={isUploading}
					/>
				</label>
			</div>
			<div className="mt-4">
				<h3 className="text-lg font-semibold">{profile?.full_name}</h3>
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
					{profile?.role}
				</p>
			</div>
		</div>
	);
}
