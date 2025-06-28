# Creem 支付回调完整设置指南

## 🎯 功能概述

完整的 Creem 支付集成，包括：
- 支付会话创建
- Webhook 事件处理  
- 数据库记录管理
- 用户会员状态自动更新
- 订阅生命周期管理

## 📋 数据库表结构

### 1. payments 表
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  creem_order_id TEXT NOT NULL,
  creem_checkout_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) NOT NULL,
  webhook_event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. subscriptions 表
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  creem_subscription_id TEXT NOT NULL UNIQUE,
  creem_customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'canceled', 'expired', 'trialing', 'past_due')) NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. payment_providers 表
```sql
CREATE TABLE payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_type TEXT CHECK (provider_type IN ('creem', 'stripe', 'paypal')) NOT NULL,
  api_key TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_test_mode BOOLEAN DEFAULT TRUE,
  configuration JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. user_memberships 表
```sql
CREATE TABLE user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  membership_type TEXT CHECK (membership_type IN ('free', 'premium', 'enterprise')) NOT NULL DEFAULT 'free',
  subscription_id UUID REFERENCES subscriptions(id),
  is_active BOOLEAN DEFAULT FALSE,
  feature_limits JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## ⚙️ 环境变量配置

### .env.local
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Creem
VITE_CREEM_API_KEY=creem_test_your-test-key
CREEM_WEBHOOK_SECRET=whsec_your-webhook-secret
```

## 🔧 Webhook 配置

### 1. 本地开发
```bash
# 使用 ngrok 暴露本地端点
ngrok http 3000

# 在 Creem 后台配置 Webhook URL
https://your-ngrok-url.ngrok.io/api/webhook
```

### 2. 生产环境
```bash
# Vercel 部署后的 Webhook URL
https://your-domain.vercel.app/api/webhook
```

### 3. Webhook 事件处理

支持的事件类型：
- `checkout.completed` - 支付完成
- `subscription.paid` - 订阅支付成功
- `subscription.active` - 订阅激活
- `subscription.canceled` - 订阅取消
- `subscription.expired` - 订阅过期
- `refund.created` - 退款创建

## 🚀 部署和测试

### 1. 启动本地开发
```bash
# 启动代理服务器和前端
npm run dev:full

# 或分别启动
npm run proxy  # 终端1
npm run dev    # 终端2
```

### 2. 测试支付流程
1. 访问 `http://localhost:5174/`
2. 登录账户  
3. 点击"立即升级"
4. 使用测试卡号：`4242 4242 4242 4242`
5. 完成支付后检查数据库记录

### 3. 验证 Webhook 处理
```bash
# 检查 Vercel 函数日志
vercel logs

# 或在 Vercel 控制台查看函数执行日志
```

## 📊 数据流程

### 支付流程
1. **创建支付** → `payments` 表插入记录（状态：pending）
2. **Webhook 接收** → 验证签名 
3. **更新支付** → `payments` 表更新状态（completed/failed）
4. **更新会员** → `user_memberships` 表更新等级

### 订阅流程  
1. **订阅创建** → `subscriptions` 表插入记录
2. **定期支付** → `subscription.paid` 事件
3. **续费处理** → 更新 `current_period_end`
4. **取消处理** → 标记 `cancel_at_period_end`
5. **过期处理** → 降级会员等级

## 🔍 调试工具

### 1. 查看支付记录
```sql
SELECT p.*, u.email 
FROM payments p 
JOIN auth.users u ON p.user_id = u.id 
ORDER BY p.created_at DESC;
```

### 2. 查看用户会员状态
```sql
SELECT um.*, u.email 
FROM user_memberships um 
JOIN auth.users u ON um.user_id = u.id;
```

### 3. 查看订阅状态
```sql
SELECT s.*, u.email 
FROM subscriptions s 
JOIN auth.users u ON s.user_id = u.id 
WHERE s.status = 'active';
```

## 🛠️ 常见问题

### 1. Webhook 签名验证失败
- 检查 `CREEM_WEBHOOK_SECRET` 环境变量
- 确认使用正确的签名算法（HMAC-SHA256）

### 2. 数据库权限错误
- 确保使用 `SUPABASE_SERVICE_ROLE_KEY`
- 检查 RLS 策略配置

### 3. 用户ID映射问题
- Creem `customer_id` 需要映射到 Supabase `user_id`
- 在创建支付时在 metadata 中传递 `user_id`

## 📝 API 端点

- `POST /api/create-checkout` - 创建支付会话
- `POST /api/webhook` - 处理 Creem Webhook 事件

## 🔐 安全考虑

1. **Webhook 签名验证** - 防止伪造请求
2. **环境变量保护** - 敏感信息不暴露
3. **数据库权限** - 使用最小权限原则
4. **错误处理** - 避免信息泄露

## 📈 监控建议

1. **支付成功率** - 监控 completed vs failed 比例
2. **Webhook 处理** - 监控处理失败的事件
3. **用户升级** - 跟踪免费到付费的转化
4. **订阅流失** - 监控取消和过期事件