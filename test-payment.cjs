require('dotenv').config({ path: '.env.local' });

async function testPaymentCreation() {
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const testPayload = {
      product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
      user_id: 'test-user-12345', // 测试用户ID
      request_id: `test_order_${Date.now()}`,
      metadata: {
        env: 'test',
        user_email: 'test@example.com',
        user_logged_in: true
      }
    };

    console.log('测试支付创建...');
    console.log('Payload:', testPayload);

    const response = await fetch('http://localhost:3001/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      console.log('✅ 支付创建成功！');
      console.log('Checkout ID:', result.id);
      
      // 检查数据库是否有记录
      setTimeout(async () => {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.VITE_SUPABASE_ANON_KEY
        );

        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('creem_checkout_id', result.id);

        if (error) {
          console.error('❌ 查询数据库失败:', error);
        } else if (data.length > 0) {
          console.log('✅ 数据库记录已创建:', data[0]);
        } else {
          console.log('❌ 数据库中没有找到记录');
        }
      }, 2000);
    } else {
      console.log('❌ 支付创建失败');
    }
  } catch (error) {
    console.error('❌ 测试错误:', error.message);
  }
}

testPaymentCreation();