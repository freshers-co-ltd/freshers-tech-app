import { supabase } from '@/lib/supabaseClient';

export type StorageBucket = 'property-media' | 'cleaning-media';

export const mediaService = {
	getMediaUrl(path: string | null, bucket: StorageBucket): string {
		if (!path || path === 'Placeholder' || path.trim() === '') {
			return '/placeholder-image.webp';
		}

		if (path.startsWith('http') || path.startsWith('blob:')) {
			return path;
		}

		const { data } = supabase.storage.from(bucket).getPublicUrl(path);

		return data.publicUrl;
	},

	async uploadMedia(
		userId: string,
		file: File,
		bucket: StorageBucket,
	): Promise<{ path: string | null; error: string | null }> {
		const fileExt = file.name.split('.').pop();
		const fileName = `${crypto.randomUUID()}.${fileExt}`;
		const filePath = `${userId}/${fileName}`;

		const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

		if (uploadError) {
			return { path: null, error: uploadError.message };
		}

		return { path: filePath, error: null };
	},
};
