import { Camera, Loader2, X } from 'lucide-react';
import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/features/auth/authService';
import {
	DEFAULT_FILE_SIZE_LIMIT,
	getBucketConfig,
	mediaService,
	mimeTypesToAccept,
} from '@/lib/mediaService';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

export function AccountAvatar() {
	const { profile, user, refreshProfile } = useAuth();
	const [isUploading, setIsUploading] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	const [bucketConfig, setBucketConfig] = useState({
		maxSize: DEFAULT_FILE_SIZE_LIMIT,
		accept: { 'image/*': [] } as Record<string, string[]>,
	});

	const fetchBucketConfig = useCallback(async () => {
		const config = await getBucketConfig('avatars');
		setBucketConfig({
			maxSize: config.fileSizeLimit,
			accept:
				config.allowedMimeTypes.length > 0
					? mimeTypesToAccept(config.allowedMimeTypes)
					: { 'image/*': [] },
		});
	}, []);

	useEffect(() => {
		fetchBucketConfig();
	}, [fetchBucketConfig]);

	const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !user?.id) {
			return;
		}

		if (file.size > bucketConfig.maxSize) {
			toast.error(
				`File size exceeds the ${Math.round(bucketConfig.maxSize / (1024 * 1024))} MB limit`,
			);
			e.target.value = '';
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
				await authService.updateUserMetadata({ avatar_url: publicUrl });
				await refreshProfile();
				toast.success('Avatar updated');
			}
		}
		setIsUploading(false);
	};

	const handleRemove = async () => {
		if (!user?.id || !profile?.avatar_url) {
			return;
		}
		setIsRemoving(true);
		const { data: files } = await supabase.storage.from('avatars').list(user.id);
		if (files && files.length > 0) {
			const pathsToDelete = files.map((f) => `${user.id}/${f.name}`);
			await supabase.storage.from('avatars').remove(pathsToDelete);
		}
		const { error: updateError } = await authService.updateProfile(user.id, {
			avatar_url: null,
		});
		if (updateError) {
			toast.error(updateError);
		} else {
			await authService.updateUserMetadata({ avatar_url: null });
			await refreshProfile();
			toast.success('Avatar removed');
		}
		setIsRemoving(false);
	};

	return (
		<div className="flex flex-col items-center text-center">
			<div className="relative">
				<UserAvatar src={profile?.avatar_url} fallbackName={profile?.full_name} size="xl" />
				{profile?.avatar_url && (
					<Button
						variant="destructive"
						size="icon"
						className="absolute top-0 left-0 size-7 rounded-full shadow-sm hover:scale-100 active:scale-100"
						onClick={handleRemove}
						disabled={isRemoving}>
						<X className="size-4" />
					</Button>
				)}
				<label
					className={cn(
						'absolute bottom-0 right-0 p-2 bg-background border border-border rounded-full shadow-sm cursor-pointer hover:bg-accent transition-colors',
						(isUploading || isRemoving) && 'pointer-events-none',
					)}>
					{isUploading ? (
						<Loader2 className="size-4 animate-spin text-muted-foreground" />
					) : (
						<Camera className="size-4 text-muted-foreground" />
					)}
					<input
						type="file"
						className="hidden"
						accept={Object.keys(bucketConfig.accept).join(',')}
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
