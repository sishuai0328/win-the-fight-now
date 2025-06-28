import { supabase } from './supabaseClient';
import { Database } from './database.types';

type MemberInfo = Database['public']['Tables']['member_info']['Row'];

export interface UserMembershipInfo {
  isPremium: boolean;
  status: 'active' | 'inactive' | 'expired';
  level: 'free' | 'premium' | null;
  expiresAt: string | null;
  remainingDays: number | null;
  remainingHours: number | null;
  remainingMinutes: number | null;
}

export class MemberInfoService {
  /**
   * 获取用户会员信息
   */
  static async getUserMemberInfo(userId: string): Promise<MemberInfo | null> {
    try {
      const { data, error } = await supabase
        .from('member_info')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching member info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserMemberInfo:', error);
      return null;
    }
  }

  /**
   * 获取格式化的用户会员信息
   */
  static async getUserMembershipInfo(userId: string): Promise<UserMembershipInfo> {
    try {
      const memberInfo = await this.getUserMemberInfo(userId);
      
      if (!memberInfo) {
        return {
          isPremium: false,
          status: 'inactive',
          level: 'free',
          expiresAt: null,
          remainingDays: null,
          remainingHours: null,
          remainingMinutes: null,
        };
      }

      const isPremium = memberInfo.membership_level === 'premium' && 
                       memberInfo.membership_status === 'active';
      
      let remainingDays = null;
      let remainingHours = null;
      let remainingMinutes = null;

      if (memberInfo.expires_at) {
        const expiresAt = new Date(memberInfo.expires_at);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        
        if (diffMs > 0) {
          remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        }
      }

      return {
        isPremium,
        status: memberInfo.membership_status,
        level: memberInfo.membership_level,
        expiresAt: memberInfo.expires_at,
        remainingDays,
        remainingHours,
        remainingMinutes,
      };
    } catch (error) {
      console.error('Error in getUserMembershipInfo:', error);
      return {
        isPremium: false,
        status: 'inactive',
        level: 'free',
        expiresAt: null,
        remainingDays: null,
        remainingHours: null,
        remainingMinutes: null,
      };
    }
  }

  /**
   * 格式化剩余时长文本
   */
  static formatRemainingTime(remainingDays: number | null, remainingHours: number | null, remainingMinutes: number | null): string {
    if (remainingDays === null || remainingHours === null || remainingMinutes === null) {
      return '无限制';
    }

    if (remainingDays <= 0 && remainingHours <= 0 && remainingMinutes <= 0) {
      return '已过期';
    }

    const parts = [];
    if (remainingDays > 0) {
      parts.push(`${remainingDays}天`);
    }
    if (remainingHours > 0) {
      parts.push(`${remainingHours}小时`);
    }
    if (remainingMinutes > 0 && remainingDays === 0) {
      parts.push(`${remainingMinutes}分钟`);
    }

    return parts.join('');
  }

  /**
   * 格式化过期时间
   */
  static formatExpiresAt(expiresAt: string | null): string {
    if (!expiresAt) {
      return '永久有效';
    }

    const date = new Date(expiresAt);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export default MemberInfoService; 