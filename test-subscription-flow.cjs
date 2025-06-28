require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 测试完整的订阅流程
const testUserId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
const testUserEmail = 'sishuai0328@gmail.com';

async function testSubscriptionFlow() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log('🚀 测试完整订阅流程...\n');
    
    // 1. 模拟 subscription.active 事件
    console.log('📋 步骤1: 测试 subscription.active 事件...');
    const subscriptionActiveEvent = {
      "id": "evt_sub_active_" + Date.now(),
      "eventType": "subscription.active",
      "created_at": Date.now(),
      "object": {
        "id": "sub_7eo1kmXcSo1G11vggbOb7M",
        "object": "subscription",
        "product": "prod_1yWRgfSXvAaYQ1HfRE44VR",
        "customer": "cust_3L4bopl9ACWHBC8h7akFCX",
        "collection_method": "charge_automatically",
        "status": "active",
        "current_period_start_date": "2025-06-28T11:19:12.000Z",
        "current_period_end_date": "2025-07-28T11:19:12.000Z",
        "canceled_at": null,
        "created_at": "2025-06-28T11:19:15.090Z",
        "updated_at": "2025-06-28T11:19:17.635Z",
        "metadata": {
          "env": "development",
          "user_id": testUserId,
          "user_email": testUserEmail,
          "user_logged_in": true
        },
        "mode": "test"
      }
    };
    
    await sendWebhook(subscriptionActiveEvent, 'subscription.active');
    
    // 2. 模拟 subscription.paid 事件
    console.log('\n📋 步骤2: 测试 subscription.paid 事件...');
    const subscriptionPaidEvent = {
      "id": "evt_sub_paid_" + Date.now(),
      "eventType": "subscription.paid",
      "created_at": Date.now(),
      "object": {
        "id": "sub_7eo1kmXcSo1G11vggbOb7M",
        "object": "subscription",
        "product": "prod_1yWRgfSXvAaYQ1HfRE44VR",
        "customer": "cust_3L4bopl9ACWHBC8h7akFCX",
        "collection_method": "charge_automatically",
        "status": "active",
        "current_period_start_date": "2025-06-28T11:19:12.000Z",
        "current_period_end_date": "2025-07-28T11:19:12.000Z",
        "canceled_at": null,
        "created_at": "2025-06-28T11:19:15.090Z",
        "updated_at": "2025-06-28T11:19:17.635Z",
        "metadata": {
          "env": "development",
          "user_id": testUserId,
          "user_email": testUserEmail,
          "user_logged_in": true
        },
        "mode": "test"
      }
    };
    
    await sendWebhook(subscriptionPaidEvent, 'subscription.paid');
    
    // 3. 检查数据库结果
    setTimeout(async () => {
      console.log('\n📋 步骤3: 检查数据库结果...');
      await checkDatabaseResults();
    }, 3000);
    
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

async function sendWebhook(webhookEvent, eventType) {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const payload = JSON.stringify(webhookEvent);
    const secret = process.env.CREEM_WEBHOOK_SECRET || 'test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    console.log(`🔔 发送 ${eventType} webhook...`);
    const response = await fetch('http://localhost:3001/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature
      },
      body: payload
    });
    
    const result = await response.text();
    console.log(`📊 ${eventType} 响应:`, response.status, response.ok ? '✅' : '❌');
    
    if (!response.ok) {
      console.log('响应内容:', result);
    }
  } catch (error) {
    console.error(`❌ ${eventType} 发送失败:`, error.message);
  }
}

async function checkDatabaseResults() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // 检查订阅记录
    console.log('🔍 检查订阅记录...');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (subError) {
      console.log('❌ 订阅记录查询失败:', subError.message);
    } else {
      console.log(`📋 订阅记录 (${subscriptions.length} 条):`);
      subscriptions.forEach((sub, index) => {
        console.log(`  ${index + 1}. ID: ${sub.id}`);
        console.log(`     Creem ID: ${sub.creem_subscription_id}`);
        console.log(`     状态: ${sub.status}`);
        console.log(`     周期: ${sub.current_period_start} 到 ${sub.current_period_end}`);
        console.log(`     取消标记: ${sub.cancel_at_period_end}`);
        console.log('');
      });
    }

    // 检查会员信息
    console.log('🔍 检查会员信息...');
    const { data: member, error: memberError } = await supabase
      .from('member_info')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (memberError) {
      console.log('❌ 会员信息查询失败:', memberError.message);
    } else {
      console.log('👑 会员信息:');
      console.log(`  - 状态: ${member.membership_status}`);
      console.log(`  - 级别: ${member.membership_level}`);
      console.log(`  - 过期时间: ${member.expires_at}`);
      console.log(`  - 关联订阅: ${member.last_subscription_id}`);
      console.log(`  - 关联支付: ${member.last_payment_id}`);
    }
    
    console.log('\n🎉 订阅流程测试完成！');
    
  } catch (err) {
    console.log('❌ 数据库检查异常:', err.message);
  }
}

testSubscriptionFlow();