require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? 'OK' : 'Missing');
console.log('Supabase Key:', process.env.VITE_SUPABASE_ANON_KEY ? 'OK' : 'Missing');

async function checkTables() {
  console.log('=== 检查数据库表是否存在 ===');
  
  const tables = ['payments', 'subscriptions', 'payment_providers', 'user_memberships'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ 表 ${table}: ${error.message}`);
      } else {
        console.log(`✅ 表 ${table}: 存在，共 ${count} 条记录`);
      }
    } catch (err) {
      console.log(`❌ 表 ${table}: ${err.message}`);
    }
  }
}

async function checkPayments() {
  console.log('\n=== 检查支付记录 ===');
  
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ 查询支付记录失败:', error.message);
    } else {
      console.log(`✅ 最近的支付记录 (${data.length} 条):`);
      data.forEach(payment => {
        console.log(`  - ID: ${payment.id}, Status: ${payment.status}, Amount: ${payment.amount}`);
      });
    }
  } catch (err) {
    console.log('❌ 查询支付记录异常:', err.message);
  }
}

async function main() {
  await checkTables();
  await checkPayments();
}

main().catch(console.error);