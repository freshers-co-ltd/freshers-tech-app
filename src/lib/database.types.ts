export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			audit_logs: {
				Row: {
					action_type: string;
					actor_id: string | null;
					created_at: string | null;
					id: string;
					new_data: Json | null;
					old_data: Json | null;
					target_id: string;
					target_table: string;
					updated_at: string | null;
				};
				Insert: {
					action_type: string;
					actor_id?: string | null;
					created_at?: string | null;
					id?: string;
					new_data?: Json | null;
					old_data?: Json | null;
					target_id: string;
					target_table: string;
					updated_at?: string | null;
				};
				Update: {
					action_type?: string;
					actor_id?: string | null;
					created_at?: string | null;
					id?: string;
					new_data?: Json | null;
					old_data?: Json | null;
					target_id?: string;
					target_table?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			cleaner_pay_config: {
				Row: {
					host_multipliers: Json;
					hourly_rate: number;
					id: number;
					target_times: Json;
					updated_at: string | null;
				};
				Insert: {
					host_multipliers?: Json;
					hourly_rate?: number;
					id?: number;
					target_times?: Json;
					updated_at?: string | null;
				};
				Update: {
					host_multipliers?: Json;
					hourly_rate?: number;
					id?: number;
					target_times?: Json;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			cleaning_reports: {
				Row: {
					broken_items_report: string | null;
					cleaner_id: string;
					cleaning_id: string;
					created_at: string;
					deleted_at: string | null;
					id: string;
					low_supplies_report: string | null;
				};
				Insert: {
					broken_items_report?: string | null;
					cleaner_id: string;
					cleaning_id: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					low_supplies_report?: string | null;
				};
				Update: {
					broken_items_report?: string | null;
					cleaner_id?: string;
					cleaning_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					low_supplies_report?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'cleaning_reports_cleaner_id_fkey';
						columns: ['cleaner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cleaning_reports_cleaner_id_fkey';
						columns: ['cleaner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles_public';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cleaning_reports_cleaning_id_fkey';
						columns: ['cleaning_id'];
						isOneToOne: true;
						referencedRelation: 'cleanings';
						referencedColumns: ['id'];
					},
				];
			};
			cleaning_tasks: {
				Row: {
					cleaning_id: string;
					created_at: string;
					deleted_at: string | null;
					description: string;
					id: string;
					is_completed: boolean;
					is_custom: boolean;
				};
				Insert: {
					cleaning_id: string;
					created_at?: string;
					deleted_at?: string | null;
					description: string;
					id?: string;
					is_completed?: boolean;
					is_custom?: boolean;
				};
				Update: {
					cleaning_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					description?: string;
					id?: string;
					is_completed?: boolean;
					is_custom?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: 'cleaning_tasks_cleaning_id_fkey';
						columns: ['cleaning_id'];
						isOneToOne: false;
						referencedRelation: 'cleanings';
						referencedColumns: ['id'];
					},
				];
			};
			cleanings: {
				Row: {
					cleaner_id: string | null;
					cleaner_pay: number | null;
					clock_in_time: string | null;
					clock_out_time: string | null;
					created_at: string;
					deleted_at: string | null;
					host_id: string;
					id: string;
					instructions: string | null;
					property_id: string;
					scheduled_start: string;
					service_cost: number | null;
					status: Database['public']['Enums']['cleaning_status'];
					stocks_included: boolean;
					updated_at: string;
				};
				Insert: {
					cleaner_id?: string | null;
					cleaner_pay?: number | null;
					clock_in_time?: string | null;
					clock_out_time?: string | null;
					created_at?: string;
					deleted_at?: string | null;
					host_id: string;
					id?: string;
					instructions?: string | null;
					property_id: string;
					scheduled_start: string;
					service_cost?: number | null;
					status?: Database['public']['Enums']['cleaning_status'];
					stocks_included?: boolean;
					updated_at?: string;
				};
				Update: {
					cleaner_id?: string | null;
					cleaner_pay?: number | null;
					clock_in_time?: string | null;
					clock_out_time?: string | null;
					created_at?: string;
					deleted_at?: string | null;
					host_id?: string;
					id?: string;
					instructions?: string | null;
					property_id?: string;
					scheduled_start?: string;
					service_cost?: number | null;
					status?: Database['public']['Enums']['cleaning_status'];
					stocks_included?: boolean;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cleanings_cleaner_id_fkey';
						columns: ['cleaner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cleanings_cleaner_id_fkey';
						columns: ['cleaner_id'];
						isOneToOne: false;
						referencedRelation: 'profiles_public';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cleanings_host_id_fkey';
						columns: ['host_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cleanings_host_id_fkey';
						columns: ['host_id'];
						isOneToOne: false;
						referencedRelation: 'profiles_public';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'cleanings_property_id_fkey';
						columns: ['property_id'];
						isOneToOne: false;
						referencedRelation: 'properties';
						referencedColumns: ['id'];
					},
				];
			};
			evidence_media: {
				Row: {
					cleaning_id: string;
					created_at: string;
					deleted_at: string | null;
					id: string;
					media_url: string;
					type: Database['public']['Enums']['media_type'];
					uploader_id: string;
				};
				Insert: {
					cleaning_id: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					media_url: string;
					type?: Database['public']['Enums']['media_type'];
					uploader_id: string;
				};
				Update: {
					cleaning_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					media_url?: string;
					type?: Database['public']['Enums']['media_type'];
					uploader_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'evidence_media_cleaning_id_fkey';
						columns: ['cleaning_id'];
						isOneToOne: false;
						referencedRelation: 'cleanings';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'evidence_media_uploader_id_fkey';
						columns: ['uploader_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'evidence_media_uploader_id_fkey';
						columns: ['uploader_id'];
						isOneToOne: false;
						referencedRelation: 'profiles_public';
						referencedColumns: ['id'];
					},
				];
			};
			notification_preferences: {
				Row: {
					created_at: string | null;
					enabled: boolean | null;
					push_enabled: boolean | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					enabled?: boolean | null;
					push_enabled?: boolean | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					enabled?: boolean | null;
					push_enabled?: boolean | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			notifications: {
				Row: {
					created_at: string;
					data: Json | null;
					id: string;
					is_read: boolean | null;
					link: string | null;
					message: string;
					title: string;
					type: Database['public']['Enums']['notification_type'];
					user_id: string;
				};
				Insert: {
					created_at?: string;
					data?: Json | null;
					id?: string;
					is_read?: boolean | null;
					link?: string | null;
					message: string;
					title: string;
					type: Database['public']['Enums']['notification_type'];
					user_id: string;
				};
				Update: {
					created_at?: string;
					data?: Json | null;
					id?: string;
					is_read?: boolean | null;
					link?: string | null;
					message?: string;
					title?: string;
					type?: Database['public']['Enums']['notification_type'];
					user_id?: string;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					base_price_per_cleaning: number | null;
					email: string | null;
					full_name: string | null;
					id: string;
					is_verified: boolean | null;
					last_seen_at: string | null;
					role: Database['public']['Enums']['user_role'];
					updated_at: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					base_price_per_cleaning?: number | null;
					email?: string | null;
					full_name?: string | null;
					id: string;
					is_verified?: boolean | null;
					last_seen_at?: string | null;
					role?: Database['public']['Enums']['user_role'];
					updated_at?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					base_price_per_cleaning?: number | null;
					email?: string | null;
					full_name?: string | null;
					id?: string;
					is_verified?: boolean | null;
					last_seen_at?: string | null;
					role?: Database['public']['Enums']['user_role'];
					updated_at?: string | null;
				};
				Relationships: [];
			};
			properties: {
				Row: {
					address_line_1: string;
					address_line_2: string | null;
					bathrooms: number;
					bedrooms: number;
					created_at: string;
					deleted_at: string | null;
					extra_images_urls: string[] | null;
					host_id: string;
					id: string;
					main_image_url: string;
					postcode: string;
					town_city: string;
					type: Database['public']['Enums']['property_type'];
					updated_at: string;
				};
				Insert: {
					address_line_1: string;
					address_line_2?: string | null;
					bathrooms?: number;
					bedrooms?: number;
					created_at?: string;
					deleted_at?: string | null;
					extra_images_urls?: string[] | null;
					host_id: string;
					id?: string;
					main_image_url: string;
					postcode: string;
					town_city: string;
					type?: Database['public']['Enums']['property_type'];
					updated_at?: string;
				};
				Update: {
					address_line_1?: string;
					address_line_2?: string | null;
					bathrooms?: number;
					bedrooms?: number;
					created_at?: string;
					deleted_at?: string | null;
					extra_images_urls?: string[] | null;
					host_id?: string;
					id?: string;
					main_image_url?: string;
					postcode?: string;
					town_city?: string;
					type?: Database['public']['Enums']['property_type'];
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'properties_host_id_fkey';
						columns: ['host_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'properties_host_id_fkey';
						columns: ['host_id'];
						isOneToOne: false;
						referencedRelation: 'profiles_public';
						referencedColumns: ['id'];
					},
				];
			};
			push_subscriptions: {
				Row: {
					created_at: string | null;
					id: string;
					subscription: Json;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					subscription: Json;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					subscription?: Json;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			standard_tasks: {
				Row: {
					created_at: string;
					description: string;
					id: string;
					is_active: boolean;
				};
				Insert: {
					created_at?: string;
					description: string;
					id?: string;
					is_active?: boolean;
				};
				Update: {
					created_at?: string;
					description?: string;
					id?: string;
					is_active?: boolean;
				};
				Relationships: [];
			};
		};
		Views: {
			platform_stats: {
				Row: {
					avg_completion_hours: number | null;
					broken_items_mtd: number | null;
					calculated_at: string | null;
					cleanings_in_progress: number | null;
					completed_cleanings_mtd: number | null;
					completed_cleanings_ytd: number | null;
					low_supplies_mtd: number | null;
					total_cleaners: number | null;
					total_cleanings_mtd: number | null;
					total_hosts: number | null;
					total_properties: number | null;
				};
				Relationships: [];
			};
			profiles_public: {
				Row: {
					avatar_url: string | null;
					full_name: string | null;
					id: string | null;
					role: Database['public']['Enums']['user_role'] | null;
				};
				Insert: {
					avatar_url?: string | null;
					full_name?: string | null;
					id?: string | null;
					role?: Database['public']['Enums']['user_role'] | null;
				};
				Update: {
					avatar_url?: string | null;
					full_name?: string | null;
					id?: string | null;
					role?: Database['public']['Enums']['user_role'] | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			admin_assign_cleaner: {
				Args: { p_cleaner_id: string; p_cleaning_id: string };
				Returns: undefined;
			};
			admin_ban_user: {
				Args: { is_banned: boolean; target_user_id: string };
				Returns: undefined;
			};
			admin_create_cleaning_for_host: {
				Args: {
					p_custom_tasks?: string[];
					p_host_id: string;
					p_instructions?: string;
					p_property_id: string;
					p_scheduled_start: string;
					p_stocks_included?: boolean;
				};
				Returns: string;
			};
			admin_get_active_cleanings: {
				Args: never;
				Returns: {
					count: number;
					status: string;
				}[];
			};
			admin_get_all_cleanings: {
				Args: {
					p_cleaner_id?: string;
					p_host_id?: string;
					p_limit?: number;
					p_page?: number;
					p_search?: string;
					p_sort_direction?: string;
					p_sort_field?: string;
					p_status?: string;
				};
				Returns: {
					cleaner_id: string;
					cleaner_name: string;
					cleaner_pay: number;
					clock_in_time: string;
					clock_out_time: string;
					created_at: string;
					deleted_at: string;
					host_id: string;
					host_name: string;
					id: string;
					instructions: string;
					property_address: string;
					property_id: string;
					property_postcode: string;
					property_town_city: string;
					scheduled_start: string;
					service_cost: number;
					status: string;
					stocks_included: boolean;
					updated_at: string;
				}[];
			};
			admin_get_audit_logs: {
				Args: {
					p_action_type?: string;
					p_date_from?: string;
					p_date_to?: string;
					p_limit?: number;
					p_page?: number;
					p_target_table?: string;
				};
				Returns: {
					action_type: string;
					actor_id: string;
					actor_name: string;
					created_at: string;
					id: string;
					new_data: Json;
					old_data: Json;
					target_id: string;
					target_table: string;
				}[];
			};
			admin_get_available_cleaners: {
				Args: never;
				Returns: {
					avatar_url: string;
					avg_completion_hours: number;
					current_assignments: number;
					full_name: string;
					id: string;
				}[];
			};
			admin_get_cleaner_detail: {
				Args: { p_cleaner_id: string };
				Returns: {
					assigned_cleanings: Json;
					avatar_url: string;
					banned_until: string;
					cleaner_stats: Json;
					created_at: string;
					email: string;
					full_name: string;
					id: string;
					is_verified: boolean;
					last_sign_in_at: string;
					last_sign_in_text: string;
					role: string;
				}[];
			};
			admin_get_cleaning_status_breakdown: {
				Args: { p_end_date?: string; p_start_date?: string };
				Returns: {
					count: number;
					status: string;
				}[];
			};
			admin_get_cleanings_count: {
				Args: {
					p_cleaner_id?: string;
					p_host_id?: string;
					p_search?: string;
					p_status?: string;
				};
				Returns: number;
			};
			admin_get_cleanings_over_time: {
				Args: { p_end_date?: string; p_start_date?: string };
				Returns: {
					cleanings: number;
					date: string;
				}[];
			};
			admin_get_host_detail: {
				Args: {
					p_host_id: string;
					p_properties_sort_direction?: string;
					p_properties_sort_field?: string;
				};
				Returns: {
					avatar_url: string;
					banned_until: string;
					base_price_per_cleaning: number;
					cleaning_stats: Json;
					cleanings: Json;
					created_at: string;
					email: string;
					full_name: string;
					id: string;
					is_verified: boolean;
					last_sign_in_at: string;
					last_sign_in_text: string;
					properties: Json;
					role: string;
				}[];
			};
			admin_get_monthly_stats: {
				Args: { p_months?: number };
				Returns: {
					cleanings: number;
					gross: number;
					month: string;
					net: number;
					revenue: number;
				}[];
			};
			admin_get_platform_stats_trend: {
				Args: { p_period_days?: number };
				Returns: {
					completed_change: number;
					completed_current: number;
					completed_previous: number;
					properties_change: number;
					total_change: number;
					total_cleaners: number;
					total_current: number;
					total_hosts: number;
					total_previous: number;
					total_properties: number;
				}[];
			};
			admin_get_revenue_metrics: {
				Args: { p_months?: number };
				Returns: {
					avg_completion_hours: number;
					cancelled_count: number;
					completed_change_pct: number;
					completed_count: number;
					gross_revenue_change_pct: number;
					gross_revenue_current: number;
					gross_revenue_last_month: number;
					in_progress_count: number;
					net_revenue_change_pct: number;
					net_revenue_current: number;
					net_revenue_last_month: number;
					pending_count: number;
					revenue_change_pct: number;
					revenue_current: number;
					revenue_last_month: number;
				}[];
			};
			admin_get_revenue_over_time: {
				Args: { p_end_date?: string; p_start_date?: string };
				Returns: {
					date: string;
					gross: number;
					net: number;
					revenue: number;
				}[];
			};
			admin_get_standard_tasks: {
				Args: never;
				Returns: {
					created_at: string;
					description: string;
					id: string;
					is_active: boolean;
				}[];
			};
			admin_get_user_growth: {
				Args: { p_end_date?: string; p_start_date?: string };
				Returns: {
					cleaners: number;
					date: string;
					hosts: number;
				}[];
			};
			admin_get_user_growth_by_month: {
				Args: { p_months?: number };
				Returns: {
					cleaners: number;
					hosts: number;
					month: string;
				}[];
			};
			admin_get_user_stats: {
				Args: never;
				Returns: {
					admins_count: number;
					banned_users: number;
					cleaners_count: number;
					hosts_count: number;
					new_users_last_month: number;
					new_users_this_month: number;
					online_now: number;
					recently_online: number;
					total_users: number;
				}[];
			};
			admin_get_users: {
				Args: {
					p_limit?: number;
					p_page?: number;
					p_role?: string;
					p_search?: string;
					p_sort_direction?: string;
					p_sort_field?: string;
				};
				Returns: {
					avatar_url: string;
					banned_until: string;
					completed_cleanings: number;
					created_at: string;
					email: string;
					full_name: string;
					id: string;
					is_online: boolean;
					is_verified: boolean;
					last_seen_at: string;
					last_sign_in_at: string;
					last_sign_in_text: string;
					role: string;
					total_cleanings: number;
					total_properties: number;
					total_user_count: number;
				}[];
			};
			admin_get_users_count: {
				Args: { p_role?: string; p_search?: string };
				Returns: number;
			};
			admin_unassign_cleaner: {
				Args: { p_cleaning_id: string };
				Returns: undefined;
			};
			admin_update_host_base_price: {
				Args: { p_base_price: number; p_host_id: string };
				Returns: undefined;
			};
			admin_update_standard_tasks: {
				Args: { p_tasks: Json; p_tasks_to_delete: string[] };
				Returns: undefined;
			};
			calculate_service_cost: {
				Args: {
					p_base_price: number;
					p_bedrooms: number;
					p_host_multipliers?: Json;
					p_property_type: string;
					p_stocks_included: boolean;
				};
				Returns: number;
			};
			create_cleaning_request: {
				Args: {
					p_custom_tasks: string[];
					p_instructions: string;
					p_property_id: string;
					p_scheduled_start: string;
					p_stocks_included?: boolean;
				};
				Returns: string;
			};
			create_notification_for_user: {
				Args: {
					p_data?: Json;
					p_link?: string;
					p_message: string;
					p_title: string;
					p_type: Database['public']['Enums']['notification_type'];
					p_user_id: string;
				};
				Returns: string;
			};
			get_cleaner_pay_config: {
				Args: never;
				Returns: {
					host_multipliers: Json;
					hourly_rate: number;
					target_times: Json;
					updated_at: string;
				}[];
			};
			get_or_create_notification_preferences: { Args: never; Returns: string };
			host_cancel_cleaning: {
				Args: { p_cleaning_id: string };
				Returns: undefined;
			};
			is_not_banned: { Args: never; Returns: boolean };
			notify_cleaning_reminders: { Args: never; Returns: undefined };
			notify_cleaning_starting_soon: { Args: never; Returns: undefined };
			notify_missed_clockin: { Args: never; Returns: undefined };
			soft_delete_cleaning: {
				Args: { p_cleaning_id: string };
				Returns: undefined;
			};
			soft_delete_cleaning_report: {
				Args: { p_report_id: string };
				Returns: undefined;
			};
			soft_delete_cleaning_task: {
				Args: { p_task_id: string };
				Returns: undefined;
			};
			soft_delete_evidence_media: {
				Args: { p_evidence_id: string };
				Returns: undefined;
			};
			soft_delete_property: {
				Args: { p_property_id: string };
				Returns: undefined;
			};
			update_cleaner_pay_config: {
				Args: {
					p_host_multipliers: Json;
					p_hourly_rate: number;
					p_target_times: Json;
				};
				Returns: undefined;
			};
			update_cleaning_request: {
				Args: {
					p_cleaning_id: string;
					p_custom_tasks: string[];
					p_instructions: string;
					p_scheduled_start: string;
					p_stocks_included?: boolean;
				};
				Returns: string;
			};
			update_user_presence: { Args: never; Returns: undefined };
		};
		Enums: {
			cleaning_status:
				| 'draft'
				| 'requested'
				| 'confirmed'
				| 'in_progress'
				| 'completed'
				| 'cancelled';
			media_type: 'image' | 'video';
			notification_type:
				| 'cleaning_requested'
				| 'cleaning_confirmed'
				| 'cleaning_started'
				| 'cleaning_completed'
				| 'cleaning_cancelled'
				| 'cleaning_assigned'
				| 'cleaning_reassigned'
				| 'cleaning_updated'
				| 'cleaning_reminder'
				| 'cleaning_starting_soon'
				| 'cleaning_missed_clockin';
			property_type: 'house' | 'apartment' | 'studio';
			user_role: 'cleaner' | 'host' | 'admin';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	storage: {
		Tables: {
			buckets: {
				Row: {
					allowed_mime_types: string[] | null;
					avif_autodetection: boolean | null;
					created_at: string | null;
					file_size_limit: number | null;
					id: string;
					name: string;
					owner: string | null;
					owner_id: string | null;
					public: boolean | null;
					type: Database['storage']['Enums']['buckettype'];
					updated_at: string | null;
				};
				Insert: {
					allowed_mime_types?: string[] | null;
					avif_autodetection?: boolean | null;
					created_at?: string | null;
					file_size_limit?: number | null;
					id: string;
					name: string;
					owner?: string | null;
					owner_id?: string | null;
					public?: boolean | null;
					type?: Database['storage']['Enums']['buckettype'];
					updated_at?: string | null;
				};
				Update: {
					allowed_mime_types?: string[] | null;
					avif_autodetection?: boolean | null;
					created_at?: string | null;
					file_size_limit?: number | null;
					id?: string;
					name?: string;
					owner?: string | null;
					owner_id?: string | null;
					public?: boolean | null;
					type?: Database['storage']['Enums']['buckettype'];
					updated_at?: string | null;
				};
				Relationships: [];
			};
			buckets_analytics: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					format: string;
					id: string;
					name: string;
					type: Database['storage']['Enums']['buckettype'];
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					format?: string;
					id?: string;
					name: string;
					type?: Database['storage']['Enums']['buckettype'];
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					format?: string;
					id?: string;
					name?: string;
					type?: Database['storage']['Enums']['buckettype'];
					updated_at?: string;
				};
				Relationships: [];
			};
			buckets_vectors: {
				Row: {
					created_at: string;
					id: string;
					type: Database['storage']['Enums']['buckettype'];
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id: string;
					type?: Database['storage']['Enums']['buckettype'];
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					type?: Database['storage']['Enums']['buckettype'];
					updated_at?: string;
				};
				Relationships: [];
			};
			iceberg_namespaces: {
				Row: {
					bucket_name: string;
					catalog_id: string;
					created_at: string;
					id: string;
					metadata: Json;
					name: string;
					updated_at: string;
				};
				Insert: {
					bucket_name: string;
					catalog_id: string;
					created_at?: string;
					id?: string;
					metadata?: Json;
					name: string;
					updated_at?: string;
				};
				Update: {
					bucket_name?: string;
					catalog_id?: string;
					created_at?: string;
					id?: string;
					metadata?: Json;
					name?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'iceberg_namespaces_catalog_id_fkey';
						columns: ['catalog_id'];
						isOneToOne: false;
						referencedRelation: 'buckets_analytics';
						referencedColumns: ['id'];
					},
				];
			};
			iceberg_tables: {
				Row: {
					bucket_name: string;
					catalog_id: string;
					created_at: string;
					id: string;
					location: string;
					name: string;
					namespace_id: string;
					remote_table_id: string | null;
					shard_id: string | null;
					shard_key: string | null;
					updated_at: string;
				};
				Insert: {
					bucket_name: string;
					catalog_id: string;
					created_at?: string;
					id?: string;
					location: string;
					name: string;
					namespace_id: string;
					remote_table_id?: string | null;
					shard_id?: string | null;
					shard_key?: string | null;
					updated_at?: string;
				};
				Update: {
					bucket_name?: string;
					catalog_id?: string;
					created_at?: string;
					id?: string;
					location?: string;
					name?: string;
					namespace_id?: string;
					remote_table_id?: string | null;
					shard_id?: string | null;
					shard_key?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'iceberg_tables_catalog_id_fkey';
						columns: ['catalog_id'];
						isOneToOne: false;
						referencedRelation: 'buckets_analytics';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'iceberg_tables_namespace_id_fkey';
						columns: ['namespace_id'];
						isOneToOne: false;
						referencedRelation: 'iceberg_namespaces';
						referencedColumns: ['id'];
					},
				];
			};
			migrations: {
				Row: {
					executed_at: string | null;
					hash: string;
					id: number;
					name: string;
				};
				Insert: {
					executed_at?: string | null;
					hash: string;
					id: number;
					name: string;
				};
				Update: {
					executed_at?: string | null;
					hash?: string;
					id?: number;
					name?: string;
				};
				Relationships: [];
			};
			objects: {
				Row: {
					bucket_id: string | null;
					created_at: string | null;
					id: string;
					last_accessed_at: string | null;
					metadata: Json | null;
					name: string | null;
					owner: string | null;
					owner_id: string | null;
					path_tokens: string[] | null;
					updated_at: string | null;
					user_metadata: Json | null;
					version: string | null;
				};
				Insert: {
					bucket_id?: string | null;
					created_at?: string | null;
					id?: string;
					last_accessed_at?: string | null;
					metadata?: Json | null;
					name?: string | null;
					owner?: string | null;
					owner_id?: string | null;
					path_tokens?: string[] | null;
					updated_at?: string | null;
					user_metadata?: Json | null;
					version?: string | null;
				};
				Update: {
					bucket_id?: string | null;
					created_at?: string | null;
					id?: string;
					last_accessed_at?: string | null;
					metadata?: Json | null;
					name?: string | null;
					owner?: string | null;
					owner_id?: string | null;
					path_tokens?: string[] | null;
					updated_at?: string | null;
					user_metadata?: Json | null;
					version?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'objects_bucketId_fkey';
						columns: ['bucket_id'];
						isOneToOne: false;
						referencedRelation: 'buckets';
						referencedColumns: ['id'];
					},
				];
			};
			s3_multipart_uploads: {
				Row: {
					bucket_id: string;
					created_at: string;
					id: string;
					in_progress_size: number;
					key: string;
					metadata: Json | null;
					owner_id: string | null;
					upload_signature: string;
					user_metadata: Json | null;
					version: string;
				};
				Insert: {
					bucket_id: string;
					created_at?: string;
					id: string;
					in_progress_size?: number;
					key: string;
					metadata?: Json | null;
					owner_id?: string | null;
					upload_signature: string;
					user_metadata?: Json | null;
					version: string;
				};
				Update: {
					bucket_id?: string;
					created_at?: string;
					id?: string;
					in_progress_size?: number;
					key?: string;
					metadata?: Json | null;
					owner_id?: string | null;
					upload_signature?: string;
					user_metadata?: Json | null;
					version?: string;
				};
				Relationships: [
					{
						foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
						columns: ['bucket_id'];
						isOneToOne: false;
						referencedRelation: 'buckets';
						referencedColumns: ['id'];
					},
				];
			};
			s3_multipart_uploads_parts: {
				Row: {
					bucket_id: string;
					created_at: string;
					etag: string;
					id: string;
					key: string;
					owner_id: string | null;
					part_number: number;
					size: number;
					upload_id: string;
					version: string;
				};
				Insert: {
					bucket_id: string;
					created_at?: string;
					etag: string;
					id?: string;
					key: string;
					owner_id?: string | null;
					part_number: number;
					size?: number;
					upload_id: string;
					version: string;
				};
				Update: {
					bucket_id?: string;
					created_at?: string;
					etag?: string;
					id?: string;
					key?: string;
					owner_id?: string | null;
					part_number?: number;
					size?: number;
					upload_id?: string;
					version?: string;
				};
				Relationships: [
					{
						foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
						columns: ['bucket_id'];
						isOneToOne: false;
						referencedRelation: 'buckets';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
						columns: ['upload_id'];
						isOneToOne: false;
						referencedRelation: 's3_multipart_uploads';
						referencedColumns: ['id'];
					},
				];
			};
			vector_indexes: {
				Row: {
					bucket_id: string;
					created_at: string;
					data_type: string;
					dimension: number;
					distance_metric: string;
					id: string;
					metadata_configuration: Json | null;
					name: string;
					updated_at: string;
				};
				Insert: {
					bucket_id: string;
					created_at?: string;
					data_type: string;
					dimension: number;
					distance_metric: string;
					id?: string;
					metadata_configuration?: Json | null;
					name: string;
					updated_at?: string;
				};
				Update: {
					bucket_id?: string;
					created_at?: string;
					data_type?: string;
					dimension?: number;
					distance_metric?: string;
					id?: string;
					metadata_configuration?: Json | null;
					name?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'vector_indexes_bucket_id_fkey';
						columns: ['bucket_id'];
						isOneToOne: false;
						referencedRelation: 'buckets_vectors';
						referencedColumns: ['id'];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			allow_any_operation: {
				Args: { expected_operations: string[] };
				Returns: boolean;
			};
			allow_only_operation: {
				Args: { expected_operation: string };
				Returns: boolean;
			};
			can_insert_object: {
				Args: { bucketid: string; metadata: Json; name: string; owner: string };
				Returns: undefined;
			};
			extension: { Args: { name: string }; Returns: string };
			filename: { Args: { name: string }; Returns: string };
			foldername: { Args: { name: string }; Returns: string[] };
			get_common_prefix: {
				Args: { p_delimiter: string; p_key: string; p_prefix: string };
				Returns: string;
			};
			get_size_by_bucket: {
				Args: never;
				Returns: {
					bucket_id: string;
					size: number;
				}[];
			};
			list_multipart_uploads_with_delimiter: {
				Args: {
					bucket_id: string;
					delimiter_param: string;
					max_keys?: number;
					next_key_token?: string;
					next_upload_token?: string;
					prefix_param: string;
				};
				Returns: {
					created_at: string;
					id: string;
					key: string;
				}[];
			};
			list_objects_with_delimiter: {
				Args: {
					_bucket_id: string;
					delimiter_param: string;
					max_keys?: number;
					next_token?: string;
					prefix_param: string;
					sort_order?: string;
					start_after?: string;
				};
				Returns: {
					created_at: string;
					id: string;
					last_accessed_at: string;
					metadata: Json;
					name: string;
					updated_at: string;
				}[];
			};
			operation: { Args: never; Returns: string };
			search: {
				Args: {
					bucketname: string;
					levels?: number;
					limits?: number;
					offsets?: number;
					prefix: string;
					search?: string;
					sortcolumn?: string;
					sortorder?: string;
				};
				Returns: {
					created_at: string;
					id: string;
					last_accessed_at: string;
					metadata: Json;
					name: string;
					updated_at: string;
				}[];
			};
			search_by_timestamp: {
				Args: {
					p_bucket_id: string;
					p_level: number;
					p_limit: number;
					p_prefix: string;
					p_sort_column: string;
					p_sort_column_after: string;
					p_sort_order: string;
					p_start_after: string;
				};
				Returns: {
					created_at: string;
					id: string;
					key: string;
					last_accessed_at: string;
					metadata: Json;
					name: string;
					updated_at: string;
				}[];
			};
			search_v2: {
				Args: {
					bucket_name: string;
					levels?: number;
					limits?: number;
					prefix: string;
					sort_column?: string;
					sort_column_after?: string;
					sort_order?: string;
					start_after?: string;
				};
				Returns: {
					created_at: string;
					id: string;
					key: string;
					last_accessed_at: string;
					metadata: Json;
					name: string;
					updated_at: string;
				}[];
			};
		};
		Enums: {
			buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			cleaning_status: ['draft', 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled'],
			media_type: ['image', 'video'],
			notification_type: [
				'cleaning_requested',
				'cleaning_confirmed',
				'cleaning_started',
				'cleaning_completed',
				'cleaning_cancelled',
				'cleaning_assigned',
				'cleaning_reassigned',
				'cleaning_updated',
				'cleaning_reminder',
				'cleaning_starting_soon',
				'cleaning_missed_clockin',
			],
			property_type: ['house', 'apartment', 'studio'],
			user_role: ['cleaner', 'host', 'admin'],
		},
	},
	storage: {
		Enums: {
			buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
		},
	},
} as const;
