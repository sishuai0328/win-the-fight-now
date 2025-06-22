import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Crown, LogIn, Zap } from 'lucide-react';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  needsLogin: boolean;
  needsUpgrade: boolean;
  currentRounds: number;
  maxRounds: number;
  onLogin: () => void;
  onUpgrade: () => void;
}

const UsageLimitModal: React.FC<UsageLimitModalProps> = ({
  isOpen,
  onClose,
  needsLogin,
  needsUpgrade,
  currentRounds,
  maxRounds,
  onLogin,
  onUpgrade,
}) => {
  const getTitle = () => {
    if (needsLogin) {
      return '需要登录才能继续';
    }
    if (needsUpgrade) {
      return '需要升级才能继续';
    }
    return '使用次数即将用完';
  };

  const getDescription = () => {
    if (needsLogin) {
      return `您已经使用了 ${currentRounds} 次免费体验。登录后可以享受更多次数的对话权限！`;
    }
    if (needsUpgrade) {
      return `您已经使用了 ${currentRounds} 次免费对话。升级到专业版即可享受无限次数的AI回怼服务！`;
    }
    return `您已经使用了 ${currentRounds}/${maxRounds} 次对话。`;
  };

  const getPrimaryAction = () => {
    if (needsLogin) {
      return (
        <AlertDialogAction asChild>
          <Button onClick={onLogin} className="bg-blue-600 hover:bg-blue-700">
            <LogIn className="w-4 h-4 mr-2" />
            立即登录
          </Button>
        </AlertDialogAction>
      );
    }
    if (needsUpgrade) {
      return (
        <AlertDialogAction asChild>
          <Button onClick={onUpgrade} className="bg-green-600 hover:bg-green-700">
            <Crown className="w-4 h-4 mr-2" />
            立即升级 ($5/月)
          </Button>
        </AlertDialogAction>
      );
    }
    return null;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {needsLogin ? (
              <LogIn className="w-5 h-5 text-blue-600" />
            ) : (
              <Crown className="w-5 h-5 text-yellow-500" />
            )}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {getDescription()}
            
            {needsLogin && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">登录后可享受：</p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• 每次游戏最多 7 轮对话</li>
                  <li>• 保存您的对话历史</li>
                  <li>• 个性化设置</li>
                </ul>
              </div>
            )}
            
            {needsUpgrade && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 font-medium">专业版特权：</p>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>• 无限次数对话</li>
                  <li>• 优先获得新功能</li>
                  <li>• 专属客服支持</li>
                  <li>• 无广告体验</li>
                </ul>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose}>
              稍后再说
            </Button>
          </AlertDialogCancel>
          {getPrimaryAction()}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UsageLimitModal; 