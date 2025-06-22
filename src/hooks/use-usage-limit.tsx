import { useState, useEffect } from 'react';

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
    const isLoggedIn = !!user;
    // 暂时假设所有登录用户都是免费用户，付费功能待实现
    const isPaidUser = user?.user_metadata?.is_paid || false;
    
    let maxRounds: number;
    let storageKey: string;
    
    if (!isLoggedIn) {
      maxRounds = 3;
      storageKey = 'anonymous-usage-count';
    } else if (!isPaidUser) {
      maxRounds = 7;
      storageKey = `user-usage-count-${user.id}`;
    } else {
      // 付费用户无限制
      maxRounds = Infinity;
      storageKey = '';
    }

    const currentRounds = storageKey ? parseInt(localStorage.getItem(storageKey) || '0') : 0;
    
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
  }, [user]);

  const incrementUsage = () => {
    if (usageInfo.isPaidUser) return; // 付费用户无需记录使用次数
    
    const storageKey = usageInfo.isLoggedIn 
      ? `user-usage-count-${user.id}`
      : 'anonymous-usage-count';
    
    const newCount = usageInfo.currentRounds + 1;
    localStorage.setItem(storageKey, newCount.toString());
    
    setUsageInfo(prev => ({
      ...prev,
      currentRounds: newCount,
      canUse: newCount < prev.maxRounds,
      needsLogin: !prev.isLoggedIn && newCount >= 3,
      needsUpgrade: prev.isLoggedIn && !prev.isPaidUser && newCount >= 7,
    }));
  };

  const resetUsage = () => {
    const storageKey = usageInfo.isLoggedIn 
      ? `user-usage-count-${user.id}`
      : 'anonymous-usage-count';
    localStorage.removeItem(storageKey);
    
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