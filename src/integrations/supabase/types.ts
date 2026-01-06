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
      access_requests: {
        Row: {
          access_level: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          reason: string | null
          requester_id: string
          resource_name: string
          resource_type: string
          status: string | null
        }
        Insert: {
          access_level: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requester_id: string
          resource_name: string
          resource_type: string
          status?: string | null
        }
        Update: {
          access_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requester_id?: string
          resource_name?: string
          resource_type?: string
          status?: string | null
        }
        Relationships: []
      }
      action_audit_log: {
        Row: {
          action_data: Json
          action_type: string
          approved_by: string | null
          created_at: string
          executed_at: string | null
          id: string
          risk_level: string
          session_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          action_data: Json
          action_type: string
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          risk_level: string
          session_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          risk_level?: string
          session_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analytics: {
        Row: {
          confidence_score: number | null
          created_at: string
          domain: string
          has_citation: boolean | null
          id: string
          query_type: string
          response_time_ms: number | null
          risk_level: string | null
          session_id: string | null
          token_count: number | null
          tool_called: string | null
          tool_success: boolean | null
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          domain?: string
          has_citation?: boolean | null
          id?: string
          query_type?: string
          response_time_ms?: number | null
          risk_level?: string | null
          session_id?: string | null
          token_count?: number | null
          tool_called?: string | null
          tool_success?: boolean | null
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          domain?: string
          has_citation?: boolean | null
          id?: string
          query_type?: string
          response_time_ms?: number | null
          risk_level?: string | null
          session_id?: string | null
          token_count?: number | null
          tool_called?: string | null
          tool_success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_blocked_patterns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          pattern_keywords: string[] | null
          pattern_regex: string | null
          pattern_type: string
          severity: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern_keywords?: string[] | null
          pattern_regex?: string | null
          pattern_type: string
          severity?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern_keywords?: string[] | null
          pattern_regex?: string | null
          pattern_type?: string
          severity?: string | null
        }
        Relationships: []
      }
      ai_capability_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          capability_name: string
          capability_type: string
          created_at: string
          description: string
          id: string
          proposed_implementation: Json | null
          proposed_tool_schema: Json | null
          requested_by_user_id: string | null
          safety_analysis: Json | null
          status: string
          trigger_context: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          capability_name: string
          capability_type: string
          created_at?: string
          description: string
          id?: string
          proposed_implementation?: Json | null
          proposed_tool_schema?: Json | null
          requested_by_user_id?: string | null
          safety_analysis?: Json | null
          status?: string
          trigger_context?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          capability_name?: string
          capability_type?: string
          created_at?: string
          description?: string
          id?: string
          proposed_implementation?: Json | null
          proposed_tool_schema?: Json | null
          requested_by_user_id?: string | null
          safety_analysis?: Json | null
          status?: string
          trigger_context?: string | null
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          corrected_response: string | null
          created_at: string
          feedback_data: Json | null
          feedback_type: string
          id: string
          is_processed: boolean | null
          message_id: string | null
          original_response: string | null
          pattern_extracted: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          corrected_response?: string | null
          created_at?: string
          feedback_data?: Json | null
          feedback_type: string
          id?: string
          is_processed?: boolean | null
          message_id?: string | null
          original_response?: string | null
          pattern_extracted?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          corrected_response?: string | null
          created_at?: string
          feedback_data?: Json | null
          feedback_type?: string
          id?: string
          is_processed?: boolean | null
          message_id?: string | null
          original_response?: string | null
          pattern_extracted?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_pattern_extracted_fkey"
            columns: ["pattern_extracted"]
            isOneToOne: false
            referencedRelation: "ai_learned_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_learned_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string
          failure_count: number | null
          id: string
          is_harmful: boolean | null
          is_validated: boolean | null
          last_used_at: string | null
          pattern_data: Json
          pattern_key: string
          pattern_type: string
          success_count: number | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          failure_count?: number | null
          id?: string
          is_harmful?: boolean | null
          is_validated?: boolean | null
          last_used_at?: string | null
          pattern_data: Json
          pattern_key: string
          pattern_type: string
          success_count?: number | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          failure_count?: number | null
          id?: string
          is_harmful?: boolean | null
          is_validated?: boolean | null
          last_used_at?: string | null
          pattern_data?: Json
          pattern_key?: string
          pattern_type?: string
          success_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_learning_sessions: {
        Row: {
          applied_at: string | null
          approved_by: string | null
          conversation_context: Json | null
          created_at: string
          extracted_patterns: Json | null
          generated_prompt: string | null
          id: string
          is_approved: boolean | null
          safety_analysis: Json | null
          safety_score: number | null
          session_type: string
          trigger: string
          user_id: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_by?: string | null
          conversation_context?: Json | null
          created_at?: string
          extracted_patterns?: Json | null
          generated_prompt?: string | null
          id?: string
          is_approved?: boolean | null
          safety_analysis?: Json | null
          safety_score?: number | null
          session_type: string
          trigger: string
          user_id?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_by?: string | null
          conversation_context?: Json | null
          created_at?: string
          extracted_patterns?: Json | null
          generated_prompt?: string | null
          id?: string
          is_approved?: boolean | null
          safety_analysis?: Json | null
          safety_score?: number | null
          session_type?: string
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_safety_audit: {
        Row: {
          action_data: Json
          action_type: string
          approved_by: string | null
          block_reason: string | null
          created_at: string
          id: string
          risk_flags: string[] | null
          safety_score: number | null
          session_id: string | null
          user_id: string | null
          was_approved: boolean | null
          was_blocked: boolean | null
        }
        Insert: {
          action_data: Json
          action_type: string
          approved_by?: string | null
          block_reason?: string | null
          created_at?: string
          id?: string
          risk_flags?: string[] | null
          safety_score?: number | null
          session_id?: string | null
          user_id?: string | null
          was_approved?: boolean | null
          was_blocked?: boolean | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          approved_by?: string | null
          block_reason?: string | null
          created_at?: string
          id?: string
          risk_flags?: string[] | null
          safety_score?: number | null
          session_id?: string | null
          user_id?: string | null
          was_approved?: boolean | null
          was_blocked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_safety_audit_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_task_queue: {
        Row: {
          approval_required: boolean | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_result: Json | null
          id: string
          parent_task_id: string | null
          proposed_changes: Json | null
          risk_level: string | null
          session_id: string | null
          started_at: string | null
          status: string | null
          task_context: Json | null
          task_description: string
          task_order: number
          task_type: string
          user_id: string | null
        }
        Insert: {
          approval_required?: boolean | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          parent_task_id?: string | null
          proposed_changes?: Json | null
          risk_level?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
          task_context?: Json | null
          task_description: string
          task_order?: number
          task_type: string
          user_id?: string | null
        }
        Update: {
          approval_required?: boolean | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          parent_task_id?: string | null
          proposed_changes?: Json | null
          risk_level?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string | null
          task_context?: Json | null
          task_description?: string
          task_order?: number
          task_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_queue_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ai_task_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_registry: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean | null
          parameters_schema: Json
          required_approval: boolean | null
          risk_level: string | null
          success_rate: number | null
          tool_category: string
          tool_description: string
          tool_name: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          parameters_schema: Json
          required_approval?: boolean | null
          risk_level?: string | null
          success_rate?: number | null
          tool_category: string
          tool_description: string
          tool_name: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          parameters_schema?: Json
          required_approval?: boolean | null
          risk_level?: string | null
          success_rate?: number | null
          tool_category?: string
          tool_description?: string
          tool_name?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          description: string | null
          id: string
          rejection_reason: string | null
          request_data: Json
          request_type: string
          requester_id: string
          status: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          description?: string | null
          id?: string
          rejection_reason?: string | null
          request_data: Json
          request_type: string
          requester_id: string
          status?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          description?: string | null
          id?: string
          rejection_reason?: string | null
          request_data?: Json
          request_type?: string
          requester_id?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          action_data: Json | null
          citations: Json | null
          content: string
          created_at: string
          id: string
          risk_level: string | null
          role: string
          session_id: string
          token_count: number | null
          weight: number | null
        }
        Insert: {
          action_data?: Json | null
          citations?: Json | null
          content: string
          created_at?: string
          id?: string
          risk_level?: string | null
          role: string
          session_id: string
          token_count?: number | null
          weight?: number | null
        }
        Update: {
          action_data?: Json | null
          citations?: Json | null
          content?: string
          created_at?: string
          id?: string
          risk_level?: string | null
          role?: string
          session_id?: string
          token_count?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          is_archived: boolean | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_archived?: boolean | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_archived?: boolean | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      code_change_proposals: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          change_type: string
          created_at: string
          explanation: string | null
          file_path: string
          id: string
          original_code: string | null
          proposed_by: string
          proposed_code: string
          risk_level: string | null
          status: string
          ticket_id: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          change_type?: string
          created_at?: string
          explanation?: string | null
          file_path: string
          id?: string
          original_code?: string | null
          proposed_by?: string
          proposed_code: string
          risk_level?: string | null
          status?: string
          ticket_id?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          change_type?: string
          created_at?: string
          explanation?: string | null
          file_path?: string
          id?: string
          original_code?: string | null
          proposed_by?: string
          proposed_code?: string
          risk_level?: string | null
          status?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_change_proposals_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "dev_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      code_change_requests: {
        Row: {
          approved_at: string | null
          change_reason: string
          created_at: string
          developer_id: string | null
          file_path: string
          id: string
          original_code: string | null
          proposed_code: string
          requester_id: string | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          change_reason: string
          created_at?: string
          developer_id?: string | null
          file_path: string
          id?: string
          original_code?: string | null
          proposed_code: string
          requester_id?: string | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          change_reason?: string
          created_at?: string
          developer_id?: string | null
          file_path?: string
          id?: string
          original_code?: string | null
          proposed_code?: string
          requester_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      deployment_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deployed_at: string | null
          environment: string
          id: string
          requester_id: string
          service_name: string
          status: string | null
          version: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deployed_at?: string | null
          environment: string
          id?: string
          requester_id: string
          service_name: string
          status?: string | null
          version?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deployed_at?: string | null
          environment?: string
          id?: string
          requester_id?: string
          service_name?: string
          status?: string | null
          version?: string | null
        }
        Relationships: []
      }
      dev_tickets: {
        Row: {
          assigned_developer_id: string | null
          code_changes: Json | null
          created_at: string
          deployment_risk: string | null
          description: string
          error_details: Json | null
          id: string
          proposed_fix: Json | null
          reporter_id: string | null
          resolved_at: string | null
          root_cause: string | null
          service_name: string
          severity: string
          status: string
          test_impact: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          assigned_developer_id?: string | null
          code_changes?: Json | null
          created_at?: string
          deployment_risk?: string | null
          description: string
          error_details?: Json | null
          id?: string
          proposed_fix?: Json | null
          reporter_id?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          service_name: string
          severity?: string
          status?: string
          test_impact?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          assigned_developer_id?: string | null
          code_changes?: Json | null
          created_at?: string
          deployment_risk?: string | null
          description?: string
          error_details?: Json | null
          id?: string
          proposed_fix?: Json | null
          reporter_id?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          service_name?: string
          severity?: string
          status?: string
          test_impact?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: Json | null
          id: string
          page_number: number | null
          section_title: string | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: Json | null
          id?: string
          page_number?: number | null
          section_title?: string | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: Json | null
          id?: string
          page_number?: number | null
          section_title?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          root_cause: string | null
          service_name: string
          severity: string
          status: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          service_name: string
          severity: string
          status?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          service_name?: string
          severity?: string
          status?: string | null
        }
        Relationships: []
      }
      leave_balance: {
        Row: {
          annual_leave: number | null
          casual_leave: number | null
          id: string
          maternity_leave: number | null
          paternity_leave: number | null
          sick_leave: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_leave?: number | null
          casual_leave?: number | null
          id?: string
          maternity_leave?: number | null
          paternity_leave?: number | null
          sick_leave?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_leave?: number | null
          casual_leave?: number | null
          id?: string
          maternity_leave?: number | null
          paternity_leave?: number | null
          sick_leave?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          risk_level: string | null
          start_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          rejection_reason?: string | null
          risk_level?: string | null
          start_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          risk_level?: string | null
          start_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendee_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          google_calendar_link: string | null
          id: string
          reason: string | null
          rejection_reason: string | null
          requester_id: string
          scheduled_date: string
          scheduled_time: string
          status: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendee_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          google_calendar_link?: string | null
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          requester_id: string
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendee_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          google_calendar_link?: string | null
          id?: string
          reason?: string | null
          rejection_reason?: string | null
          requester_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      navigation_config: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          required_roles: string[]
          route_name: string
          route_path: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          required_roles: string[]
          route_name: string
          route_path: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          required_roles?: string[]
          route_name?: string
          route_path?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payslip_requests: {
        Row: {
          created_at: string
          id: string
          month: number
          payslip_data: Json | null
          status: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          payslip_data?: Json | null
          status?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          payslip_data?: Json | null
          status?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          employment_type: string | null
          full_name: string
          id: string
          location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          employment_type?: string | null
          full_name: string
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          employment_type?: string | null
          full_name?: string
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reimbursement_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          receipt_path: string | null
          rejection_reason: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_path?: string | null
          rejection_reason?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_path?: string | null
          rejection_reason?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          priority: string | null
          status: string | null
          training_name: string
          training_type: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          status?: string | null
          training_name: string
          training_type: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          status?: string | null
          training_name?: string
          training_type?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          created_at: string
          embeddings_generated: boolean | null
          extracted_text: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          is_global: boolean | null
          page_count: number | null
          session_id: string | null
          storage_path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          embeddings_generated?: boolean | null
          extracted_text?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          is_global?: boolean | null
          page_count?: number | null
          session_id?: string | null
          storage_path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          embeddings_generated?: boolean | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          is_global?: boolean | null
          page_count?: number | null
          session_id?: string | null
          storage_path?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "employee" | "hr" | "it" | "developer"
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
      app_role: ["employee", "hr", "it", "developer"],
    },
  },
} as const
