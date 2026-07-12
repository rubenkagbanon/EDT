export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: 'academic_years_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      arbitration_notes: {
        Row: {
          created_at: string
          created_by: string | null
          establishment_id: string
          id: string
          message: string
          rule_code: string
          schedule_entry_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          message: string
          rule_code: string
          schedule_entry_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          message?: string
          rule_code?: string
          schedule_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'arbitration_notes_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'arbitration_notes_schedule_entry_id_fkey'
            columns: ['schedule_entry_id']
            isOneToOne: false
            referencedRelation: 'schedule_entries'
            referencedColumns: ['id']
          },
        ]
      }
      classes: {
        Row: {
          establishment_id: string
          headcount: number | null
          id: string
          level_id: string
          name: string
        }
        Insert: {
          establishment_id?: string
          headcount?: number | null
          id?: string
          level_id: string
          name: string
        }
        Update: {
          establishment_id?: string
          headcount?: number | null
          id?: string
          level_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classes_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classes_level_id_fkey'
            columns: ['level_id']
            isOneToOne: false
            referencedRelation: 'levels'
            referencedColumns: ['id']
          },
        ]
      }
      curriculum_items: {
        Row: {
          establishment_id: string
          id: string
          level_id: string
          session_pattern: number[] | null
          subject_id: string
          weekly_hours: number
        }
        Insert: {
          establishment_id?: string
          id?: string
          level_id: string
          session_pattern?: number[] | null
          subject_id: string
          weekly_hours?: number
        }
        Update: {
          establishment_id?: string
          id?: string
          level_id?: string
          session_pattern?: number[] | null
          subject_id?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: 'curriculum_items_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'curriculum_items_level_id_fkey'
            columns: ['level_id']
            isOneToOne: false
            referencedRelation: 'levels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'curriculum_items_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
        ]
      }
      establishment_settings: {
        Row: {
          establishment_id: string
          etaler: boolean
          grille_stricte: boolean
          lourdes_matin: boolean
          matieres_lourdes: string[]
          max_meme_matiere_jour: number
          respecter_indispos: boolean
        }
        Insert: {
          establishment_id: string
          etaler?: boolean
          grille_stricte?: boolean
          lourdes_matin?: boolean
          matieres_lourdes?: string[]
          max_meme_matiere_jour?: number
          respecter_indispos?: boolean
        }
        Update: {
          establishment_id?: string
          etaler?: boolean
          grille_stricte?: boolean
          lourdes_matin?: boolean
          matieres_lourdes?: string[]
          max_meme_matiere_jour?: number
          respecter_indispos?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'establishment_settings_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: true
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      establishments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          school_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          school_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          school_type?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          cycle: string
          establishment_id: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          cycle: string
          establishment_id?: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          cycle?: string
          establishment_id?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: 'levels_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          establishment_id: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          establishment_id: string
          id: string
          name: string
          priority_note: string | null
          room_type: string
        }
        Insert: {
          capacity?: number | null
          establishment_id?: string
          id?: string
          name: string
          priority_note?: string | null
          room_type: string
        }
        Update: {
          capacity?: number | null
          establishment_id?: string
          id?: string
          name?: string
          priority_note?: string | null
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rooms_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_entries: {
        Row: {
          academic_year_id: string
          day_of_week: number
          establishment_id: string
          id: string
          paired_entry_id: string | null
          room_id: string | null
          slot_count: number
          start_slot_order: number
          subject_id: string
          teacher_id: string
        }
        Insert: {
          academic_year_id: string
          day_of_week: number
          establishment_id?: string
          id?: string
          paired_entry_id?: string | null
          room_id?: string | null
          slot_count?: number
          start_slot_order: number
          subject_id: string
          teacher_id: string
        }
        Update: {
          academic_year_id?: string
          day_of_week?: number
          establishment_id?: string
          id?: string
          paired_entry_id?: string | null
          room_id?: string | null
          slot_count?: number
          start_slot_order?: number
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_entries_academic_year_id_fkey'
            columns: ['academic_year_id']
            isOneToOne: false
            referencedRelation: 'academic_years'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_paired_entry_id_fkey'
            columns: ['paired_entry_id']
            isOneToOne: false
            referencedRelation: 'schedule_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_entry_classes: {
        Row: {
          class_id: string
          entry_id: string
          establishment_id: string
        }
        Insert: {
          class_id: string
          entry_id: string
          establishment_id?: string
        }
        Update: {
          class_id?: string
          entry_id?: string
          establishment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_entry_classes_class_id_fkey'
            columns: ['class_id']
            isOneToOne: false
            referencedRelation: 'classes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entry_classes_entry_id_fkey'
            columns: ['entry_id']
            isOneToOne: false
            referencedRelation: 'schedule_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entry_classes_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          establishment_id: string
          id: string
          name: string
          subject_group: string
        }
        Insert: {
          code: string
          establishment_id?: string
          id?: string
          name: string
          subject_group: string
        }
        Update: {
          code?: string
          establishment_id?: string
          id?: string
          name?: string
          subject_group?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subjects_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      teacher_levels: {
        Row: {
          establishment_id: string
          level_id: string
          teacher_id: string
        }
        Insert: {
          establishment_id?: string
          level_id: string
          teacher_id: string
        }
        Update: {
          establishment_id?: string
          level_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_levels_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_levels_level_id_fkey'
            columns: ['level_id']
            isOneToOne: false
            referencedRelation: 'levels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_levels_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teacher_subjects: {
        Row: {
          establishment_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          establishment_id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          establishment_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_subjects_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_subjects_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_subjects_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teacher_unavailability: {
        Row: {
          day_of_week: number
          establishment_id: string
          id: string
          order_index: number
          teacher_id: string
        }
        Insert: {
          day_of_week: number
          establishment_id?: string
          id?: string
          order_index: number
          teacher_id: string
        }
        Update: {
          day_of_week?: number
          establishment_id?: string
          id?: string
          order_index?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teacher_unavailability_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teacher_unavailability_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'teachers'
            referencedColumns: ['id']
          },
        ]
      }
      teachers: {
        Row: {
          establishment_id: string
          full_name: string
          id: string
          max_weekly_hours: number
        }
        Insert: {
          establishment_id?: string
          full_name: string
          id?: string
          max_weekly_hours?: number
        }
        Update: {
          establishment_id?: string
          full_name?: string
          id?: string
          max_weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: 'teachers_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      time_slots: {
        Row: {
          day_of_week: number
          end_time: string
          establishment_id: string
          id: string
          kind: string
          order_index: number
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          establishment_id?: string
          id?: string
          kind: string
          order_index: number
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          establishment_id?: string
          id?: string
          kind?: string
          order_index?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_slots_establishment_id_fkey'
            columns: ['establishment_id']
            isOneToOne: false
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_establishment_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
