'use client';

import { ArrowRight, BrushCleaning, Building2, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { BubbleBackground } from '@/components/Background';
import { FormCard } from '@/components/FormCard';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { cn } from '@/lib/utils';

export function SignupPage() {
	const [accountType, setAccountType] = useState<'host' | 'cleaner' | null>(null);

	return (
		<div className="relative flex flex-col items-center justify-center w-full min-h-dvh bg-background overflow-y-auto">
			<BubbleBackground seedOffset={2} />
			<div className="relative z-1 flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-4">
				{!accountType ? (
					<div className="flex flex-col justify-center space-y-4 duration-500 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
						<div className="space-y-1 text-center">
							<h1 className="text-2xl font-extrabold tracking-tight md:text-4xl text-foreground">
								{DICT.AUTH.SIGNUP.TITLE}
							</h1>
							<p className="text-sm text-muted-foreground md:text-lg">
								{DICT.AUTH.SIGNUP.DESCRIPTION}
							</p>
						</div>

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
							<button
								type="button"
								onClick={() => setAccountType('host')}
								className={cn(
									'group flex flex-col items-start p-4 md:p-8 bg-card border-2 border-border rounded-2xl md:rounded-3xl transition-all duration-300 w-full',
									'hover:border-primary hover:shadow-lg xl:hover:-translate-y-1 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
								)}>
								<div className="p-3 text-primary transition-colors md:p-4 rounded-xl md:rounded-2xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground -translate-x-1.25 -translate-y-1.25">
									<Building2 className="w-6 h-6 md:w-8 md:h-8" />
								</div>
								<h3 className="mt-2 text-lg font-bold md:mt-6 md:text-xl text-card-foreground">
									{DICT.AUTH.SIGNUP.ROLES.HOST.TITLE}
								</h3>
								<p className="mt-1 text-xs leading-snug text-muted-foreground md:text-sm">
									{DICT.AUTH.SIGNUP.ROLES.HOST.DESCRIPTION}
								</p>
								<div className="flex items-center gap-2 mt-3 text-xs font-semibold opacity-100 md:mt-6 text-primary md:text-sm xl:opacity-0 xl:group-hover:opacity-100">
									{DICT.AUTH.SIGNUP.ROLES.GET_STARTED}{' '}
									<ArrowRight size={14} className="md:w-4 md:h-4" />
								</div>
							</button>

							<button
								type="button"
								onClick={() => setAccountType('cleaner')}
								className={cn(
									'group flex flex-col items-start p-4 md:p-8 bg-card border-2 border-border rounded-2xl md:rounded-3xl transition-all duration-300 w-full',
									'hover:border-primary hover:shadow-lg xl:hover:-translate-y-1 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
								)}>
								<div className="p-3 text-primary transition-colors md:p-4 rounded-xl md:rounded-2xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground -translate-x-1.25 -translate-y-1.25">
									<BrushCleaning className="w-6 h-6 md:w-8 md:h-8" />
								</div>
								<h3 className="mt-2 text-lg font-bold md:mt-6 md:text-xl text-card-foreground">
									{DICT.AUTH.SIGNUP.ROLES.CLEANER.TITLE}
								</h3>
								<p className="mt-1 text-xs leading-snug text-muted-foreground md:text-sm">
									{DICT.AUTH.SIGNUP.ROLES.CLEANER.DESCRIPTION}
								</p>
								<div className="flex items-center gap-2 mt-3 text-xs font-semibold opacity-100 md:mt-6 text-primary md:text-sm xl:opacity-0 xl:group-hover:opacity-100">
									{DICT.AUTH.SIGNUP.ROLES.GET_STARTED}{' '}
									<ArrowRight size={14} className="md:w-4 md:h-4" />
								</div>
							</button>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center w-full min-h-0 flex-1">
						<FormCard
							title={
								accountType === 'host'
									? DICT.AUTH.SIGNUP.ROLES.HOST.REGISTER_TITLE
									: DICT.AUTH.SIGNUP.ROLES.CLEANER.REGISTER_TITLE
							}
							footer={
								<Button
									variant="link"
									className="p-0! h-auto text-background lg:text-blue-200 hover:text-background transition-colors duration-200 hover:no-underline"
									onClick={() => setAccountType(null)}>
									<ChevronLeft className="w-4 h-4 mr-1" />{' '}
									{DICT.AUTH.SIGNUP.ROLES.BACK_TO_SELECTION}
								</Button>
							}>
							<SignupForm selectedRole={accountType} />
						</FormCard>
					</div>
				)}
			</div>
		</div>
	);
}
