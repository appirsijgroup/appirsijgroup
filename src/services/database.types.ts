export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          timestamp: number
          is_read: boolean
          related_entity_id: string | null
          link_to: Json | null
          expires_at: number | null
          dismiss_on_click: boolean | null
        }
        Insert: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          timestamp: number
          is_read?: boolean
          related_entity_id?: string | null
          link_to?: Json | null
          expires_at?: number | null
          dismiss_on_click?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          timestamp?: number
          is_read?: boolean
          related_entity_id?: string | null
          link_to?: Json | null
          expires_at?: number | null
          dismiss_on_click?: boolean | null
        }
      }
      // Add other tables as needed...
      [key: string]: any
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
    Enums: {
      [key: string]: any
    }
  }
}
