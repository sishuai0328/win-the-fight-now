require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function completePayment() {
  const checkoutId = 'ch_2oqgmXD0geMtyPBXisf3q';
  const userId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
  const creemOrderId = 'ord_1HNdsExbZVC5wnJGOT41Op'; // 你提供的真实订单ID
  
  console.log('🎯 完成支付处理...\n');
  console.log('- Checkout ID:', checkoutId);
  console.log('- Creem Order ID:', creemOrderId);
  console.log('- User ID:', userId);
  
  try {
    // 1. 更新支付状态为completed
    console.log('\n📋 步骤1: 更新支付状态...');
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('creem_checkout_id', checkoutId)
      .select()
      .single();
    
    if (paymentError) {
      console.log('❌ 支付状态更新失败:', paymentError.message);
      return;
    }
    
    console.log('✅ 支付状态更新成功:', payment.status);
    
    // 2. 更新会员信息为付费会员 (31天)
    console.log('\n📋 步骤2: 升级会员状态...');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 31); // 31天会员
    
    const memberUpdate = {
      membership_status: 'active',
      membership_level: 'premium', 
      expires_at: expiresAt.toISOString(),
      last_payment_id: payment.id,
      updated_at: new Date().toISOString()
    };
    
    console.log('会员更新数据:', memberUpdate);
    
    const { data: member, error: memberError } = await supabase
      .from('member_info')
      .update(memberUpdate)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (memberError) {
      console.log('❌ 会员状态更新失败:', memberError.message);
    } else {
      console.log('✅ 会员状态更新成功!');
      console.log('会员状态:', member.membership_status);
      console.log('会员级别:', member.membership_level);
      console.log('过期时间:', member.expires_at);
    }
    
    // 3. 验证最终结果
    console.log('\n📋 步骤3: 验证最终结果...');
    
    // 查询支付记录
    const { data: finalPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    console.log(`💳 已完成支付 (${finalPayment.length} 条):`, finalPayment);
    
    // 查询会员信息
    const { data: finalMember } = await supabase
      .from('member_info')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log('👑 当前会员状态:', {
      状态: finalMember.membership_status,
      级别: finalMember.membership_level,
      过期时间: finalMember.expires_at,
      关联支付: finalMember.last_payment_id
    });
    
    // 4. 检查会员是否有效
    const now = new Date();
    const expiresDate = new Date(finalMember.expires_at);
    const isActive = finalMember.membership_status === 'active' && now < expiresDate;
    
    console.log('\n🎉 支付处理完成!');
    console.log('会员是否有效:', isActive ? '✅ 是' : '❌ 否');
    if (isActive) {
      const daysRemaining = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
      console.log('剩余天数:', daysRemaining, '天');
    }
    
  } catch (err) {
    console.log('❌ 处理异常:', err.message);
  }
}

completePayment().catch(console.error);