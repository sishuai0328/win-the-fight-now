require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixPaymentRecord() {
  console.log('🔧 修复支付记录...\n');
  
  // 从日志中获取的实际数据
  const checkoutId = 'ch_2oqgmXD0geMtyPBXisf3q';
  const userId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
  const userEmail = 'sishuai0328@gmail.com';
  const orderId = `order_${Date.now()}`;
  
  console.log('支付信息:');
  console.log('- Checkout ID:', checkoutId);
  console.log('- User ID:', userId);
  console.log('- Email:', userEmail);
  
  try {
    // 1. 先检查 payments 表的实际结构，通过尝试插入最少的必需字段
    console.log('\n📋 步骤1: 检查 payments 表结构...');
    
    const minimalPayment = {
      user_id: userId,
      creem_order_id: orderId,
      creem_checkout_id: checkoutId,
      product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
      amount: 5.00,
      currency: 'USD',
      status: 'pending'
    };
    
    console.log('尝试插入最小字段集...');
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(minimalPayment)
      .select()
      .single();
    
    if (paymentError) {
      console.log('❌ payments 表插入失败:', paymentError.message);
      console.log('错误详情:', paymentError.details);
      
      // 尝试更简化的版本
      console.log('\n尝试更简化的字段...');
      const simplePayment = {
        user_id: userId,
        status: 'pending'
      };
      
      const { data: simpleResult, error: simpleError } = await supabase
        .from('payments')
        .insert(simplePayment)
        .select()
        .single();
        
      if (simpleError) {
        console.log('❌ 简化版本也失败:', simpleError.message);
        return;
      } else {
        console.log('✅ 简化版本插入成功:', simpleResult);
      }
    } else {
      console.log('✅ payments 记录创建成功:', payment.id);
    }
    
    // 2. 创建或更新会员信息（模拟支付成功）
    console.log('\n📋 步骤2: 更新会员信息...');
    
    // 31天后过期
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 31);
    
    const memberData = {
      user_id: userId,
      status: 'active',
      membership_type: 'premium',
      expires_at: expiresAt.toISOString(),
      total_usage_count: 0
    };
    
    console.log('会员数据:', memberData);
    
    const { data: member, error: memberError } = await supabase
      .from('member_info')
      .upsert(memberData, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (memberError) {
      console.log('❌ member_info 更新失败:', memberError.message);
      console.log('错误详情:', memberError.details);
    } else {
      console.log('✅ 会员信息更新成功!');
      console.log('会员状态:', member.status);
      console.log('会员类型:', member.membership_type);
      console.log('过期时间:', member.expires_at);
    }
    
    // 3. 验证结果
    console.log('\n📋 步骤3: 验证最终结果...');
    
    const { data: allPayments, error: checkError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);
    
    if (checkError) {
      console.log('❌ 查询支付记录失败:', checkError.message);
    } else {
      console.log(`✅ 用户支付记录 (${allPayments.length} 条):`, allPayments);
    }
    
    const { data: memberInfo, error: memberCheckError } = await supabase
      .from('member_info')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (memberCheckError) {
      console.log('❌ 查询会员信息失败:', memberCheckError.message);
    } else {
      console.log('✅ 当前会员信息:', memberInfo);
    }
    
  } catch (err) {
    console.log('❌ 操作异常:', err.message);
  }
}

fixPaymentRecord().catch(console.error);