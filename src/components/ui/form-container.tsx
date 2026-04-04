import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScrollGradients } from '@/hooks/useScrollGradients';
import { cn } from '@/lib/utils';

interface FormMetadata {
	title?: string;
	description?: string;
}

interface FormContainerProps {
	children: React.ReactNode;
	title?: string;
	description?: string;
	className?: string;
	variant?: 'page' | 'dialog';
}

export function FormContainer({
	children,
	title,
	description,
	className,
	variant = 'page',
}: FormContainerProps) {
	const { scrollAreaRef } = useScrollGradients();

	const childType = React.isValidElement(children) ? (children.type as FormMetadata) : null;

	const displayTitle = title ?? childType?.title;
	const displayDescription = description ?? childType?.description;

	return (
		<div
			className={cn(
				'flex flex-col w-full bg-background overflow-hidden relative',
				variant === 'page' &&
					'h-fit max-h-[95dvh] md:max-w-md md:mx-auto md:rounded-xl md:border md:shadow-sm',
				variant === 'dialog' && 'h-fit max-h-[95dvh] md:rounded-xl',
				className,
			)}>
			{(displayTitle || displayDescription) && (
				<div className="px-6 py-3 border-b shrink-0 bg-primary z-10">
					{displayTitle && (
						<h1 className="text-xl font-bold uppercase leading-none tracking-wide text-center text-background">
							{displayTitle}
						</h1>
					)}
					{displayDescription && (
						<p className="text-sm text-background mt-1.5 text-center">{displayDescription}</p>
					)}
				</div>
			)}

			<ScrollArea ref={scrollAreaRef} className="flex-1 w-full min-h-0 flex flex-col">
				<div className="p-3 pt-1.5 md:p-6 md:pt-3 flex-1">{children}</div>
			</ScrollArea>
		</div>
	);
}
