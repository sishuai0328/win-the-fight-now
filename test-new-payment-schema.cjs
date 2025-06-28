require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 测试新的支付架构
const testUserId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
const testUserEmail = 'sishuai0328@gmail.com';
const productId = 'prod_1yWRgfSXvAaYQ1HfRE44VR';

async function testNewPaymentFlow() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log('🚀 测试新的支付架构...\n');
    
    // 1. 创建支付订单
    console.log('📋 步骤1: 创建支付订单...');
    const checkoutPayload = {
      product_id: productId,
      user_id: testUserId,
      customer_email: testUserEmail,
      metadata: {
        user_email: testUserEmail,
        user_logged_in: true
      }
    };
    
    const checkoutResponse = await fetch('http://localhost:3001/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutPayload)
    });
    
    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.text();
      console.log('❌ 创建订单失败:', error);
      return;
    }
    
    const checkoutData = await checkoutResponse.json();
    console.log('✅ 订单创建成功:');
    console.log('  - Checkout ID:', checkoutData.id);
    console.log('  - 支付链接:', checkoutData.checkout_url);
    console.log('  - 成功回调:', checkoutData.success_url);
    
    // 2. 模拟支付完成的 webhook
    console.log('\n📋 步骤2: 模拟支付完成 webhook...');
    
    // 从成功回调URL中提取 order_id
    const urlParams = new URLSearchParams(checkoutData.success_url.split('?')[1]);
    const orderId = urlParams.get('order_id');
    
    if (!orderId) {
      console.log('❌ 无法从回调URL获取 order_id');
      return;
    }
    
    console.log('  - 系统订单ID:', orderId);
    
    // 创建模拟的支付完成事件
    const webhookEvent = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.completed',
      data: {
        id: checkoutData.id,
        object: 'checkout',
        checkout_id: checkoutData.id,
        order_id: 'creem_ord_' + Date.now(), // Creem 平台生成的订单ID
        product_id: productId,
        amount: 5.00,
        currency: 'USD',
        status: 'succeeded',
        payment_method: 'card',
        customer_id: 'cust_test_' + testUserId,
        customer_email: testUserEmail,
        request_id: orderId, // 关键：这是我们系统的 order_id
        metadata: {
          env: 'development',
          user_email: testUserEmail,
          user_logged_in: true,
          user_id: testUserId
        },
        created_at: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };
    
    // 创建签名
    const payload = JSON.stringify(webhookEvent);
    const secret = process.env.CREEM_WEBHOOK_SECRET || 'test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    console.log('  - Creem 订单ID:', webhookEvent.data.order_id);
    console.log('  - Request ID (匹配):', webhookEvent.data.request_id);
    
    // 3. 发送 webhook
    console.log('\n📋 步骤3: 发送 webhook...');
    const webhookResponse = await fetch('http://localhost:3001/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature
      },
      body: payload
    });
    
    const webhookResult = await webhookResponse.text();
    console.log('  - 状态码:', webhookResponse.status);
    console.log('  - 响应:', webhookResult);
    
    if (webhookResponse.ok) {
      console.log('✅ Webhook 处理成功！');
      
      // 4. 验证结果
      console.log('\n📋 步骤4: 验证处理结果...');
      setTimeout(async () => {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.VITE_SUPABASE_ANON_KEY
        );

        // 检查支付记录
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', orderId)
          .single();

        if (paymentError) {
          console.log('❌ 支付记录查询失败:', paymentError.message);
        } else {
          console.log('💳 支付记录:');
          console.log('  - 系统订单ID:', payment.order_id);
          console.log('  - Creem 订单ID:', payment.creem_order_id);
          console.log('  - Checkout ID:', payment.creem_checkout_id);
          console.log('  - 状态:', payment.status);
          console.log('  - 金额:', payment.amount, payment.currency);
          console.log('  - 支付方式:', payment.payment_method);
          console.log('  - 完成时间:', payment.completed_at);
        }

        // 检查会员信息
        const { data: member, error: memberError } = await supabase
          .from('member_info')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        if (memberError) {
          console.log('❌ 会员信息查询失败:', memberError.message);
        } else {
          console.log('👑 会员状态:');
          console.log('  - 状态:', member.membership_status);
          console.log('  - 级别:', member.membership_level);
          console.log('  - 过期时间:', member.expires_at);
          console.log('  - 关联支付ID:', member.last_payment_id);
        }
        
        console.log('\n🎉 新支付架构测试完成！');
      }, 2000);
    } else {
      console.log('❌ Webhook 处理失败');
    }
    
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testNewPaymentFlow();