require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 使用真实的数据测试 webhook
const checkoutId = 'ch_5EnoPHC4cdOWsWTKs8esfZ';
const creemOrderId = 'ord_1hFF5prrVK6Hyhkd7FNreD';
const userId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
const userEmail = 'sishuai0328@gmail.com';

// 创建模拟的 checkout.completed 事件
const webhookEvent = {
  id: 'evt_test_' + Date.now(),
  type: 'checkout.completed',
  data: {
    id: checkoutId,
    object: 'checkout',
    checkout_id: checkoutId,
    order_id: creemOrderId, // Creem 生成的真实订单ID
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

console.log('🔔 测试真实数据的 Webhook 事件:');
console.log('Event Type:', webhookEvent.type);
console.log('Checkout ID:', checkoutId);
console.log('Creem Order ID:', creemOrderId);
console.log('User ID:', userId);

// 创建签名
const payload = JSON.stringify(webhookEvent);
const secret = process.env.CREEM_WEBHOOK_SECRET;
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

async function testWebhook() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log('\n📡 发送 Webhook 到本地服务器...');
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
      
      // 检查处理结果
      setTimeout(async () => {
        console.log('\n🔍 检查处理结果...');
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.VITE_SUPABASE_ANON_KEY
        );

        // 检查支付记录
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('creem_checkout_id', checkoutId)
          .single();

        if (paymentError) {
          console.log('❌ 支付记录查询失败:', paymentError.message);
        } else {
          console.log('💳 支付记录状态:');
          console.log('  - 状态:', payment.status);
          console.log('  - Creem 订单ID:', payment.creem_order_id);
          console.log('  - Checkout ID:', payment.creem_checkout_id);
        }

        // 检查会员信息
        const { data: member, error: memberError } = await supabase
          .from('member_info')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (memberError) {
          console.log('❌ 会员信息查询失败:', memberError.message);
        } else {
          console.log('👑 会员状态:');
          console.log('  - 状态:', member.membership_status);
          console.log('  - 级别:', member.membership_level);
          console.log('  - 过期时间:', member.expires_at);
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