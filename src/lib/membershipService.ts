import { supabase } from './supabaseClient';
import { Database } from './database.types';

type UserMembership = Database['public']['Tables']['user_memberships']['Row'];
type UserMembershipInsert = Database['public']['Tables']['user_memberships']['Insert'];
type UserMembershipUpdate = Database['public']['Tables']['user_memberships']['Update'];

export class MembershipService {
  static async getUserMembership(userId: string): Promise<UserMembership | null> {
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user membership:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserMembership:', error);
      return null;
    }
  }

  static async createUserMembership(membershipData: UserMembershipInsert): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_memberships')
        .insert(membershipData);

      if (error) {
        console.error('Error creating user membership:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createUserMembership:', error);
      return false;
    }
  }

  static async updateUserMembership(userId: string, updates: UserMembershipUpdate): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_memberships')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user membership:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserMembership:', error);
      return false;
    }
  }

  static async upgradeToPremium(userId: string, subscriptionId?: string): Promise<boolean> {
    const membershipData: UserMembershipUpdate = {
      membership_type: 'premium',
      subscription_id: subscriptionId || null,
      is_active: true,
      feature_limits: {
        max_conversations_per_day: -1, // unlimited
        max_messages_per_conversation: -1, // unlimited
        premium_features: true
      },
      expires_at: null // null for active subscription
    };

    return this.updateUserMembership(userId, membershipData);
  }

  static async downgradeToFree(userId: string): Promise<boolean> {
    const membershipData: UserMembershipUpdate = {
      membership_type: 'free',
      subscription_id: null,
      is_active: false,
      feature_limits: {
        max_conversations_per_day: 3,
        max_messages_per_conversation: 3,
        premium_features: false
      },
      expires_at: null
    };

    return this.updateUserMembership(userId, membershipData);
  }

  static async checkMembershipFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const membership = await this.getUserMembership(userId);
      
      if (!membership || !membership.is_active) {
        return false;
      }

      const limits = membership.feature_limits as any;
      return limits?.[feature] === true;
    } catch (error) {
      console.error('Error checking membership feature:', error);
      return false;
    }
  }

  static async getRemainingUsage(userId: string): Promise<{
    conversationsToday: number;
    maxConversations: number;
    messagesInCurrentConversation: number;
    maxMessages: number;
  }> {
    try {
      const membership = await this.getUserMembership(userId);
      
      if (!membership || !membership.is_active) {
        return {
          conversationsToday: 0,
          maxConversations: 3,
          messagesInCurrentConversation: 0,
          maxMessages: 3
        };
      }

      const limits = membership.feature_limits as any;
      
      // Get today's conversation count
      const today = new Date().toISOString().split('T')[0];
      const { count: conversationsToday } = await supabase
        .from('conversation_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today);

      return {
        conversationsToday: conversationsToday || 0,
        maxConversations: limits?.max_conversations_per_day || 3,
        messagesInCurrentConversation: 0, // You'd need to implement this based on current session
        maxMessages: limits?.max_messages_per_conversation || 3
      };
    } catch (error) {
      console.error('Error getting remaining usage:', error);
      return {
        conversationsToday: 0,
        maxConversations: 3,
        messagesInCurrentConversation: 0,
        maxMessages: 3
      };
    }
  }

  static async initializeUserMembership(userId: string): Promise<boolean> {
    try {
      // Check if user already has membership
      const existing = await this.getUserMembership(userId);
      if (existing) {
        return true;
      }

      // Create free membership for new user
      const membershipData: UserMembershipInsert = {
        user_id: userId,
        membership_type: 'free',
        is_active: false,
        feature_limits: {
          max_conversations_per_day: 3,
          max_messages_per_conversation: 3,
          premium_features: false
        }
      };

      return this.createUserMembership(membershipData);
    } catch (error) {
      console.error('Error initializing user membership:', error);
      return false;
    }
  }
}

export default MembershipService;