'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ActionButtonProps {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	size?: 'default' | 'sm' | 'lg' | 'icon';
	disabled?: boolean;
	className?: string;
}

export function ActionButton({
	icon: Icon,
	label,
	onClick,
	variant = 'secondary',
	size = 'sm',
	disabled = false,
	className,
}: ActionButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span>
					<Button
						variant={variant}
						size={size}
						className={className}
						disabled={disabled}
						onClick={onClick}>
						<Icon className="size-4" />
					</Button>
				</span>
			</TooltipTrigger>
			<TooltipContent>
				<p>{label}</p>
			</TooltipContent>
		</Tooltip>
	);
}
