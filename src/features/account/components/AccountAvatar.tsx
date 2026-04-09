import { type ChangeEvent, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/features/auth/authService';
import { mediaService } from '@/lib/mediaService';
import { useAuth } from '@/features/auth/AuthContext';

export function AccountAvatar() {
	const { profile, user, refreshProfile } = useAuth();
	const [isUploading, setIsUploading] = useState(false);

	const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !user?.id) {
			return;
		}
		setIsUploading(true);
		const { path, error } = await mediaService.uploadMedia(user.id, file, 'avatars');
		if (error) {
			toast.error(error);
		} else if (path) {
			const publicUrl = mediaService.getMediaUrl(path, 'avatars');
			const { error: updateError } = await authService.updateProfile(user.id, {
				avatar_url: publicUrl,
			});

			if (updateError) {
				toast.error(updateError);
			} else {
				await supabase.auth.updateUser({
					data: { avatar_url: publicUrl },
				});
				await refreshProfile();
				toast.success('Avatar updated');
			}
		}
		setIsUploading(false);
	};

	return (
		<div className="flex flex-col items-center text-center">
			<div className="relative">
				<Avatar className="size-24 md:size-32">
					<AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
					<AvatarFallback className="text-2xl font-medium bg-muted">
						{profile?.full_name?.charAt(0) || '?'}
					</AvatarFallback>
				</Avatar>
				<label
					className={cn(
						'absolute bottom-0 right-0 p-2 bg-background border border-border rounded-full shadow-sm cursor-pointer hover:bg-accent transition-colors',
						isUploading && 'pointer-events-none',
					)}>
					{isUploading ? (
						<Loader2 className="size-4 animate-spin text-muted-foreground" />
					) : (
						<Camera className="size-4 text-muted-foreground" />
					)}
					<input
						type="file"
						className="hidden"
						accept="image/*"
						onChange={handleUpload}
						disabled={isUploading}
					/>
				</label>
			</div>
			<div className="mt-4">
				<h3 className="text-lg font-semibold">{profile?.full_name}</h3>
			</div>
		</div>
	);
}
