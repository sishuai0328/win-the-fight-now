import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PricingSectionProps {
  onUpgrade: () => void;
  isLoggedIn: boolean;
}

const PricingSection: React.FC<PricingSectionProps> = ({ onUpgrade, isLoggedIn }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreemCheckout = async () => {
    if (!isLoggedIn) {
      onUpgrade();
      return;
    }

    setIsProcessing(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('用户未登录，请先登录');
      }

      // For local development, call Creem API directly
      const isDev = import.meta.env.DEV;
      const apiKey = import.meta.env.VITE_CREEM_API_KEY;
      
      if (!apiKey) {
        throw new Error('Creem API key not configured');
      }

      // Use local proxy server for development to avoid CORS issues
      const apiUrl = isDev ? 'http://localhost:3001/api/create-checkout' : '/api/create-checkout';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
          user_id: user.id,
          customer_email: user.email,
          metadata: {
            env: isDev ? 'development' : 'production',
            user_logged_in: isLoggedIn,
            user_email: user.email
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Creem API error:', errorText);
        throw new Error(`Failed to create checkout session: ${response.status}`);
      }

      const checkoutData = await response.json();
      console.log('Checkout session created:', checkoutData);
      
      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`支付创建失败：${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">选择适合你的套餐</h2>
        <p className="text-gray-600">解锁无限制AI回怼能力，让你在每场争论中都能占据上风</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* 免费套餐 */}
        <Card className="border-2 border-gray-200 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-bold text-gray-800">免费体验</CardTitle>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-800">￥0</span>
              <span className="text-gray-500 ml-2">/月</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>每次游戏最多 {isLoggedIn ? '7' : '3'} 轮对话</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>3种不同风格的回复</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>可调节语气强烈程度</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>基础AI回怼能力</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-6"
              disabled
            >
              当前套餐
            </Button>
          </CardContent>
        </Card>

        {/* 付费套餐 */}
        <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-blue-50 backdrop-blur relative">
          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1">
            推荐
          </Badge>
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              专业包月
            </CardTitle>
            <div className="mt-4">
              <span className="text-3xl font-bold text-green-600">$5</span>
              <span className="text-gray-500 ml-2">/月</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium">无限次数对话</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>3种不同风格的回复</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>可调节语气强烈程度</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>优先获得新功能</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span>专属客服支持</span>
              </div>
            </div>
            <Button 
              onClick={handleCreemCheckout}
              disabled={isProcessing}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  立即升级
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center mt-8 text-sm text-gray-500">
        <p>💡 升级后立即生效，随时可以取消订阅</p>
      </div>
    </div>
  );
};

export default PricingSection; 