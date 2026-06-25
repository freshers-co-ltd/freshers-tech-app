'use client';

import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
	src?: string | null;
	fallbackName?: string | null;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	className?: string;
}

const sizeClasses = {
	sm: 'size-8',
	md: 'size-10',
	lg: 'size-14 sm:size-16',
	xl: 'size-24 md:size-32',
};

const fontSizeClasses = {
	sm: 'text-xs',
	md: 'text-base',
	lg: 'text-2xl',
	xl: 'text-4xl md:text-5xl',
};

export function UserAvatar({ src, fallbackName, size = 'md', className }: UserAvatarProps) {
	const signedUrl = useSignedUrl(src, 'avatars');
	const firstChar = fallbackName?.charAt(0) ?? '';
	const isValidInitial = /^[A-Za-z]$/.test(firstChar);

	return (
		<Avatar className={cn(sizeClasses[size], className)}>
			<AvatarImage src={signedUrl ?? undefined} className="object-cover" />
			<AvatarFallback className={cn(fontSizeClasses[size], 'font-medium bg-muted')}>
				{isValidInitial ? firstChar.toUpperCase() : <User className="size-1/2" />}
			</AvatarFallback>
		</Avatar>
	);
}
