'use client';

import { ArrowRight, BrushCleaning, Building2, ChevronLeft, type LucideProps } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormContainer } from '@/components/ui/form-container';
import { DICT } from '@/dictionary';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { cn } from '@/lib/utils';

type SignupRole = {
	id: 'host' | 'cleaner';
	icon: React.ComponentType<LucideProps>;
	dict: {
		TITLE: string;
		MESSAGE: string;
	};
};

export function SignupPage() {
	const [accountType, setAccountType] = useState<'host' | 'cleaner' | null>(null);

	const roles: SignupRole[] = [
		{ id: 'host', icon: Building2, dict: DICT.AUTH.SIGNUP.ROLES.HOST },
		{ id: 'cleaner', icon: BrushCleaning, dict: DICT.AUTH.SIGNUP.ROLES.CLEANER },
	];

	return (
		<div className="relative w-full min-h-dvh bg-background overflow-x-hidden">
			{!accountType ? (
				<div className="flex-col-center min-h-dvh px-4 max-w-3xl mx-auto z-1">
					<div className="space-y-4 duration-500 flex flex-col items-center md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
						<div className="space-y-1 text-center">
							<h1 className="text-2xl font-extrabold tracking-tight md:text-4xl text-foreground">
								{DICT.AUTH.SIGNUP.TITLE}
							</h1>
							<p className="text-sm text-muted-foreground md:text-lg">{DICT.AUTH.SIGNUP.MESSAGE}</p>
						</div>

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
							{roles.map((role) => (
								<button
									key={role.id}
									type="button"
									onClick={() => setAccountType(role.id)}
									className={cn(
										'group flex flex-col items-start p-4 md:p-8 bg-card border-2 border-border rounded-xl md:rounded-2xl transition-all duration-300 w-full',
										'hover:border-primary hover:shadow-lg xl:hover:-translate-y-1 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
									)}>
									<div className="p-3 text-primary transition-colors md:p-4 rounded-lg md:rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground -translate-x-1.25 -translate-y-1.25">
										<role.icon className="size-6 md:size-8" />
									</div>

									<h3 className="mt-2 text-lg font-bold md:mt-6 md:text-xl text-card-foreground">
										{role.dict.TITLE}
									</h3>

									<p className="mt-1 text-xs leading-snug text-muted-foreground md:text-sm">
										{role.dict.MESSAGE}
									</p>

									<div className="flex items-center gap-2 mt-3 text-xs font-semibold transition-all duration-300 opacity-100 md:mt-6 text-primary md:text-sm xl:opacity-0 xl:group-hover:opacity-100">
										{DICT.AUTH.SIGNUP.ROLES.GET_STARTED}
										<ArrowRight className="size-3.5 md:size-4" />
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			) : (
				<div className="relative flex md:items-center justify-center h-dvh w-full md:p-8 overflow-hidden">
					<FormContainer
						variant="page"
						className="md:max-w-md"
						title={
							accountType === 'host'
								? DICT.AUTH.SIGNUP.ROLES.HOST.CALL_TO_ACTION
								: DICT.AUTH.SIGNUP.ROLES.CLEANER.CALL_TO_ACTION
						}>
						<SignupForm selectedRole={accountType} />

						<div className="mt-6 pt-4 border-t">
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-foreground p-0 h-auto"
								onClick={() => setAccountType(null)}>
								<ChevronLeft className="mr-1 size-4" /> {DICT.AUTH.SIGNUP.ROLES.BACK_BUTTON}
							</Button>
						</div>
					</FormContainer>
				</div>
			)}
		</div>
	);
}
