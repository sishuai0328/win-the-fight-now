import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface UserUsageInfo {
  isLoggedIn: boolean;
  isPaidUser: boolean;
  currentRounds: number;
  maxRounds: number;
  canUse: boolean;
  needsLogin: boolean;
  needsUpgrade: boolean;
}

export const useUsageLimit = (user: any) => {
  const [usageInfo, setUsageInfo] = useState<UserUsageInfo>({
    isLoggedIn: false,
    isPaidUser: false,
    currentRounds: 0,
    maxRounds: 3,
    canUse: true,
    needsLogin: false,
    needsUpgrade: false,
  });

  useEffect(() => {
    const initializeUsageInfo = async () => {
      const isLoggedIn = !!user;
      // 检查用户是否付费 - 通过payments表查询
      const isPaidUser = user ? await checkUserPaidStatus(user.id) : false;
      
      let maxRounds: number;
      let currentRounds = 0;
      
      if (!isLoggedIn) {
        maxRounds = 3;
        // 未登录用户仍使用localStorage
        currentRounds = parseInt(localStorage.getItem('anonymous-usage-count') || '0');
      } else if (!isPaidUser) {
        maxRounds = 7;
        // 已登录用户从数据库获取使用次数（统计今天的对话轮数）
        currentRounds = await getUserUsageCount(user.id);
      } else {
        // 付费用户无限制
        maxRounds = Infinity;
        currentRounds = 0;
      }
      
      const canUse = isPaidUser || currentRounds < maxRounds;
      const needsLogin = !isLoggedIn && currentRounds >= 3;
      const needsUpgrade = isLoggedIn && !isPaidUser && currentRounds >= 7;

      setUsageInfo({
        isLoggedIn,
        isPaidUser,
        currentRounds,
        maxRounds,
        canUse,
        needsLogin,
        needsUpgrade,
      });
    };

    initializeUsageInfo();
  }, [user]);

  // 检查用户付费状态
  const checkUserPaidStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking paid status:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking paid status:', error);
      return false;
    }
  };

  // 获取用户使用次数（统计今天的对话轮数）
  const getUserUsageCount = async (userId: string): Promise<number> => {
    try {
      // 获取今天的使用次数（统计今天的message_count总和）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('message_count')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        console.error('Error getting usage count:', error);
        return 0;
      }

      // 计算今天总的对话轮数
      const totalRounds = data?.reduce((sum, session) => {
        return sum + (session.message_count || 0);
      }, 0) || 0;

      return totalRounds;
    } catch (error) {
      console.error('Error getting usage count:', error);
      return 0;
    }
  };

  const incrementUsage = async () => {
    if (usageInfo.isPaidUser) return; // 付费用户无需记录使用次数
    
    if (usageInfo.isLoggedIn && user) {
      // 已登录用户：记录到数据库
      try {
        // 生成唯一的session_token
        const sessionToken = `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { error } = await supabase
          .from('conversation_sessions')
          .insert({
            user_id: user.id,
            session_token: sessionToken,
            message_count: 1, // 每次生成回复算1轮对话
            is_completed: true,
          });

        if (error) {
          console.error('Error recording usage:', error);
          return;
        }

        // 更新本地状态
        const newCount = usageInfo.currentRounds + 1;
        setUsageInfo(prev => ({
          ...prev,
          currentRounds: newCount,
          canUse: newCount < prev.maxRounds,
          needsUpgrade: prev.isLoggedIn && !prev.isPaidUser && newCount >= 7,
        }));

      } catch (error) {
        console.error('Error recording usage:', error);
      }
    } else {
      // 未登录用户：使用localStorage
      const storageKey = 'anonymous-usage-count';
      const newCount = usageInfo.currentRounds + 1;
      localStorage.setItem(storageKey, newCount.toString());
      
      setUsageInfo(prev => ({
        ...prev,
        currentRounds: newCount,
        canUse: newCount < prev.maxRounds,
        needsLogin: newCount >= 3,
      }));
    }
  };

  const resetUsage = async () => {
    if (usageInfo.isLoggedIn && user) {
      // 已登录用户：清除数据库今天的记录（谨慎操作）
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { error } = await supabase
          .from('conversation_sessions')
          .delete()
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        if (error) {
          console.error('Error resetting usage:', error);
          return;
        }
      } catch (error) {
        console.error('Error resetting usage:', error);
      }
    } else {
      // 未登录用户：清除localStorage
      localStorage.removeItem('anonymous-usage-count');
    }
    
    setUsageInfo(prev => ({
      ...prev,
      currentRounds: 0,
      canUse: true,
      needsLogin: false,
      needsUpgrade: false,
    }));
  };

  return {
    usageInfo,
    incrementUsage,
    resetUsage,
  };
}; 