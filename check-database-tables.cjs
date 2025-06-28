require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDatabaseTables() {
  console.log('🔍 检查 Supabase 数据库表结构...\n');
  
  try {
    // 1. 检查 payments 表
    console.log('📋 步骤1: 检查 payments 表结构...');
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
    
    if (paymentsError) {
      console.log('❌ Payments 表查询失败:', paymentsError.message);
    } else {
      console.log('✅ Payments 表字段:');
      if (paymentsData.length > 0) {
        Object.keys(paymentsData[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof paymentsData[0][key]}`);
        });
      } else {
        console.log('  表为空，无法确定字段结构');
      }
    }
    
    // 2. 检查 subscriptions 表
    console.log('\n📋 步骤2: 检查 subscriptions 表结构...');
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (subscriptionsError) {
      console.log('❌ Subscriptions 表查询失败:', subscriptionsError.message);
      console.log('可能需要创建 subscriptions 表');
    } else {
      console.log('✅ Subscriptions 表字段:');
      if (subscriptionsData.length > 0) {
        Object.keys(subscriptionsData[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof subscriptionsData[0][key]}`);
        });
      } else {
        console.log('  表存在但为空');
      }
    }
    
    // 3. 检查 member_info 表
    console.log('\n📋 步骤3: 检查 member_info 表结构...');
    const { data: memberInfoData, error: memberInfoError } = await supabase
      .from('member_info')
      .select('*')
      .limit(1);
    
    if (memberInfoError) {
      console.log('❌ Member_info 表查询失败:', memberInfoError.message);
    } else {
      console.log('✅ Member_info 表字段:');
      if (memberInfoData.length > 0) {
        Object.keys(memberInfoData[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof memberInfoData[0][key]}`);
        });
      } else {
        console.log('  表存在但为空');
      }
    }
    
    // 4. 测试插入 subscriptions 记录
    console.log('\n📋 步骤4: 测试 subscriptions 表插入...');
    const testSubscriptionData = {
      user_id: '50d10d83-b9a8-4253-bafb-c099f79ce825',
      creem_subscription_id: 'sub_test_123',
      creem_customer_id: 'cust_test_123',
      product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      metadata: { test: true }
    };
    
    const { data: testSub, error: testSubError } = await supabase
      .from('subscriptions')
      .insert(testSubscriptionData)
      .select()
      .single();
    
    if (testSubError) {
      console.log('❌ Subscriptions 插入测试失败:', testSubError.message);
      console.log('可能需要调整字段名或类型');
    } else {
      console.log('✅ Subscriptions 插入测试成功');
      console.log('插入的记录ID:', testSub.id);
      
      // 清理测试数据
      await supabase.from('subscriptions').delete().eq('id', testSub.id);
      console.log('🧹 测试数据已清理');
    }
    
    console.log('\n🎉 数据库检查完成！');
    
  } catch (err) {
    console.log('❌ 检查异常:', err.message);
  }
}

checkDatabaseTables().catch(console.error);