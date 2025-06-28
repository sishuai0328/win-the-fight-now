require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 创建一个简单的 checkout.completed 事件来测试
const checkoutId = 'ch_1xzEdBguJlF4qPAt62gBUx'; // 使用刚才创建的
const userEmail = 'test@example.com';
const userId = 'test-user-12345';

const webhookEvent = {
  id: 'evt_test_' + Date.now(),
  type: 'checkout.completed',
  data: {
    id: checkoutId,
    object: 'checkout',
    checkout_id: checkoutId,
    order_id: 'test_order_1751089357096',
    request_id: 'test_order_1751089357096',
    product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
    amount: 5.00,
    currency: 'USD',
    status: 'completed',
    customer_id: 'cust_test_' + userId,
    metadata: {
      env: 'development',
      user_email: userEmail,
      user_logged_in: true,
      user_id: userId
    }
  },
  created_at: new Date().toISOString()
};

// 创建签名
const payload = JSON.stringify(webhookEvent);
const secret = process.env.CREEM_WEBHOOK_SECRET;
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log('🔔 测试 Webhook 事件:');
console.log('Event Type:', webhookEvent.type);
console.log('Checkout ID:', checkoutId);
console.log('User ID:', userId);

async function testWebhook() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const response = await fetch('http://localhost:3001/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature
      },
      body: payload
    });

    const result = await response.text();
    console.log('\n📊 响应结果:');
    console.log('状态码:', response.status);
    console.log('响应内容:', result);
    
    if (response.ok) {
      console.log('✅ Webhook 处理成功！');
      
      // 检查数据库记录
      setTimeout(async () => {
        console.log('\n🔍 检查数据库记录...');
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.VITE_SUPABASE_ANON_KEY
        );

        try {
          // 检查 payments 表
          const { data: payments, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId);

          if (paymentError) {
            console.log('❌ 支付记录查询失败:', paymentError.message);
          } else {
            console.log(`📄 支付记录 (${payments.length} 条):`, payments);
          }

          // 检查 member_info 表
          const { data: memberInfo, error: memberError } = await supabase
            .from('member_info')
            .select('*')
            .eq('user_id', userId);

          if (memberError) {
            console.log('❌ 会员信息查询失败:', memberError.message);
          } else {
            console.log(`👤 会员信息 (${memberInfo.length} 条):`, memberInfo);
          }
        } catch (err) {
          console.log('❌ 数据库查询异常:', err.message);
        }
      }, 2000);
    } else {
      console.log('❌ Webhook 处理失败');
    }
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testWebhook();