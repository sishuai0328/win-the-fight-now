require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkMemberInfo() {
  const userId = '50d10d83-b9a8-4253-bafb-c099f79ce825';
  
  console.log('🔍 检查 member_info 表结构...\n');
  
  try {
    // 1. 查看现有数据
    console.log('步骤1: 查看现有数据...');
    const { data: existing, error: existingError } = await supabase
      .from('member_info')
      .select('*')
      .limit(5);
    
    if (existingError) {
      console.log('❌ 查询现有数据失败:', existingError.message);
    } else {
      console.log(`📊 现有数据 (${existing.length} 条):`, existing);
      if (existing.length > 0) {
        console.log('字段列表:', Object.keys(existing[0]));
      }
    }
    
    // 2. 尝试插入最少字段
    console.log('\n步骤2: 尝试插入最少字段...');
    const minimalMember = {
      user_id: userId
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('member_info')
      .insert(minimalMember)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ 最少字段插入失败:', insertError.message);
      console.log('详情:', insertError.details);
      
      // 3. 尝试猜测可能的字段名
      console.log('\n步骤3: 尝试常见字段名...');
      const testFields = [
        { user_id: userId, status: 'active' },
        { user_id: userId, type: 'premium' },
        { user_id: userId, member_type: 'premium' },
        { user_id: userId, plan: 'premium' },
        { user_id: userId, is_premium: true }
      ];
      
      for (const fields of testFields) {
        console.log(`尝试字段:`, Object.keys(fields));
        const { data: testResult, error: testError } = await supabase
          .from('member_info')
          .upsert(fields, { onConflict: 'user_id' })
          .select()
          .single();
        
        if (!testError) {
          console.log('✅ 成功插入字段:', fields);
          console.log('结果:', testResult);
          break;
        } else {
          console.log('❌ 失败:', testError.message);
        }
      }
    } else {
      console.log('✅ 最少字段插入成功:', insertResult);
    }
    
    // 4. 最终检查用户数据
    console.log('\n步骤4: 检查用户数据...');
    const { data: userMember, error: userError } = await supabase
      .from('member_info')
      .select('*')
      .eq('user_id', userId);
    
    if (userError) {
      console.log('❌ 查询用户数据失败:', userError.message);
    } else {
      console.log(`👤 用户会员数据 (${userMember.length} 条):`, userMember);
    }
    
  } catch (err) {
    console.log('❌ 检查异常:', err.message);
  }
}

checkMemberInfo().catch(console.error);