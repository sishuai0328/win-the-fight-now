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
    const testDatabaseConnection = async () => {
      try {
        console.log('🧪 测试数据库连接...');
        const { data, error } = await supabase
          .from('conversation_sessions')
          .select('*')
          .limit(1);
        
        if (error) {
          console.error('❌ 数据库连接测试失败:', error);
          console.error('错误详情:', error.message, error.details, error.hint);
        } else {
          console.log('✅ 数据库连接测试成功，返回数据:', data);
        }
      } catch (error) {
        console.error('❌ 数据库连接测试异常:', error);
      }
    };

    const initializeUsageInfo = async () => {
      const isLoggedIn = !!user;
      console.log('🔍 初始化使用信息 - 用户登录状态:', isLoggedIn);
      console.log('👤 用户对象:', user);
      
      // 检查用户是否付费 - 通过payments表查询
      const isPaidUser = user ? await checkUserPaidStatus(user.id) : false;
      console.log('💳 用户付费状态:', isPaidUser);
      
      let maxRounds: number;
      let currentRounds = 0;
      
      if (!isLoggedIn) {
        maxRounds = 3;
        // 未登录用户仍使用localStorage
        currentRounds = parseInt(localStorage.getItem('anonymous-usage-count') || '0');
        console.log('👤 未登录用户 - localStorage使用次数:', currentRounds);
      } else if (!isPaidUser) {
        maxRounds = 7;
        // 已登录用户从数据库获取使用次数（统计今天的对话轮数）
        currentRounds = await getUserUsageCount(user.id);
        console.log('🏠 已登录免费用户 - 数据库使用次数:', currentRounds);
      } else {
        // 付费用户无限制
        maxRounds = Infinity;
        currentRounds = 0;
        console.log('👑 付费用户 - 无限制');
      }
      
      const canUse = isPaidUser || currentRounds < maxRounds;
      const needsLogin = !isLoggedIn && currentRounds >= 3;
      const needsUpgrade = isLoggedIn && !isPaidUser && currentRounds >= 7;

      console.log('📊 使用限制状态:', {
        currentRounds,
        maxRounds,
        canUse,
        needsLogin,
        needsUpgrade
      });

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

    testDatabaseConnection();
    initializeUsageInfo();
  }, [user]);

  // 检查用户付费状态
  const checkUserPaidStatus = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 检查用户付费状态, user_id:', userId);
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ 检查付费状态失败:', error);
        return false;
      }

      const isPaid = data && data.length > 0;
      console.log('✅ 付费状态查询结果:', isPaid, data);
      return isPaid;
    } catch (error) {
      console.error('❌ 检查付费状态异常:', error);
      return false;
    }
  };

  // 获取用户使用次数（统计今天的对话轮数）
  const getUserUsageCount = async (userId: string): Promise<number> => {
    try {
      console.log('🔍 获取用户使用次数, user_id:', userId);
      // 获取今天的使用次数（统计今天的message_count总和）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      console.log('📅 查询时间范围:', {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString()
      });
      
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('message_count')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        console.error('❌ 获取使用次数失败:', error);
        console.error('错误详情:', error.message, error.details, error.hint);
        return 0;
      }

      console.log('📊 数据库查询结果:', data);

      // 计算今天总的对话轮数
      const totalRounds = data?.reduce((sum, session) => {
        return sum + (session.message_count || 0);
      }, 0) || 0;

      console.log('✅ 计算的总使用次数:', totalRounds);
      return totalRounds;
    } catch (error) {
      console.error('❌ 获取使用次数异常:', error);
      return 0;
    }
  };

  const incrementUsage = async () => {
    console.log('🚀 incrementUsage 被调用');
    console.log('📊 当前使用状态:', usageInfo);
    console.log('👤 用户对象:', user);
    
    if (usageInfo.isPaidUser) {
      console.log('👑 付费用户无需记录使用次数');
      return; // 付费用户无需记录使用次数
    }
    
    if (usageInfo.isLoggedIn && user) {
      // 已登录用户：记录到数据库
      try {
        console.log('🏠 已登录用户 - 准备记录到数据库');
        console.log('👤 用户ID:', user.id, '类型:', typeof user.id);
        
        // 确保user.id是字符串格式
        const userId = typeof user.id === 'string' ? user.id : String(user.id);
        
        // 生成唯一的session_token
        const sessionToken = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('🔑 生成的session_token:', sessionToken);
        
        const insertData = {
          user_id: userId,
          session_token: sessionToken,
          message_count: 1, // 每次生成回复算1轮对话
          is_completed: true,
        };
        console.log('📝 准备插入的数据:', insertData);
        
        const { data, error } = await supabase
          .from('conversation_sessions')
          .insert(insertData)
          .select('*'); // 返回插入的数据以便调试

        if (error) {
          console.error('❌ 记录使用次数失败:', error);
          console.error('错误详情:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return;
        }

        console.log('✅ 成功记录到数据库，返回数据:', data);

        // 更新本地状态
        const newCount = usageInfo.currentRounds + 1;
        console.log('📊 更新本地状态 - 旧次数:', usageInfo.currentRounds, '新次数:', newCount);
        
        setUsageInfo(prev => ({
          ...prev,
          currentRounds: newCount,
          canUse: newCount < prev.maxRounds,
          needsUpgrade: prev.isLoggedIn && !prev.isPaidUser && newCount >= 7,
        }));

        console.log('✅ 本地状态更新完成');

      } catch (error) {
        console.error('❌ 记录使用次数异常:', error);
      }
    } else {
      // 未登录用户：使用localStorage
      console.log('👤 未登录用户 - 使用localStorage');
      const storageKey = 'anonymous-usage-count';
      const newCount = usageInfo.currentRounds + 1;
      localStorage.setItem(storageKey, newCount.toString());
      
      setUsageInfo(prev => ({
        ...prev,
        currentRounds: newCount,
        canUse: newCount < prev.maxRounds,
        needsLogin: newCount >= 3,
      }));

      console.log('📊 未登录用户 - 新使用次数:', newCount);
    }
  };

  const resetUsage = async () => {
    console.log('🗑️ resetUsage 被调用');
    
    if (usageInfo.isLoggedIn && user) {
      // 已登录用户：清除数据库今天的记录（谨慎操作）
      try {
        console.log('🗑️ 重置已登录用户的使用次数');
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
          console.error('❌ 重置使用次数失败:', error);
          return;
        }

        console.log('✅ 成功重置数据库记录');
      } catch (error) {
        console.error('❌ 重置使用次数异常:', error);
      }
    } else {
      // 未登录用户：清除localStorage
      console.log('🗑️ 重置未登录用户的localStorage');
      localStorage.removeItem('anonymous-usage-count');
    }
    
    setUsageInfo(prev => ({
      ...prev,
      currentRounds: 0,
      canUse: true,
      needsLogin: false,
      needsUpgrade: false,
    }));

    console.log('✅ 使用次数已重置');
  };

  return {
    usageInfo,
    incrementUsage,
    resetUsage,
  };
}; 