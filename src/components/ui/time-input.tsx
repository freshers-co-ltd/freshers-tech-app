'use client';

import { ChevronDownIcon, Clock } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TimeInputProps {
	value?: string;
	onChange: (value: string) => void;
	onClose?: () => void;
	error?: string;
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

const parseTimeValue = (value: string | undefined): Date | null => {
	if (!value) {
		return null;
	}
	const match = TIME_PATTERN.exec(value.trim());
	if (!match) {
		return null;
	}
	const hour = parseInt(match[1] ?? '', 10);
	const minute = parseInt(match[2] ?? '', 10);
	if (hour > 23 || minute > 59) {
		return null;
	}
	const date = new Date();
	date.setHours(hour, minute, 0, 0);
	return date;
};

const toTimeValue = (date: Date): string => {
	const hour = date.getHours().toString().padStart(2, '0');
	const minute = date.getMinutes().toString().padStart(2, '0');
	return `${hour}:${minute}`;
};

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

export function TimeInput({ value, onChange, onClose, error }: TimeInputProps) {
	const [open, setOpen] = React.useState(false);

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			setOpen(next);
			if (!next) {
				onClose?.();
			}
		},
		[onClose],
	);

	const parsed = React.useMemo(() => parseTimeValue(value), [value]);
	const [hour, setHour] = React.useState<string>(() => {
		const current = parsed?.getHours() ?? 0;
		return (current % 12 || 12).toString();
	});
	const [minute, setMinute] = React.useState<number>(() => parsed?.getMinutes() ?? 0);
	const [period, setPeriod] = React.useState<'AM' | 'PM'>(() =>
		parsed && parsed.getHours() < 12 ? 'AM' : 'PM',
	);

	React.useEffect(() => {
		if (open && parsed) {
			const currentHours = parsed.getHours();
			setHour((currentHours % 12 || 12).toString());
			setMinute(parsed.getMinutes());
			setPeriod(currentHours < 12 ? 'AM' : 'PM');
		}
	}, [open, parsed]);

	const handleTimeSelect = (type: 'hour' | 'minute' | 'period', val: string) => {
		const baseDate = parsed ? new Date(parsed) : new Date(0, 0, 0, 9, 0, 0);
		if (type === 'hour') {
			const hourValue = parseInt(val, 10);
			if (period === 'PM' && hourValue !== 12) {
				baseDate.setHours(hourValue + 12);
			} else if (period === 'AM' && hourValue === 12) {
				baseDate.setHours(0);
			} else {
				baseDate.setHours(hourValue);
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
		onChange(toTimeValue(baseDate));
	};

	const displayValue = parsed ? toTimeValue(parsed) : '';

	return (
		<Popover open={open} onOpenChange={handleOpenChange} modal={true}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className={cn(
						'flex items-center text-sm w-full justify-between',
						!value && 'text-muted-foreground',
						error && 'border-destructive',
					)}>
					<span className="flex items-center font-normal gap-2">
						<Clock className="size-4" />
						{displayValue || '--:--'}
					</span>
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
