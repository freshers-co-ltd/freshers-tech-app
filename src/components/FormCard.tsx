import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReusableFormCardProps {
	title?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	maxWidth?: string;
}

export function FormCard({
	title,
	children,
	footer,
	className,
	maxWidth = 'max-w-md',
}: ReusableFormCardProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [showTopGradient, setShowTopGradient] = useState(false);
	const [showBottomGradient, setShowBottomGradient] = useState(false);

	const handleScroll = useCallback(() => {
		const element = scrollRef.current;
		if (!element) {
			return;
		}
		const { scrollTop, scrollHeight, clientHeight } = element;
		setShowTopGradient(scrollTop > 5);
		setShowBottomGradient(scrollHeight - scrollTop - clientHeight > 5);
	}, []);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element) {
			return;
		}
		handleScroll();
		const resizeObserver = new ResizeObserver(() => handleScroll());
		resizeObserver.observe(element);
		const contentElement = element.firstElementChild;
		if (contentElement) {
			resizeObserver.observe(contentElement);
		}
		return () => resizeObserver.disconnect();
	}, [handleScroll]);

	return (
		<Card
			className={cn(
				'relative border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col bg-transparent w-full shrink-0 max-h-[95svh] p-0! gap-0!',
				maxWidth,
				className,
			)}>
			<CardHeader
				className={cn(
					'bg-primary flex items-center justify-center p-0 text-primary-foreground shrink-0 z-20',
					title ? 'h-11' : 'h-6',
				)}>
				{title &&
					(typeof title === 'string' ? (
						<CardTitle className="text-lg font-bold capitalize md:text-xl">{title}</CardTitle>
					) : (
						title
					))}
			</CardHeader>

			<CardContent
				ref={scrollRef}
				onScroll={handleScroll}
				className="relative w-full flex-1 min-h-0 p-0 overflow-y-auto no-scrollbar md:scrollbar-thin bg-card backdrop-blur-md z-10">
				<div
					className={cn(
						'sticky top-0 left-0 right-0 z-20 h-10 -mb-10 pointer-events-none bg-linear-to-b from-white to-transparent opacity-20',
						showTopGradient ? 'block' : 'hidden',
					)}
				/>

				<div className="px-5 py-6 md:px-8 relative z-10">{children}</div>

				<div
					className={cn(
						'sticky bottom-0 left-0 right-0 z-20 h-10 -mt-10 pointer-events-none bg-linear-to-t from-white to-transparent opacity-20',
						showBottomGradient ? 'block' : 'hidden',
					)}
				/>
			</CardContent>

			<CardFooter
				className={cn(
					'bg-primary flex items-center p-0 px-5 md:px-8 text-primary-foreground shrink-0 z-20',
					footer ? 'h-9' : 'h-6',
				)}>
				{footer}
			</CardFooter>
		</Card>
	);
}
