'use client';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerWithRangeProps {
	value?: DateRange;
	onChange?: (range: DateRange | undefined) => void;
	className?: string;
}

export function DatePickerWithRange({ value, onChange, className }: DatePickerWithRangeProps) {
	const [internalValue, setInternalValue] = React.useState<DateRange | undefined>({
		from: new Date(new Date().getFullYear(), 0, 20),
		to: new Date(new Date().getFullYear(), 0, 20),
	});

	const selectedRange = value ?? internalValue;

	function handleSelect(range: DateRange | undefined) {
		setInternalValue(range);
		onChange?.(range);
	}

	return (
		<div className={className}>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" className="justify-start px-2.5 font-normal">
						<CalendarIcon />
						{selectedRange?.from ? (
							selectedRange.to ? (
								<>
									{format(selectedRange.from, 'LLL dd, y')} -{' '}
									{format(selectedRange.to, 'LLL dd, y')}
								</>
							) : (
								format(selectedRange.from, 'LLL dd, y')
							)
						) : (
							<span>Pick a date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="range"
						defaultMonth={selectedRange?.from}
						selected={selectedRange}
						onSelect={handleSelect}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
