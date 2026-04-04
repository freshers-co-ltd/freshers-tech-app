export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			cleaning_reports: {
				Row: {
					broken_items_report: string | null;
					cleaner_id: string;
					cleaning_id: string;
					created_at: string;
					id: string;
					low_supplies_report: string | null;
				};
				Insert: {
					broken_items_report?: string | null;
					cleaner_id: string;
					cleaning_id: string;
					created_at?: string;
					id?: string;
					low_supplies_report?: string | null;
				};
				Update: {
					broken_items_report?: string | null;
					cleaner_id?: string;
					cleaning_id?: string;
					created_at?: string;
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
					description: string;
					id: string;
					is_completed: boolean;
					is_custom: boolean;
				};
				Insert: {
					cleaning_id: string;
					created_at?: string;
					description: string;
					id?: string;
					is_completed?: boolean;
					is_custom?: boolean;
				};
				Update: {
					cleaning_id?: string;
					created_at?: string;
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
					clock_in_time: string | null;
					clock_out_time: string | null;
					created_at: string;
					host_id: string;
					id: string;
					instructions: string | null;
					property_id: string;
					scheduled_start: string;
					service_cost: number;
					status: Database['public']['Enums']['cleaning_status'];
					updated_at: string;
				};
				Insert: {
					cleaner_id?: string | null;
					clock_in_time?: string | null;
					clock_out_time?: string | null;
					created_at?: string;
					host_id: string;
					id?: string;
					instructions?: string | null;
					property_id: string;
					scheduled_start: string;
					service_cost: number;
					status?: Database['public']['Enums']['cleaning_status'];
					updated_at?: string;
				};
				Update: {
					cleaner_id?: string | null;
					clock_in_time?: string | null;
					clock_out_time?: string | null;
					created_at?: string;
					host_id?: string;
					id?: string;
					instructions?: string | null;
					property_id?: string;
					scheduled_start?: string;
					service_cost?: number;
					status?: Database['public']['Enums']['cleaning_status'];
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
					id: string;
					media_url: string;
					type: Database['public']['Enums']['media_type'];
					uploader_id: string;
				};
				Insert: {
					cleaning_id: string;
					created_at?: string;
					id?: string;
					media_url: string;
					type?: Database['public']['Enums']['media_type'];
					uploader_id: string;
				};
				Update: {
					cleaning_id?: string;
					created_at?: string;
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
			profiles: {
				Row: {
					avatar_url: string | null;
					email: string | null;
					full_name: string | null;
					id: string;
					is_verified: boolean | null;
					role: Database['public']['Enums']['user_role'];
					updated_at: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					email?: string | null;
					full_name?: string | null;
					id: string;
					is_verified?: boolean | null;
					role?: Database['public']['Enums']['user_role'];
					updated_at?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					email?: string | null;
					full_name?: string | null;
					id?: string;
					is_verified?: boolean | null;
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
			create_cleaning_request: {
				Args: {
					p_custom_tasks: string[];
					p_property_id: string;
					p_scheduled_start: string;
					p_service_cost: number;
				};
				Returns: string;
			};
			update_cleaning_request: {
				Args: {
					p_cleaning_id: string;
					p_custom_tasks: string[];
					p_instructions: string;
					p_scheduled_start: string;
				};
				Returns: string;
			};
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
			property_type: 'house' | 'apartment' | 'other';
			user_role: 'cleaner' | 'host' | 'admin';
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
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			cleaning_status: ['draft', 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled'],
			media_type: ['image', 'video'],
			property_type: ['house', 'apartment', 'other'],
			user_role: ['cleaner', 'host', 'admin'],
		},
	},
} as const;
