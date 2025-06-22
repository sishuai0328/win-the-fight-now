export interface Database {
  public: {
    Tables: {
      conversation_sessions: {
        Row: {
          id: string
          user_id: string | null
          session_token: string
          message_count: number | null
          is_completed: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id?: string | null
          session_token: string
          message_count?: number | null
          is_completed?: boolean | null
        }
        Update: {
          user_id?: string | null
          session_token?: string
          message_count?: number | null
          is_completed?: boolean | null
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          creem_order_id: string
          creem_checkout_id: string
          product_id: string
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          creem_order_id: string
          creem_checkout_id: string
          product_id: string
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
        }
        Update: {
          user_id?: string
          creem_order_id?: string
          creem_checkout_id?: string
          product_id?: string
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
        }
      }
    }
  }
} 