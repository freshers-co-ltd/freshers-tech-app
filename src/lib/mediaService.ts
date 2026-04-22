import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';

export type MediaType = Database['public']['Enums']['media_type'];
export type StorageBucket = Database['storage']['Tables']['buckets']['Row']['id'];

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
		folderId: string,
		file: File,
		bucket: StorageBucket,
	): Promise<{ path: string | null; error: string | null }> {
		const lastDotIndex = file.name.lastIndexOf('.');
		const fileExt = lastDotIndex !== -1 ? file.name.slice(lastDotIndex + 1) : '';
		const fileName = `${crypto.randomUUID()}${fileExt ? `.${fileExt}` : ''}`;
		const filePath = `${folderId}/${fileName}`;

		const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

		if (uploadError) {
			return { path: null, error: uploadError.message };
		}

		return { path: filePath, error: null };
	},
};
