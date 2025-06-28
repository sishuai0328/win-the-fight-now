require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyPaymentSystem() {
  const userId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
  
  console.log('🔍 验证支付系统状态...\n');
  
  try {
    // 1. 检查支付记录
    console.log('📋 步骤1: 检查支付记录...');
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (paymentError) {
      console.log('❌ 支付记录查询失败:', paymentError.message);
    } else {
      console.log(`💳 支付记录 (${payments.length} 条):`);
      payments.forEach((payment, index) => {
        console.log(`  ${index + 1}. ID: ${payment.id}`);
        console.log(`     状态: ${payment.status}`);
        console.log(`     金额: ${payment.amount} ${payment.currency}`);
        console.log(`     Checkout: ${payment.creem_checkout_id}`);
        console.log(`     创建时间: ${payment.created_at}`);
        console.log('');
      });
    }
    
    // 2. 检查会员信息
    console.log('📋 步骤2: 检查会员信息...');
    const { data: member, error: memberError } = await supabase
      .from('member_info')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (memberError) {
      console.log('❌ 会员信息查询失败:', memberError.message);
    } else {
      console.log('👑 会员信息:');
      console.log(`     用户ID: ${member.user_id}`);
      console.log(`     状态: ${member.membership_status}`);
      console.log(`     级别: ${member.membership_level}`);
      console.log(`     过期时间: ${member.expires_at}`);
      console.log(`     积分: ${member.points}`);
      console.log(`     最后支付: ${member.last_payment_id}`);
      
      // 3. 检查会员是否有效
      console.log('\n📋 步骤3: 检查会员有效性...');
      const now = new Date();
      const expiresDate = member.expires_at ? new Date(member.expires_at) : null;
      
      let isValid = false;
      let message = '';
      
      if (member.membership_status !== 'active') {
        message = '会员状态非激活';
      } else if (!expiresDate) {
        message = '无过期时间设置';
      } else if (now > expiresDate) {
        message = '会员已过期';
      } else {
        isValid = true;
        const daysRemaining = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
        message = `剩余 ${daysRemaining} 天`;
      }
      
      console.log(`🎯 会员有效性: ${isValid ? '✅ 有效' : '❌ 无效'} (${message})`);
    }
    
    // 4. 测试新支付创建 (不真正提交)
    console.log('\n📋 步骤4: 测试支付创建功能...');
    
    const testPayload = {
      product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
      user_id: 'test-user-new',
      request_id: `test_order_${Date.now()}`,
      metadata: {
        env: 'test',
        user_email: 'test@example.com'
      }
    };
    
    console.log('测试支付创建 (模拟)...');
    try {
      // 模拟插入支付记录
      const { data: testPayment, error: testError } = await supabase
        .from('payments')
        .insert({
          user_id: testPayload.user_id,
          creem_order_id: testPayload.request_id,
          creem_checkout_id: 'ch_test_' + Date.now(),
          product_id: testPayload.product_id,
          amount: 5.00,
          currency: 'USD',
          status: 'pending'
        })
        .select()
        .single();
      
      if (testError) {
        console.log('❌ 测试支付创建失败:', testError.message);
      } else {
        console.log('✅ 测试支付创建成功:', testPayment.id);
        
        // 清理测试数据
        await supabase.from('payments').delete().eq('id', testPayment.id);
        console.log('🧹 测试数据已清理');
      }
    } catch (err) {
      console.log('❌ 测试异常:', err.message);
    }
    
    console.log('\n🎉 验证完成!');
    
  } catch (err) {
    console.log('❌ 验证异常:', err.message);
  }
}

verifyPaymentSystem().catch(console.error);