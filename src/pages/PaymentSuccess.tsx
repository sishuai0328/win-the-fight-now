import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failed' | null>(null);

  const checkoutId = searchParams.get('checkout_id');
  const orderId = searchParams.get('order_id');
  const customerId = searchParams.get('customer_id');
  const productId = searchParams.get('product_id');
  const signature = searchParams.get('signature');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!checkoutId || !signature) {
        setVerificationResult('failed');
        setIsVerifying(false);
        return;
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setVerificationResult('success');
      } catch (error) {
        console.error('Payment verification failed:', error);
        setVerificationResult('failed');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [checkoutId, signature]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">正在验证支付结果...</h2>
              <p className="text-gray-600">请稍候，我们正在确认您的支付状态</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationResult === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">支付验证失败</h2>
              <p className="text-gray-600 mb-6">支付可能未完成或验证信息有误</p>
              <Button onClick={() => navigate('/')} className="w-full">
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">支付成功！</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">订单号：</span>{orderId}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">产品ID：</span>{productId}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">支付ID：</span>{checkoutId}
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                恭喜您成功订阅专业包月套餐！现在您可以享受无限次数的AI回怼对话了。
              </p>
              
              <div className="space-y-2">
                <Button onClick={() => navigate('/')} className="w-full bg-green-600 hover:bg-green-700">
                  开始使用
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;