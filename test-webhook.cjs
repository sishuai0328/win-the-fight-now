require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 模拟从你的支付日志中的数据
const checkoutId = 'ch_4xuDHZWKuch13HLQR4ggvy';
const userEmail = 'sishuai0328@gmail.com';

// 创建模拟的 webhook 事件
const webhookEvent = {
  id: 'evt_test_123456',
  type: 'checkout.completed',
  data: {
    id: checkoutId,
    object: 'checkout',
    checkout_id: checkoutId,
    order_id: 'order_1735257736985_abc123',
    product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
    amount: 5.00,
    currency: 'USD',
    status: 'completed',
    customer_id: 'cust_test_123',
    metadata: {
      env: 'development',
      user_email: userEmail,
      user_logged_in: true,
      user_id: 'test-user-id' // 你需要替换为真实的用户ID
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

console.log('测试 Webhook 事件:');
console.log('Checkout ID:', checkoutId);
console.log('Signature:', signature);

// 发送 webhook
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
    console.log('Response Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Webhook 测试成功！');
    } else {
      console.log('❌ Webhook 测试失败');
    }
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testWebhook();