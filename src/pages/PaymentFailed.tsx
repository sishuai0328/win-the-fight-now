import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw } from 'lucide-react';

const PaymentFailed: React.FC = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate('/', { state: { showPricing: true } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">支付失败</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                很抱歉，您的支付未能成功完成。这可能是由于以下原因：
              </p>
              
              <ul className="text-sm text-gray-600 text-left space-y-1">
                <li>• 银行卡余额不足</li>
                <li>• 网络连接中断</li>
                <li>• 支付信息有误</li>
                <li>• 银行风控拦截</li>
              </ul>
              
              <div className="space-y-2 pt-4">
                <Button 
                  onClick={handleRetry} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新尝试支付
                </Button>
                
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="w-full"
                >
                  返回首页
                </Button>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>遇到问题？</strong><br />
                  如果您持续遇到支付问题，请联系客服获得帮助。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailed;