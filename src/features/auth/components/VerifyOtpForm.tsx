'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/services/authService';

const otpSchema = z.object({
	token: z.string().length(6, 'Code must be 6 digits'),
});

interface VerifyOtpFormProps {
	email: string;
	onBackToSignup: () => void;
}

export function VerifyOtpForm({ email, onBackToSignup }: VerifyOtpFormProps) {
	const navigate = useNavigate();
	const [resendCooldown, setResendCooldown] = useState(0);

	const otpForm = useForm<{ token: string }>({
		resolver: zodResolver(otpSchema),
		defaultValues: { token: '' },
	});

	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

	const onVerifySubmit = async (data: { token: string }) => {
		const { error } = await authService.verifyOtp(email, data.token);

		if (error) {
			toast.error(error);
			return;
		}

		toast.success(DICT.AUTH.SIGNUP.TOAST_SUCCESS, { duration: 3000 });
		navigate('/dashboard');
	};

	const handleResendCode = async () => {
		if (resendCooldown > 0) {
			return;
		}

		const { error } = await authService.resendSignupConfirmation(email);
		if (error) {
			toast.error(error);
		} else {
			setResendCooldown(60);
			toast.success(DICT.AUTH.SIGNUP.VERIFICATION.TOAST_NEW_CODE, { duration: 3000 });
		}
	};

	return (
		<div className="space-y-6 duration-300 animate-in fade-in slide-in-from-right-4">
			<div className="space-y-2 text-center">
				<h1 className="text-2xl font-bold">{DICT.AUTH.SIGNUP.VERIFICATION.TITLE}</h1>
				<p className="text-sm text-muted-foreground">
					{DICT.AUTH.SIGNUP.VERIFICATION.MESSAGE} <br />
					<span className="font-semibold text-foreground">{email}</span>
				</p>
			</div>

			<form onSubmit={otpForm.handleSubmit(onVerifySubmit)} className="space-y-4">
				<Controller
					control={otpForm.control}
					name="token"
					render={({ field, fieldState }) => (
						<Field className="flex-col-center gap-2">
							<InputOTP
								maxLength={6}
								pattern={'^[0-9]+$'}
								value={field.value}
								onChange={field.onChange}
								containerClassName="flex justify-center items-center w-full">
								<InputOTPGroup>
									<InputOTPSlot className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14" index={0} />
									<InputOTPSlot className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14" index={1} />
									<InputOTPSlot className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14" index={2} />
									<InputOTPSlot className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14" index={3} />
									<InputOTPSlot className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14" index={4} />
									<InputOTPSlot className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14" index={5} />
								</InputOTPGroup>
							</InputOTP>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
					{otpForm.formState.isSubmitting
						? DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_SUBMITTING
						: DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_SUBMIT}
				</Button>
			</form>

			<div className="flex flex-col gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={handleResendCode}
					disabled={resendCooldown > 0}>
					{resendCooldown > 0
						? `${DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_RESEND_WAIT} ${resendCooldown}s`
						: DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_RESEND}
				</Button>
				<div className="text-center text-sm text-muted-foreground">
					<span>{DICT.AUTH.SIGNUP.VERIFICATION.LABEL_WRONG_EMAIL}</span>
					<Button
						variant="link"
						size="sm"
						onClick={onBackToSignup}
						className="p-1 text-muted-foreground underline font-normal hover:text-primary hover:scale-100">
						{DICT.AUTH.SIGNUP.VERIFICATION.LINK_CHANGE_EMAIL}
					</Button>
				</div>
			</div>
		</div>
	);
}
