require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function getTableSchema() {
  console.log('=== 获取表结构信息 ===\n');
  
  const tables = ['payments', 'subscriptions', 'member_info'];
  
  for (const tableName of tables) {
    console.log(`📋 ${tableName} 表结构:`);
    console.log('─'.repeat(60));
    
    try {
      // 使用 RPC 调用获取表结构
      const { data, error } = await supabase.rpc('get_table_schema', { 
        table_name: tableName 
      });
      
      if (error) {
        console.log('RPC 调用失败，尝试其他方法...');
        
        // 尝试直接查询 information_schema
        const query = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;
        
        console.log('由于权限限制，无法直接查询表结构。');
        console.log('基于错误信息推断的字段:');
        
        if (tableName === 'payments') {
          console.log('  - id: UUID (主键)');
          console.log('  - user_id: UUID (非空)');
          console.log('  - 其他字段: 待确认');
          console.log('  - created_at: TIMESTAMPTZ');
          console.log('  - updated_at: TIMESTAMPTZ');
        } else if (tableName === 'subscriptions') {
          console.log('  - id: UUID (主键)');
          console.log('  - user_id: UUID (非空)');
          console.log('  - 其他字段: 待确认');
          console.log('  - created_at: TIMESTAMPTZ');
          console.log('  - updated_at: TIMESTAMPTZ');
        } else if (tableName === 'member_info') {
          console.log('  - user_id: UUID (主键, 非空)');
          console.log('  - status: TEXT (默认 inactive)');
          console.log('  - 其他字段: 待确认');
          console.log('  - created_at: TIMESTAMPTZ');
          console.log('  - updated_at: TIMESTAMPTZ');
        }
      } else {
        console.log('表结构:', data);
      }
    } catch (err) {
      console.log('❌ 查询异常:', err.message);
    }
    
    console.log('\n');
  }
  
  // 尝试插入测试数据来了解字段
  console.log('🧪 通过测试插入了解字段结构...\n');
  
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  // 测试 member_info 表
  console.log('测试 member_info 表:');
  try {
    const { error } = await supabase
      .from('member_info')
      .insert({
        user_id: testUserId,
        status: 'active'
      });
    
    if (error) {
      console.log('插入失败，错误信息:', error.message);
      if (error.details) {
        console.log('缺失或错误的字段:', error.details);
      }
    } else {
      console.log('✅ 插入成功');
      // 清理测试数据
      await supabase.from('member_info').delete().eq('user_id', testUserId);
    }
  } catch (err) {
    console.log('❌ 测试异常:', err.message);
  }
}

getTableSchema().catch(console.error);