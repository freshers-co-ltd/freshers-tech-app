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

const roundUpTo5Minutes = (date: Date | null | undefined): Date => {
	const target = date ? new Date(date) : new Date();
	const minutes = target.getMinutes();
	const roundedMinutes = Math.ceil(minutes / 5) * 5;

	target.setMinutes(roundedMinutes);
	target.setSeconds(0);
	target.setMilliseconds(0);
	return target;
};

function TimePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
	const [open, setOpen] = React.useState(false);

	const roundedValue = React.useMemo(() => (value ? roundUpTo5Minutes(value) : undefined), [value]);

	const currentHours = roundedValue?.getHours() ?? 0;
	const [hour, setHour] = React.useState(() => (currentHours % 12 || 12).toString());
	const [minute, setMinute] = React.useState(() => roundedValue?.getMinutes() ?? 0);
	const [period, setPeriod] = React.useState<'AM' | 'PM'>(() => (currentHours < 12 ? 'AM' : 'PM'));

	React.useEffect(() => {
		if (open && roundedValue) {
			const h = roundedValue.getHours();
			setHour((h % 12 || 12).toString());
			setMinute(roundedValue.getMinutes());
			setPeriod(h < 12 ? 'AM' : 'PM');
		}
	}, [open, roundedValue]);

	const handleTimeSelect = (type: 'hour' | 'minute' | 'period', val: string) => {
		const baseDate = roundedValue ? new Date(roundedValue) : roundUpTo5Minutes(new Date());

		if (type === 'hour') {
			const h = parseInt(val, 10);
			if (period === 'PM' && h !== 12) {
				baseDate.setHours(h + 12);
			} else if (period === 'AM' && h === 12) {
				baseDate.setHours(0);
			} else {
				baseDate.setHours(h);
			}
		} else if (type === 'minute') {
			baseDate.setMinutes(parseInt(val, 10));
		} else if (type === 'period') {
			const currentHours = baseDate.getHours();
			if (val === 'PM' && currentHours < 12) {
				baseDate.setHours(currentHours + 12);
			} else if (val === 'AM' && currentHours >= 12) {
				baseDate.setHours(currentHours - 12);
			}
		}

		onChange(baseDate);
	};

	const displayTime = roundedValue ? format(roundedValue, 'hh:mm aa') : 'Select time';

	const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
	const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
	const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

	return (
		<Popover open={open} onOpenChange={setOpen} modal={true}>
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
										const numMin = parseInt(m, 10);
										setMinute(numMin);
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
									className="justify-center mx-2"
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
			data-testid="date-picker"
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
			<div className="flex items-center justify-center [&>div]:flex-1 [&>div]:w-full [&_table]:w-full">
				<Calendar
					mode="single"
					selected={value}
					onSelect={handleDateSelect}
					disabled={(date) => date < new Date()}
					fixedWeeks
					className="p-0"
				/>
			</div>
			<TimePicker value={value || new Date()} onChange={onChange} />
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={isOpen} onOpenChange={setIsOpen}>
				<DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
				<DrawerContent className="p-0 max-h-[90dvh]">
					<DrawerHeader className="sr-only">
						<DrawerTitle>Select Date and Time</DrawerTitle>
					</DrawerHeader>
					<div className="w-full pb-4">{PickerContent}</div>
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
