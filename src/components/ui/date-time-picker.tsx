'use client';

import { format } from 'date-fns';
import { CalendarIcon, ChevronDownIcon, Clock } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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

function TimePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
	const [open, setOpen] = React.useState(false);
	const currentHours = value?.getHours() ?? 0;
	const [hour, setHour] = React.useState(() => (currentHours % 12 || 12).toString());
	const [minute, setMinute] = React.useState(() => {
		const m = value?.getMinutes() ?? 0;
		return Math.round(m / 5) * 5;
	});
	const [period, setPeriod] = React.useState<'AM' | 'PM'>(() => (currentHours < 12 ? 'AM' : 'PM'));

	React.useEffect(() => {
		if (open && value) {
			const h = value.getHours();
			setHour((h % 12 || 12).toString());
			setMinute(Math.round(value.getMinutes() / 5) * 5);
			setPeriod(h < 12 ? 'AM' : 'PM');
		}
	}, [open, value]);

	const handleTimeSelect = (type: 'hour' | 'minute' | 'period', val: string) => {
		if (!value) {
			return;
		}

		const newDate = new Date(value);

		if (type === 'hour') {
			const h = parseInt(val, 10);
			if (period === 'PM' && h !== 12) {
				newDate.setHours(h + 12);
			} else if (period === 'AM' && h === 12) {
				newDate.setHours(0);
			} else {
				newDate.setHours(h);
			}
		} else if (type === 'minute') {
			newDate.setMinutes(parseInt(val, 10));
		} else if (type === 'period') {
			const currentHours = newDate.getHours();
			if (val === 'PM' && currentHours < 12) {
				newDate.setHours(currentHours + 12);
			} else if (val === 'AM' && currentHours >= 12) {
				newDate.setHours(currentHours - 12);
			}
		}

		onChange(newDate);
	};

	const displayTime = value ? format(value, 'hh:mm aa') : 'Select time';

	const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
	const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
	const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" className="flex items-center text-sm w-full justify-between">
					<div className="flex items-center font-normal gap-2">
						<Clock className="size-4" />
						<span>{displayTime}</span>
					</div>
					<ChevronDownIcon className="size-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" side="top">
				<div className="flex h-48 gap-2 p-2 overflow-y-auto">
					<ScrollArea className="w-12">
						<div className="flex flex-col">
							{hours.map((h) => (
								<Button
									key={h}
									variant={hour === h ? 'default' : 'ghost'}
									size="icon-sm"
									className="justify-center mx-2"
									onClick={() => {
										setHour(h);
										handleTimeSelect('hour', h);
									}}>
									{h}
								</Button>
							))}
						</div>
					</ScrollArea>
					<ScrollArea className="w-12">
						<div className="flex flex-col">
							{minutes.map((m) => (
								<Button
									key={m}
									variant={minute === parseInt(m, 10) ? 'default' : 'ghost'}
									size="icon-sm"
									className="justify-center mx-2"
									onClick={() => {
										setMinute(parseInt(m, 10));
										handleTimeSelect('minute', m);
									}}>
									{m}
								</Button>
							))}
						</div>
					</ScrollArea>
					<ScrollArea className="w-12">
						<div className="flex flex-col">
							{periods.map((p) => (
								<Button
									key={p}
									variant={period === p ? 'default' : 'ghost'}
									size="icon-sm"
									className="justify-center  mx-2"
									onClick={() => {
										setPeriod(p);
										handleTimeSelect('period', p);
									}}>
									{p}
								</Button>
							))}
						</div>
					</ScrollArea>
				</div>
			</PopoverContent>
		</Popover>
	);
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

	const displayValue = value ? format(value, 'dd/MM/yyyy hh:mm aa') : 'Select date and time';

	const TriggerButton = (
		<Button
			variant="outline"
			className={cn(
				'w-full justify-start text-left font-normal h-10',
				!value && 'text-muted-foreground',
				error && 'border-destructive',
			)}>
			<CalendarIcon className="mr-2 h-4 w-4" />
			<span>{displayValue}</span>
		</Button>
	);

	const PickerContent = (
		<div className="flex flex-col p-3 gap-3">
			<div className="flex items-center justify-center">
				<Calendar
					mode="single"
					selected={value}
					onSelect={handleDateSelect}
					disabled={(date) => date < new Date()}
					fixedWeeks
					className="w-full"
				/>
			</div>
			<TimePicker value={value || new Date()} onChange={onChange} />
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
					{PickerContent}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
			<PopoverContent className="w-auto p-0">{PickerContent}</PopoverContent>
		</Popover>
	);
}
