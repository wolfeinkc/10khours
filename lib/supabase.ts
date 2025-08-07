import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => createClientComponentClient()

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          user_type: 'student' | 'teacher'
          subscription_status: 'free' | 'premium'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          user_type?: 'student' | 'teacher'
          subscription_status?: 'free' | 'premium'
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          user_type?: 'student' | 'teacher'
          subscription_status?: 'free' | 'premium'
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          position: number
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
          color?: string
          position?: number
        }
        Update: {
          name?: string
          color?: string
          position?: number
        }
      }
      songs: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          title: string
          artist: string | null
          color: string
          notes: string | null
          metronome_bpm: number
          position: number
          created_at: string
        }
        Insert: {
          user_id: string
          folder_id?: string | null
          title: string
          artist?: string | null
          color?: string
          notes?: string | null
          metronome_bpm?: number
          position?: number
        }
        Update: {
          folder_id?: string | null
          title?: string
          artist?: string | null
          color?: string
          notes?: string | null
          metronome_bpm?: number
          position?: number
        }
      }
      practice_sessions: {
        Row: {
          id: string
          user_id: string
          song_id: string
          duration_minutes: number
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          song_id: string
          duration_minutes: number
          notes?: string | null
        }
        Update: {
          duration_minutes?: number
          notes?: string | null
        }
      }
    }
  }
}