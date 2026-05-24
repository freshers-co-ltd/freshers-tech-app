'use client';

import type { Property } from '@/features/properties/types';
import type { Database } from '@/lib/database.types';

export type CleaningDetails = Database['public']['Tables']['cleanings']['Row'];
export type CleaningInsert = Database['public']['Tables']['cleanings']['Insert'];
export type CleaningUpdate = Database['public']['Tables']['cleanings']['Update'];
export type CleaningStatus = Database['public']['Enums']['cleaning_status'];
export type TaskInsert = Database['public']['Tables']['cleaning_tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['cleaning_tasks']['Update'];
export type EvidenceInsert = Database['public']['Tables']['evidence_media']['Insert'];
export type ReportInsert = Database['public']['Tables']['cleaning_reports']['Insert'];
export type StandardTask = Database['public']['Tables']['standard_tasks']['Row'];

export type CleaningTask = {
	id: string;
	description: string;
	is_completed: boolean;
	is_custom: boolean;
};

export const CLEANING_STATUS: {
	readonly DRAFT: CleaningStatus;
	readonly REQUESTED: CleaningStatus;
	readonly CONFIRMED: CleaningStatus;
	readonly IN_PROGRESS: CleaningStatus;
	readonly COMPLETED: CleaningStatus;
	readonly CANCELLED: CleaningStatus;
} = {
	DRAFT: 'draft',
	REQUESTED: 'requested',
	CONFIRMED: 'confirmed',
	IN_PROGRESS: 'in_progress',
	COMPLETED: 'completed',
	CANCELLED: 'cancelled',
};

export const STATUS_GROUPS = {
	ALL: Object.values(CLEANING_STATUS),
	CAN_CANCEL: [CLEANING_STATUS.DRAFT, CLEANING_STATUS.REQUESTED],
	CAN_EDIT: [CLEANING_STATUS.DRAFT, CLEANING_STATUS.REQUESTED, CLEANING_STATUS.CONFIRMED],
	CAN_EDIT_RESTRICTED: [CLEANING_STATUS.CONFIRMED],
	CLEANER_VIEW: [
		CLEANING_STATUS.CONFIRMED,
		CLEANING_STATUS.IN_PROGRESS,
		CLEANING_STATUS.COMPLETED,
		CLEANING_STATUS.CANCELLED,
	],
};

export interface CleaningRequest extends CleaningDetails {
	tasks: CleaningTask[];
	property: Property | null;
	cleaner?: {
		full_name: string;
		avatar_url: string | null;
	} | null;
	evidence?: {
		id: string;
		media_url: string;
		type: Database['public']['Enums']['media_type'];
	}[];
	report?: {
		broken_items_report: string | null;
		low_supplies_report: string | null;
		created_at: string;
	} | null;
}

export interface CreateCleaningRequestPayload {
	property_id: string;
	custom_tasks: string[];
	information: string;
	scheduled_start: string;
}

export interface UpdateCleaningRequestPayload {
	custom_tasks: string[];
	information: string;
	scheduled_start: string;
}

interface RawCleaningRequestQueryResult extends CleaningDetails {
	cleaning_tasks: CleaningTask[];
	property: Property | Property[] | null;
	cleaner:
		| { full_name: string; avatar_url: string | null }
		| { full_name: string; avatar_url: string | null }[]
		| null;
	evidence: { id: string; media_url: string; type: Database['public']['Enums']['media_type'] }[];
	cleaning_reports:
		| {
				broken_items_report: string | null;
				low_supplies_report: string | null;
				created_at: string;
		  }
		| {
				broken_items_report: string | null;
				low_supplies_report: string | null;
				created_at: string;
		  }[]
		| null;
}

export interface CleanerPayConfig {
	hourly_rate: number;
	target_times: {
		studio: number;
		'1_bed': number;
		'2_bed': number;
		'3_bed': number;
		'4_bed': number;
	};
	bathroom_time: number;
}

export type { RawCleaningRequestQueryResult };
