require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 使用真实的 Creem webhook 格式测试
const testUserId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
const testUserEmail = 'sishuai0328@gmail.com';
const testOrderId = 'ord_1751101107473_nsu2jrzdb'; // 从最新日志中获取

async function testRealCreemWebhook() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log('🔔 测试真实 Creem Webhook 格式...\n');
    console.log('测试订单ID:', testOrderId);
    
    // 使用真实的 Creem webhook 结构
    const realWebhookEvent = {
      "id": "evt_test_" + Date.now(),
      "eventType": "checkout.completed",
      "created_at": Date.now(),
      "object": {
        "id": "ch_43DZdAfWmr8L8QI8mzFB1k", // 从日志中获取的真实 checkout ID
        "object": "checkout",
        "request_id": testOrderId, // 关键：匹配我们系统的 order_id
        "order": {
          "id": "ord_4aDwWXjMLpes4Kj4XqNnUA", // Creem 生成的订单ID
          "customer": "cust_1OcIK1GEuVvXZwD19tjq2z",
          "product": "prod_1yWRgfSXvAaYQ1HfRE44VR",
          "amount": 500, // 5.00 USD = 500 cents
          "currency": "USD",
          "status": "paid",
          "type": "one_time",
          "created_at": new Date().toISOString(),
          "updated_at": new Date().toISOString(),
          "mode": "test"
        },
        "product": {
          "id": "prod_1yWRgfSXvAaYQ1HfRE44VR",
          "name": "Premium Membership",
          "description": "Monthly Premium Access",
          "price": 500,
          "currency": "USD",
          "billing_type": "one_time",
          "status": "active"
        },
        "customer": {
          "id": "cust_1OcIK1GEuVvXZwD19tjq2z",
          "object": "customer",
          "email": testUserEmail,
          "name": "Test User",
          "country": "US",
          "created_at": new Date().toISOString(),
          "updated_at": new Date().toISOString(),
          "mode": "test"
        },
        "status": "completed",
        "metadata": {
          "env": "development",
          "user_id": testUserId,
          "user_email": testUserEmail,
          "user_logged_in": true
        },
        "mode": "test"
      }
    };
    
    console.log('📋 Webhook 事件详情:');
    console.log('  - Event Type:', realWebhookEvent.eventType);
    console.log('  - Request ID (匹配键):', realWebhookEvent.object.request_id);
    console.log('  - Creem Order ID:', realWebhookEvent.object.order.id);
    console.log('  - Checkout ID:', realWebhookEvent.object.id);
    console.log('  - Order Status:', realWebhookEvent.object.order.status);
    console.log('  - Checkout Status:', realWebhookEvent.object.status);
    
    // 创建签名
    const payload = JSON.stringify(realWebhookEvent);
    const secret = process.env.CREEM_WEBHOOK_SECRET || 'test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
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
          .eq('order_id', testOrderId)
          .single();

        if (paymentError) {
          console.log('❌ 支付记录查询失败:', paymentError.message);
        } else {
          console.log('💳 支付记录更新结果:');
          console.log('  - 系统订单ID:', payment.order_id);
          console.log('  - Creem 订单ID:', payment.creem_order_id);
          console.log('  - Checkout ID:', payment.creem_checkout_id);
          console.log('  - 状态:', payment.status);
          console.log('  - 金额:', payment.amount, payment.currency);
          console.log('  - 支付方式:', payment.payment_method);
          console.log('  - 完成时间:', payment.completed_at);
          console.log('  - 更新时间:', payment.updated_at);
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
        
        console.log('\n🎉 真实 Creem Webhook 测试完成！');
      }, 2000);
    } else {
      console.log('❌ Webhook 处理失败');
    }
    
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testRealCreemWebhook();