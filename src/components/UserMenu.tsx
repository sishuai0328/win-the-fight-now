import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, User, LogOut, Clock, Calendar, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MemberInfoService, { UserMembershipInfo } from '@/lib/memberInfoService';

interface UserMenuProps {
  user: any;
  onLogout: () => void;
  onUpgrade?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onUpgrade }) => {
  const [membershipInfo, setMembershipInfo] = useState<UserMembershipInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembershipInfo = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const info = await MemberInfoService.getUserMembershipInfo(user.id);
        setMembershipInfo(info);
      } catch (error) {
        console.error('Error fetching membership info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembershipInfo();
  }, [user?.id]);

  const getUserDisplayName = () => {
    return user?.user_metadata?.user_name || 
           user?.user_metadata?.full_name || 
           user?.email?.split('@')[0] || 
           '用户';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.substring(0, 2).toUpperCase();
  };

  const getMembershipBadgeStyle = () => {
    if (!membershipInfo?.isPremium) {
      return {
        className: 'bg-gray-100 text-gray-600 border-gray-200',
        variant: 'secondary' as const
      };
    }
    
    switch (membershipInfo.status) {
      case 'active':
        return {
          className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 border-yellow-500 shadow-md',
          variant: 'default' as const
        };
      case 'expired':
        return {
          className: 'bg-red-100 text-red-700 border-red-300',
          variant: 'destructive' as const
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          variant: 'secondary' as const
        };
    }
  };

  const getRemainingTimeText = () => {
    if (!membershipInfo) return '';
    
    return MemberInfoService.formatRemainingTime(
      membershipInfo.remainingDays,
      membershipInfo.remainingHours,
      membershipInfo.remainingMinutes
    );
  };

  const getExpiresAtText = () => {
    if (!membershipInfo?.expiresAt) return '永久有效';
    
    return MemberInfoService.formatExpiresAt(membershipInfo.expiresAt);
  };

  if (!user) return null;

  const badgeStyle = getMembershipBadgeStyle();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-auto w-auto px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 !outline-none !ring-0 !ring-offset-0 !border-0 focus:!outline-none focus:!ring-0 focus:!ring-offset-0 focus:!border-0 active:!outline-none active:!ring-0 active:!border-0"
          style={{ 
            outline: 'none !important', 
            border: 'none !important', 
            boxShadow: 'none !important' 
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {!isLoading && membershipInfo?.isPremium && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1 shadow-lg">
                  <Crown className="h-3 w-3 text-yellow-900" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                {getUserDisplayName()}
              </span>
              {!isLoading && membershipInfo?.isPremium && (
                <Badge 
                  className={`text-xs h-5 px-2 flex items-center gap-1 font-semibold ${badgeStyle.className}`}
                >
                  <Crown className="h-3 w-3" />
                  Premium
                </Badge>
              )}
              {!isLoading && !membershipInfo?.isPremium && (
                <span className="text-xs text-gray-500">免费用户</span>
              )}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
            <DropdownMenuContent className="w-96 shadow-xl border-0 bg-white/95 backdrop-blur-md" align="end" forceMount>
        {/* 用户信息头部 */}
        <DropdownMenuLabel className="font-normal p-4">
          <div className={`rounded-xl p-4 ${membershipInfo?.isPremium ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!isLoading && membershipInfo?.isPremium && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1.5 shadow-lg">
                    <Crown className="h-4 w-4 text-yellow-900" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-base font-bold text-gray-900 truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-sm text-gray-500 truncate mb-2">
                  {user.email}
                </p>
                {!isLoading && membershipInfo && (
                  <Badge className={`w-fit ${badgeStyle.className}`}>
                    {membershipInfo.isPremium ? (
                      <div className="flex items-center gap-1.5 font-bold">
                        <Crown className="h-4 w-4" />
                        Premium VIP
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        免费版
                      </div>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* 会员信息部分 */}
        {membershipInfo?.isPremium ? (
          <div className="px-4 py-3">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-900">尊享会员特权</span>
              </div>
              
              {!isLoading && (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Calendar className="h-4 w-4" />
                      <span>到期时间</span>
                    </div>
                    <span className="font-semibold text-yellow-900">
                      {getExpiresAtText()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Clock className="h-4 w-4" />
                      <span>剩余时长</span>
                    </div>
                    <span className="font-semibold text-yellow-900">
                      {getRemainingTimeText()}
                    </span>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs">无限制AI回怼 • 优先支持 • 专属功能</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">免费用户</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                升级到Premium VIP享受无限制使用和专属特权
              </p>
                             <Button 
                 size="sm" 
                 onClick={onUpgrade}
                 className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold"
               >
                 <Crown className="h-4 w-4 mr-2" />
                 立即升级
               </Button>
            </div>
          </div>
        )}
        
        <DropdownMenuSeparator className="my-2" />
        
        <div className="px-4 pb-4">
          <DropdownMenuItem 
            onClick={onLogout} 
            className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 rounded-lg p-3 font-medium transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>退出登录</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu; 