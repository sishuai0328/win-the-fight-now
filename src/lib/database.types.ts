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
          order_id: string
          user_id: string
          product_id: string
          amount: number
          currency: string
          status: string
          creem_checkout_id: string | null
          creem_order_id: string | null
          customer_email: string | null
          metadata: Record<string, any> | null
          payment_method: string | null
          error_code: string | null
          error_message: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          order_id: string
          user_id: string
          product_id: string
          amount: number
          currency?: string
          status?: string
          creem_checkout_id?: string | null
          creem_order_id?: string | null
          customer_email?: string | null
          metadata?: Record<string, any> | null
          payment_method?: string | null
          error_code?: string | null
          error_message?: string | null
          completed_at?: string | null
        }
        Update: {
          order_id?: string
          user_id?: string
          product_id?: string
          amount?: number
          currency?: string
          status?: string
          creem_checkout_id?: string | null
          creem_order_id?: string | null
          customer_email?: string | null
          metadata?: Record<string, any> | null
          payment_method?: string | null
          error_code?: string | null
          error_message?: string | null
          completed_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          creem_subscription_id: string
          creem_customer_id: string
          product_id: string
          status: 'active' | 'canceled' | 'expired' | 'trialing' | 'past_due'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          metadata: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          creem_subscription_id: string
          creem_customer_id: string
          product_id: string
          status?: 'active' | 'canceled' | 'expired' | 'trialing' | 'past_due'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          metadata?: Record<string, any> | null
        }
        Update: {
          user_id?: string
          creem_subscription_id?: string
          creem_customer_id?: string
          product_id?: string
          status?: 'active' | 'canceled' | 'expired' | 'trialing' | 'past_due'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          metadata?: Record<string, any> | null
        }
      }
      member_info: {
        Row: {
          user_id: string
          membership_status: 'active' | 'inactive' | 'expired'
          membership_level: 'free' | 'premium' | null
          expires_at: string | null
          points: number
          joined_at: string
          last_payment_id: string | null
          last_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          membership_status?: 'active' | 'inactive' | 'expired'
          membership_level?: 'free' | 'premium' | null
          expires_at?: string | null
          points?: number
          joined_at?: string
          last_payment_id?: string | null
          last_subscription_id?: string | null
        }
        Update: {
          user_id?: string
          membership_status?: 'active' | 'inactive' | 'expired'
          membership_level?: 'free' | 'premium' | null
          expires_at?: string | null
          points?: number
          joined_at?: string
          last_payment_id?: string | null
          last_subscription_id?: string | null
        }
      }
    }
  }
} 