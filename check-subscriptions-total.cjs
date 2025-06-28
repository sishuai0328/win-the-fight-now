require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSubscriptionsTotal() {
  const testUserId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
  
  console.log('🔍 检查用户订阅总时长计算...\n');
  
  try {
    // 1. 查看用户的所有订阅
    console.log('📋 步骤1: 查看用户所有订阅记录...');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true });

    if (subError) {
      console.log('❌ 订阅查询失败:', subError.message);
      return;
    }

    console.log(`📋 用户订阅记录 (${subscriptions.length} 条):`);
    let totalDays = 0;
    
    subscriptions.forEach((sub, index) => {
      const startDate = new Date(sub.current_period_start);
      const endDate = new Date(sub.current_period_end);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      totalDays += days;
      
      console.log(`  ${index + 1}. ID: ${sub.id}`);
      console.log(`     Creem ID: ${sub.creem_subscription_id}`);
      console.log(`     状态: ${sub.status}`);
      console.log(`     周期: ${sub.current_period_start} 到 ${sub.current_period_end}`);
      console.log(`     天数: ${days} 天`);
      console.log(`     创建时间: ${sub.created_at}`);
      console.log('');
    });
    
    console.log(`🧮 总订阅天数: ${totalDays} 天`);
    
    // 2. 计算新的过期时间
    console.log('\n📋 步骤2: 计算累积过期时间...');
    
    if (subscriptions.length > 0) {
      // 找到最早的开始时间
      const earliestStart = new Date(Math.min(...subscriptions.map(s => new Date(s.current_period_start))));
      // 计算累积的过期时间
      const accumulatedExpiry = new Date(earliestStart);
      accumulatedExpiry.setDate(accumulatedExpiry.getDate() + totalDays);
      
      console.log(`📅 最早开始时间: ${earliestStart.toISOString()}`);
      console.log(`📅 累积过期时间: ${accumulatedExpiry.toISOString()}`);
      
      // 3. 更新会员信息
      console.log('\n📋 步骤3: 更新会员信息为累积时长...');
      const { data: updatedMember, error: memberError } = await supabase
        .from('member_info')
        .update({
          membership_status: 'active',
          membership_level: 'premium',
          expires_at: accumulatedExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', testUserId)
        .select()
        .single();
      
      if (memberError) {
        console.log('❌ 会员信息更新失败:', memberError.message);
      } else {
        console.log('✅ 会员信息已更新:');
        console.log(`  - 状态: ${updatedMember.membership_status}`);
        console.log(`  - 级别: ${updatedMember.membership_level}`);
        console.log(`  - 过期时间: ${updatedMember.expires_at}`);
        
        const now = new Date();
        const expiry = new Date(updatedMember.expires_at);
        const remainingDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        console.log(`  - 剩余天数: ${remainingDays} 天`);
      }
    }
    
    console.log('\n🎉 订阅总时长检查完成！');
    
  } catch (err) {
    console.log('❌ 操作异常:', err.message);
  }
}

checkSubscriptionsTotal().catch(console.error);