require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function analyzeTables() {
  console.log('=== 分析 Supabase 数据表结构 ===\n');
  
  const tables = ['payments', 'subscriptions', 'member_info'];
  
  for (const tableName of tables) {
    console.log(`📋 表: ${tableName}`);
    console.log('─'.repeat(50));
    
    try {
      // 查询表结构（通过插入空数据来获取列信息）
      const { error } = await supabase
        .from(tableName)
        .insert({})
        .select();
      
      if (error) {
        console.log('错误信息:', error.message);
        if (error.details) {
          console.log('详细信息:', error.details);
        }
      }
      
      // 查询现有数据
      const { data, error: selectError, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(3);
      
      if (selectError) {
        console.log('❌ 查询失败:', selectError.message);
      } else {
        console.log(`✅ 表存在，共 ${count} 条记录`);
        if (data && data.length > 0) {
          console.log('示例数据结构:');
          const sample = data[0];
          Object.keys(sample).forEach(key => {
            const value = sample[key];
            const type = typeof value;
            console.log(`  ${key}: ${type} = ${JSON.stringify(value)}`);
          });
        } else {
          console.log('表为空，无法显示结构');
        }
      }
    } catch (err) {
      console.log('❌ 异常:', err.message);
    }
    
    console.log('\n');
  }
  
  // 检查 conversation_sessions 表
  console.log('📋 检查现有的 conversation_sessions 表');
  console.log('─'.repeat(50));
  try {
    const { data, error, count } = await supabase
      .from('conversation_sessions')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.log('❌ conversation_sessions 查询失败:', error.message);
    } else {
      console.log(`✅ conversation_sessions 表存在，共 ${count} 条记录`);
      if (data && data.length > 0) {
        console.log('字段结构:');
        Object.keys(data[0]).forEach(key => {
          console.log(`  ${key}: ${typeof data[0][key]}`);
        });
      }
    }
  } catch (err) {
    console.log('❌ conversation_sessions 异常:', err.message);
  }
}

analyzeTables().catch(console.error);