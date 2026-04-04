'use client';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
	value?: Date;
	onChange: (date: Date) => void;
	error?: string;
}

function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState(false);
	React.useEffect(() => {
		const mql = window.matchMedia('(max-width: 640px)');
		const onChange = () => setIsMobile(mql.matches);
		mql.addEventListener('change', onChange);
		setIsMobile(mql.matches);
		return () => mql.removeEventListener('change', onChange);
	}, []);
	return isMobile;
}

export function DateTimePicker({ value, onChange, error }: DateTimePickerProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const isMobile = useIsMobile();

	const handleDateSelect = (date: Date | undefined) => {
		if (date) {
			const current = value || new Date();
			const newDate = new Date(date);
			newDate.setHours(current.getHours());
			newDate.setMinutes(current.getMinutes());
			onChange(newDate);
		}
	};

	const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', val: string) => {
		const currentDate = value || new Date();
		const newDate = new Date(currentDate);

		if (type === 'hour') {
			const hour = Number.parseInt(val, 10);
			newDate.setHours(
				newDate.getHours() >= 12 ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour,
			);
		} else if (type === 'minute') {
			newDate.setMinutes(Number.parseInt(val, 10));
		} else if (type === 'ampm') {
			const hours = newDate.getHours();
			if (val === 'AM' && hours >= 12) {
				newDate.setHours(hours - 12);
			} else if (val === 'PM' && hours < 12) {
				newDate.setHours(hours + 12);
			}
		}
		onChange(newDate);
	};

	const TriggerButton = (
		<Button
			variant="outline"
			className={cn(
				'w-full justify-start text-left font-normal h-10',
				!value && 'text-muted-foreground',
				error && 'border-destructive',
			)}>
			<CalendarIcon className="mr-2 h-4 w-4" />
			{value ? format(value, 'MM/dd/yyyy hh:mm aa') : <span>Select date and time</span>}
		</Button>
	);

	const PickerContent = (
		<div className="flex flex-col sm:flex-row h-full sm:h-auto overflow-y-auto">
			<div className="flex justify-center items-center sm:p-0 w-full overflow-hidden">
				<Calendar
					mode="single"
					selected={value}
					onSelect={handleDateSelect}
					disabled={(date) => date < new Date()}
					autoFocus
					className={cn('p-3 sm:p-3', isMobile && 'scale-125 my-8')}
				/>
			</div>
			<div className="flex flex-col sm:flex-row sm:h-80 divide-y sm:divide-y-0 sm:divide-x border-t sm:border-t-0">
				<ScrollArea className="w-full sm:w-auto">
					<div className="flex sm:flex-col p-2">
						{Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
							<Button
								key={hour}
								size="icon"
								variant={value && value.getHours() % 12 === hour % 12 ? 'default' : 'ghost'}
								className="sm:w-full shrink-0 aspect-square size-7"
								onClick={() => handleTimeChange('hour', hour.toString())}>
								{hour}
							</Button>
						))}
					</div>
					<ScrollBar orientation="horizontal" className="sm:hidden" />
				</ScrollArea>
				<ScrollArea className="w-full sm:w-auto">
					<div className="flex sm:flex-col p-2">
						{Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
							<Button
								key={minute}
								size="icon"
								variant={value && value.getMinutes() === minute ? 'default' : 'ghost'}
								className="sm:w-full shrink-0 aspect-square size-7"
								onClick={() => handleTimeChange('minute', minute.toString())}>
								{minute.toString().padStart(2, '0')}
							</Button>
						))}
					</div>
					<ScrollBar orientation="horizontal" className="sm:hidden" />
				</ScrollArea>
				<ScrollArea className="w-full sm:w-auto">
					<div className="flex sm:flex-col p-2">
						{['AM', 'PM'].map((ampm) => (
							<Button
								key={ampm}
								size="icon"
								variant={
									value &&
									((ampm === 'AM' && value.getHours() < 12) ||
										(ampm === 'PM' && value.getHours() >= 12))
										? 'default'
										: 'ghost'
								}
								className="sm:w-full shrink-0 aspect-square size-7 text-xs"
								onClick={() => handleTimeChange('ampm', ampm)}>
								{ampm}
							</Button>
						))}
					</div>
					<ScrollBar orientation="horizontal" className="sm:hidden" />
				</ScrollArea>
			</div>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={isOpen} onOpenChange={setIsOpen}>
				<DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
				<DrawerContent className="p-0 max-h-[90vh]">
					<DrawerHeader className="sr-only">
						<DrawerTitle>Select Date and Time</DrawerTitle>
					</DrawerHeader>
					<div className="w-full pb-2">{PickerContent}</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				{PickerContent}
			</PopoverContent>
		</Popover>
	);
}
