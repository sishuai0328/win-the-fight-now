require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// 测试累积订阅时长逻辑
const testUserId = '50d10d83-b9a8-4253-bafb-c099f79ce825';

async function testCumulativeSubscription() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log('🚀 测试累积订阅时长逻辑...\n');
    
    // 模拟第三个订阅事件
    console.log('📋 模拟第三个订阅事件...');
    const thirdSubscriptionEvent = {
      "id": "evt_sub_third_" + Date.now(),
      "eventType": "subscription.active",
      "created_at": Date.now(),
      "object": {
        "id": "sub_THIRD_SUBSCRIPTION_TEST",
        "object": "subscription",
        "product": "prod_1yWRgfSXvAaYQ1HfRE44VR",
        "customer": "cust_3L4bopl9ACWHBC8h7akFCX",
        "collection_method": "charge_automatically",
        "status": "active",
        "current_period_start_date": "2025-06-29T12:00:00.000Z", // 明天开始
        "current_period_end_date": "2025-07-29T12:00:00.000Z",   // 又一个月
        "canceled_at": null,
        "created_at": new Date().toISOString(),
        "updated_at": new Date().toISOString(),
        "metadata": {
          "env": "development",
          "user_id": testUserId,
          "user_email": "sishuai0328@gmail.com",
          "user_logged_in": true
        },
        "mode": "test"
      }
    };
    
    // 发送第三个订阅事件
    const payload = JSON.stringify(thirdSubscriptionEvent);
    const secret = process.env.CREEM_WEBHOOK_SECRET || 'test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    console.log('🔔 发送第三个订阅 webhook...');
    const response = await fetch('http://localhost:3001/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature
      },
      body: payload
    });
    
    const result = await response.text();
    console.log('📊 响应:', response.status, response.ok ? '✅' : '❌');
    
    if (!response.ok) {
      console.log('响应内容:', result);
      return;
    }
    
    // 等待处理完成后检查结果
    setTimeout(async () => {
      console.log('\n📋 检查累积时长结果...');
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );

      // 检查所有订阅
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('status', 'active')
        .order('current_period_start', { ascending: true });

      if (subError) {
        console.log('❌ 订阅查询失败:', subError.message);
        return;
      }

      console.log(`📋 活跃订阅记录 (${subscriptions.length} 条):`);
      let totalDays = 0;
      
      subscriptions.forEach((sub, index) => {
        const startDate = new Date(sub.current_period_start);
        const endDate = new Date(sub.current_period_end);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        totalDays += days;
        
        console.log(`  ${index + 1}. Creem ID: ${sub.creem_subscription_id}`);
        console.log(`     周期: ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}`);
        console.log(`     天数: ${days} 天`);
      });
      
      console.log(`🧮 理论总天数: ${totalDays} 天`);

      // 检查会员信息
      const { data: member, error: memberError } = await supabase
        .from('member_info')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      if (memberError) {
        console.log('❌ 会员信息查询失败:', memberError.message);
      } else {
        console.log('\n👑 实际会员信息:');
        console.log(`  - 状态: ${member.membership_status}`);
        console.log(`  - 级别: ${member.membership_level}`);
        console.log(`  - 过期时间: ${member.expires_at}`);
        
        if (member.expires_at) {
          const now = new Date();
          const expiry = new Date(member.expires_at);
          const actualDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
          console.log(`  - 实际剩余天数: ${actualDays} 天`);
          
          if (actualDays >= totalDays * 0.9) { // 允许一些误差
            console.log('✅ 累积时长计算正确！');
          } else {
            console.log('❌ 累积时长计算有问题');
          }
        }
      }
      
      console.log('\n🎉 累积订阅测试完成！');
      
    }, 3000);
    
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testCumulativeSubscription();