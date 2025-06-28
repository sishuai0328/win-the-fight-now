require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugRealPayment() {
  const testOrderId = 'ord_1751101107473_nsu2jrzdb'; // 系统生成的订单ID
  const realCreemOrderId = 'ord_5qWsCeMu6M9i6XEQE8GuVo'; // Creem 平台的真实订单ID
  
  console.log('🔍 调试真实支付记录...\n');
  console.log('系统订单ID:', testOrderId);
  console.log('Creem 真实订单ID:', realCreemOrderId);
  
  try {
    // 1. 查看当前支付记录
    console.log('\n📋 步骤1: 查看当前支付记录...');
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', testOrderId)
      .single();
    
    if (paymentError) {
      console.log('❌ 查询失败:', paymentError.message);
      return;
    }
    
    console.log('💳 当前支付记录:');
    console.log('  - 系统订单ID:', payment.order_id);
    console.log('  - 保存的 Creem 订单ID:', payment.creem_order_id);
    console.log('  - Checkout ID:', payment.creem_checkout_id);
    console.log('  - 状态:', payment.status);
    console.log('  - 完成时间:', payment.completed_at);
    
    // 2. 更新为真实的 Creem 订单ID
    console.log('\n📋 步骤2: 更新为真实的 Creem 订单ID...');
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        creem_order_id: realCreemOrderId, // 使用真实的 Creem 订单ID
        updated_at: new Date().toISOString()
      })
      .eq('order_id', testOrderId)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ 更新失败:', updateError.message);
    } else {
      console.log('✅ 订单ID更新成功:');
      console.log('  - 系统订单ID:', updatedPayment.order_id);
      console.log('  - 新的 Creem 订单ID:', updatedPayment.creem_order_id);
      console.log('  - 状态:', updatedPayment.status);
    }
    
    // 3. 分析问题原因
    console.log('\n📋 步骤3: 分析问题原因...');
    console.log('❓ 为什么保存了错误的 Creem 订单ID？');
    console.log('');
    console.log('可能的原因:');
    console.log('1. 测试 webhook 使用了模拟数据，而不是真实的 Creem webhook');
    console.log('2. 真实的 Creem webhook 可能还没有发送到我们的系统');
    console.log('3. webhook 端点配置可能有问题');
    console.log('');
    console.log('解决方案:');
    console.log('1. 检查 Creem 后台的 webhook 配置');
    console.log('2. 确保 webhook URL 指向正确的端点');
    console.log('3. 等待真实的 webhook 事件');
    console.log('4. 或者手动触发 webhook 测试');
    
    // 4. 创建真实的 webhook 模拟
    console.log('\n📋 步骤4: 创建真实 webhook 模拟...');
    
    const realWebhookData = {
      "id": "evt_real_" + Date.now(),
      "eventType": "checkout.completed",
      "created_at": Date.now(),
      "object": {
        "id": payment.creem_checkout_id, // 使用真实的 checkout ID
        "object": "checkout",
        "request_id": testOrderId, // 我们的系统订单ID
        "order": {
          "id": realCreemOrderId, // 真实的 Creem 订单ID
          "customer": "cust_real_customer",
          "product": "prod_1yWRgfSXvAaYQ1HfRE44VR",
          "amount": 500,
          "currency": "USD",
          "status": "paid",
          "type": "one_time",
          "created_at": new Date().toISOString(),
          "updated_at": new Date().toISOString(),
          "mode": "test"
        },
        "status": "completed",
        "metadata": {
          "env": "development",
          "user_id": payment.user_id,
          "user_email": "sishuai0328@gmail.com",
          "user_logged_in": true
        },
        "mode": "test"
      }
    };
    
    console.log('🔔 准备发送真实 webhook 数据:');
    console.log('  - Request ID (匹配键):', realWebhookData.object.request_id);
    console.log('  - 真实 Creem 订单ID:', realWebhookData.object.order.id);
    console.log('  - Checkout ID:', realWebhookData.object.id);
    
    // 发送真实的 webhook
    const crypto = require('crypto');
    const payload = JSON.stringify(realWebhookData);
    const secret = process.env.CREEM_WEBHOOK_SECRET || 'test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    console.log('\n📡 发送真实 webhook...');
    const response = await fetch('http://localhost:3001/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature
      },
      body: payload
    });
    
    const result = await response.text();
    console.log('状态码:', response.status);
    console.log('响应:', result);
    
    if (response.ok) {
      // 再次检查更新结果
      setTimeout(async () => {
        const { data: finalPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', testOrderId)
          .single();
        
        console.log('\n🎯 最终结果:');
        console.log('  - 系统订单ID:', finalPayment.order_id);
        console.log('  - Creem 订单ID:', finalPayment.creem_order_id);
        console.log('  - 是否匹配真实ID:', finalPayment.creem_order_id === realCreemOrderId ? '✅ 是' : '❌ 否');
      }, 2000);
    }
    
  } catch (err) {
    console.log('❌ 操作异常:', err.message);
  }
}

debugRealPayment().catch(console.error);