import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';

export type MediaType = Database['public']['Enums']['media_type'];
export type StorageBucket = Database['storage']['Tables']['buckets']['Row']['id'];

export const DEFAULT_FILE_SIZE_LIMIT = 50 * 1024 * 1024;

export interface BucketConfig {
	fileSizeLimit: number;
	allowedMimeTypes: string[];
}

const BUCKET_CONFIGS: Record<string, BucketConfig> = {
	avatars: { fileSizeLimit: 50 * 1024 * 1024, allowedMimeTypes: ['image/png', 'image/jpeg'] },
	'property-media': {
		fileSizeLimit: 50 * 1024 * 1024,
		allowedMimeTypes: ['image/png', 'image/jpeg'],
	},
	'cleaning-media': {
		fileSizeLimit: 50 * 1024 * 1024,
		allowedMimeTypes: ['image/*', 'video/*'],
	},
};

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

const EXTENSION_MIME_MAP: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	mp4: 'video/mp4',
	mov: 'video/quicktime',
	webm: 'video/webm',
	avi: 'video/x-msvideo',
	mkv: 'video/x-matroska',
};

export function mimeTypesToAccept(mimeTypes: string[]): Record<string, string[]> {
	if (mimeTypes.length === 0) {
		return { '*/*': [] };
	}
	return Object.fromEntries(mimeTypes.map((mime) => [mime, MIME_EXTENSION_MAP[mime] ?? []]));
}

export function getBucketConfig(bucketName: string): BucketConfig {
	return (
		BUCKET_CONFIGS[bucketName] ?? {
			fileSizeLimit: DEFAULT_FILE_SIZE_LIMIT,
			allowedMimeTypes: [],
		}
	);
}

export const mediaService = {
	async listFiles(
		folderId: string,
		bucket: StorageBucket,
	): Promise<{ data: { name: string }[] | null; error: unknown }> {
		return supabase.storage.from(bucket).list(folderId);
	},

	getMediaUrl(path: string | null, _bucket: StorageBucket): string {
		if (!path || path === 'Placeholder' || path.trim() === '') {
			return '/placeholder-image.webp';
		}

		if (path.startsWith('http') || path.startsWith('blob:')) {
			return path;
		}

		return '/placeholder-image.webp';
	},

	async getSignedUrl(
		path: string,
		bucket: StorageBucket,
		expiresIn = 3600,
	): Promise<string | null> {
		const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
		if (error || !data) {
			return null;
		}
		return data.signedUrl;
	},

	async uploadMedia(
		folderId: string,
		file: File,
		bucket: StorageBucket,
	): Promise<{ path: string | null; error: string | null }> {
		const lastDotIndex = file.name.lastIndexOf('.');
		const fileExt = lastDotIndex !== -1 ? file.name.slice(lastDotIndex + 1).toLowerCase() : '';
		const fileName = `${crypto.randomUUID()}${fileExt ? `.${fileExt}` : ''}`;
		const filePath = `${folderId}/${fileName}`;

		const contentType = file.type || (EXTENSION_MIME_MAP[fileExt] ?? undefined);

		const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
			contentType,
		});

		if (uploadError) {
			console.error(`[mediaService] Upload failed for ${filePath}:`, uploadError.message);
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
