import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';

export type MediaType = Database['public']['Enums']['media_type'];
export type StorageBucket = Database['storage']['Tables']['buckets']['Row']['id'];

export const DEFAULT_FILE_SIZE_LIMIT = 50 * 1024 * 1024;

export interface BucketConfig {
	fileSizeLimit: number;
	allowedMimeTypes: string[];
}

const bucketConfigCache = new Map<string, BucketConfig>();

const MIME_EXTENSION_MAP: Record<string, string[]> = {
	'image/png': ['.png'],
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/gif': ['.gif'],
	'image/webp': ['.webp'],
	'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
	'video/*': ['.mp4', '.mov', '.avi', '.webm'],
	'video/mp4': ['.mp4'],
	'video/quicktime': ['.mov'],
};

export function mimeTypesToAccept(mimeTypes: string[]): Record<string, string[]> {
	if (mimeTypes.length === 0) {
		return { '*/*': [] };
	}
	return Object.fromEntries(mimeTypes.map((mime) => [mime, MIME_EXTENSION_MAP[mime] ?? []]));
}

export async function getBucketConfig(bucketName: string): Promise<BucketConfig> {
	const cachedConfig = bucketConfigCache.get(bucketName);
	if (cachedConfig) {
		return cachedConfig;
	}
	const { data, error } = await supabase.storage.getBucket(bucketName);
	if (error) {
		console.error(`Failed to fetch bucket config for "${bucketName}":`, error);
		return { fileSizeLimit: DEFAULT_FILE_SIZE_LIMIT, allowedMimeTypes: [] };
	}
	const config: BucketConfig = {
		fileSizeLimit: data.file_size_limit ?? DEFAULT_FILE_SIZE_LIMIT,
		allowedMimeTypes: data.allowed_mime_types ?? [],
	};
	bucketConfigCache.set(bucketName, config);
	return config;
}

export const mediaService = {
	async listFiles(
		folderId: string,
		bucket: StorageBucket,
	): Promise<{ data: { name: string }[] | null; error: unknown }> {
		return supabase.storage.from(bucket).list(folderId);
	},
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

	async deleteMedia(
		path: string | string[],
		bucket: StorageBucket,
	): Promise<{ error: string | null }> {
		const paths = Array.isArray(path) ? path : [path];
		const { error } = await supabase.storage.from(bucket).remove(paths);
		if (error) {
			return { error: error.message };
		}
		return { error: null };
	},
};
