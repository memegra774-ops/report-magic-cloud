export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      departments: {
        Row: {
          code: string
          college_name: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          college_name?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          college_name?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          report_month: number
          report_year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          report_month: number
          report_year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          report_month?: number
          report_year?: number
        }
        Relationships: []
      }
      report_entries: {
        Row: {
          category: Database["public"]["Enums"]["staff_category"]
          created_at: string
          current_status: string
          id: string
          remark: string | null
          report_id: string | null
          staff_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["staff_category"]
          created_at?: string
          current_status: string
          id?: string
          remark?: string | null
          report_id?: string | null
          staff_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["staff_category"]
          created_at?: string
          current_status?: string
          id?: string
          remark?: string | null
          report_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_entries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "monthly_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          academic_rank: string | null
          category: Database["public"]["Enums"]["staff_category"]
          college_name: string
          created_at: string
          current_status: string
          department_id: string | null
          education_level: Database["public"]["Enums"]["education_level"]
          full_name: string
          id: string
          remark: string | null
          sex: Database["public"]["Enums"]["sex_type"]
          specialization: string | null
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          academic_rank?: string | null
          category?: Database["public"]["Enums"]["staff_category"]
          college_name?: string
          created_at?: string
          current_status?: string
          department_id?: string | null
          education_level?: Database["public"]["Enums"]["education_level"]
          full_name: string
          id?: string
          remark?: string | null
          sex?: Database["public"]["Enums"]["sex_type"]
          specialization?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_rank?: string | null
          category?: Database["public"]["Enums"]["staff_category"]
          college_name?: string
          created_at?: string
          current_status?: string
          department_id?: string | null
          education_level?: Database["public"]["Enums"]["education_level"]
          full_name?: string
          id?: string
          remark?: string | null
          sex?: Database["public"]["Enums"]["sex_type"]
          specialization?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      education_level: "Bsc" | "BSc" | "Msc" | "MSc" | "PHD" | "Dip"
      sex_type: "M" | "F"
      staff_category:
        | "Local Instructors"
        | "Not On Duty"
        | "On Study"
        | "Not Reporting"
        | "ARA"
        | "Not On Duty ARA"
        | "ASTU Sponsor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      education_level: ["Bsc", "BSc", "Msc", "MSc", "PHD", "Dip"],
      sex_type: ["M", "F"],
      staff_category: [
        "Local Instructors",
        "Not On Duty",
        "On Study",
        "Not Reporting",
        "ARA",
        "Not On Duty ARA",
        "ASTU Sponsor",
      ],
    },
  },
} as const
