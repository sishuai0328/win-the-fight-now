require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSubscriptionsSchema() {
  console.log('🔍 检查 subscriptions 表实际结构...\n');
  
  try {
    // 尝试插入一个简化的订阅记录来了解实际字段
    const testData = {
      user_id: '50d10d83-b9a8-4253-bafb-c099f79ce825',
      creem_subscription_id: 'sub_test_schema_check',
      creem_customer_id: 'cust_test_123',
      product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
      status: 'active',
      current_period_start: '2025-06-28T11:19:12.000Z',
      current_period_end: '2025-07-28T11:19:12.000Z'
    };
    
    console.log('📋 尝试插入基础订阅记录...');
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(testData)
      .select()
      .single();
    
    if (subError) {
      console.log('❌ 基础插入失败:', subError.message);
      
      // 尝试不同的字段名
      console.log('\n📋 尝试可能的字段名变体...');
      const variants = [
        { ...testData, cancelled_at_period_end: false },
        { ...testData, cancel_at_end: false },
        { ...testData, auto_cancel: false }
      ];
      
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const fieldName = Object.keys(variant).find(key => !testData.hasOwnProperty(key));
        
        console.log(`尝试字段: ${fieldName}`);
        const { data: variantSub, error: variantError } = await supabase
          .from('subscriptions')
          .insert(variant)
          .select()
          .single();
        
        if (variantError) {
          console.log(`  ❌ ${fieldName}: ${variantError.message}`);
        } else {
          console.log(`  ✅ ${fieldName}: 成功插入`);
          console.log('插入的记录:', variantSub);
          
          // 清理测试数据
          await supabase.from('subscriptions').delete().eq('id', variantSub.id);
          break;
        }
      }
    } else {
      console.log('✅ 基础插入成功');
      console.log('实际字段结构:');
      Object.keys(subscription).forEach(key => {
        console.log(`  - ${key}: ${typeof subscription[key]} = ${subscription[key]}`);
      });
      
      // 清理测试数据
      await supabase.from('subscriptions').delete().eq('id', subscription.id);
      console.log('🧹 测试数据已清理');
    }
    
    console.log('\n🎉 Schema 检查完成！');
    
  } catch (err) {
    console.log('❌ 检查异常:', err.message);
  }
}

checkSubscriptionsSchema().catch(console.error);