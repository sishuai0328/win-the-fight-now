require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCurrentPayments() {
  const userId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
  const checkoutId = 'ch_5EnoPHC4cdOWsWTKs8esfZ'; // 最新的
  const creemOrderId = 'ord_1hFF5prrVK6Hyhkd7FNreD'; // Creem 真实订单ID
  
  console.log('🔍 检查当前支付记录...\n');
  console.log('用户ID:', userId);
  console.log('Checkout ID:', checkoutId);
  console.log('Creem 真实订单ID:', creemOrderId);
  
  try {
    // 1. 查看所有支付记录
    console.log('\n📋 步骤1: 查看所有支付记录...');
    const { data: allPayments, error: allError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.log('❌ 查询失败:', allError.message);
      return;
    }
    
    console.log(`💳 所有支付记录 (${allPayments.length} 条):`);
    allPayments.forEach((payment, index) => {
      console.log(`\n  ${index + 1}. ID: ${payment.id}`);
      console.log(`     状态: ${payment.status}`);
      console.log(`     我们的订单ID: ${payment.creem_order_id}`);
      console.log(`     Checkout ID: ${payment.creem_checkout_id}`);
      console.log(`     金额: ${payment.amount} ${payment.currency}`);
      console.log(`     创建时间: ${payment.created_at}`);
    });
    
    // 2. 查找匹配的记录
    console.log('\n📋 步骤2: 查找最新支付记录...');
    const latestPayment = allPayments.find(p => p.creem_checkout_id === checkoutId);
    
    if (latestPayment) {
      console.log('✅ 找到匹配的支付记录:');
      console.log('  - 数据库ID:', latestPayment.id);
      console.log('  - 我们保存的订单ID:', latestPayment.creem_order_id);
      console.log('  - Checkout ID:', latestPayment.creem_checkout_id);
      console.log('  - 当前状态:', latestPayment.status);
      
      // 3. 更新为正确的 Creem 订单ID
      console.log('\n📋 步骤3: 更新为正确的 Creem 订单ID...');
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          creem_order_id: creemOrderId, // 更新为真实的 Creem 订单ID
          status: 'completed', // 同时标记为已完成
          updated_at: new Date().toISOString()
        })
        .eq('id', latestPayment.id)
        .select()
        .single();
      
      if (updateError) {
        console.log('❌ 更新失败:', updateError.message);
      } else {
        console.log('✅ 订单ID更新成功:');
        console.log('  - 新的 Creem 订单ID:', updatedPayment.creem_order_id);
        console.log('  - 状态:', updatedPayment.status);
        
        // 4. 同时更新会员状态
        console.log('\n📋 步骤4: 更新会员状态...');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 31);
        
        const { data: member, error: memberError } = await supabase
          .from('member_info')
          .upsert({
            user_id: userId,
            membership_status: 'active',
            membership_level: 'premium',
            expires_at: expiresAt.toISOString(),
            last_payment_id: latestPayment.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          .select()
          .single();
        
        if (memberError) {
          console.log('❌ 会员状态更新失败:', memberError.message);
        } else {
          console.log('✅ 会员状态更新成功:');
          console.log('  - 状态:', member.membership_status);
          console.log('  - 级别:', member.membership_level);
          console.log('  - 过期时间:', member.expires_at);
        }
      }
    } else {
      console.log('❌ 未找到匹配的支付记录');
      console.log('可能的 Checkout ID:', allPayments.map(p => p.creem_checkout_id));
    }
    
    console.log('\n🎉 检查完成!');
    
  } catch (err) {
    console.log('❌ 操作异常:', err.message);
  }
}

checkCurrentPayments().catch(console.error);