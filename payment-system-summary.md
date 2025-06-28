# 更新后的支付系统架构总结

## ✅ 完成状态

支付系统已成功更新为新的数据库架构，所有功能正常运行。

## 🗄️ 数据库架构

### Payments 表结构
```sql
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id varchar(50) UNIQUE NOT NULL,  -- 系统内部唯一订单ID
  user_id uuid NOT NULL,
  product_id varchar(50) NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  status varchar(20) NOT NULL DEFAULT 'pending',
  creem_checkout_id varchar(50),          -- Creem 返回的 checkout ID
  creem_order_id varchar(50),             -- Creem 平台的订单ID
  customer_email varchar(255),
  metadata jsonb,
  payment_method varchar(20),
  error_code varchar(50),
  error_message text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp
);
```

## 🔄 字段映射关系

### 发送到 Creem (创建支付)
- `payments.order_id` → `request_id` (API 参数)
- `payments.product_id` → `product_id` (API 参数)
- `payments.customer_email` → `customer.email` (API 参数)
- `payments.metadata` → `metadata` (API 参数)

### 接收自 Creem (webhook 回调)
- `id` (API 响应) → `payments.creem_checkout_id`
- `order_id` (webhook) → `payments.creem_order_id`
- `status` (webhook) → `payments.status`
- `request_id` (webhook) → 用于匹配 `payments.order_id`
- `payment_method` (webhook) → `payments.payment_method`
- `created_at` (webhook) → `payments.completed_at`

## 📋 支付流程

### 1. 创建支付订单
```javascript
// 生成系统内部订单ID
const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 发送到 Creem API
const checkoutParams = {
  product_id: 'prod_1yWRgfSXvAaYQ1HfRE44VR',
  request_id: orderId,  // 系统订单ID
  customer: { email: customerEmail },
  metadata: { user_id, env: 'development' }
};

// 保存到数据库
await supabase.from('payments').insert({
  order_id: orderId,           // 主键，唯一标识
  user_id,
  product_id,
  amount: 5.00,
  currency: 'USD',
  status: 'pending',
  creem_checkout_id: response.id,  // Creem 返回的 ID
  customer_email,
  metadata
});
```

### 2. 处理支付回调
```javascript
// 根据 request_id 查找订单
const requestId = webhookData.data.request_id;
const payment = await supabase
  .from('payments')
  .update({
    status: webhookData.data.status,
    creem_order_id: webhookData.data.order_id,  // Creem 订单ID
    payment_method: webhookData.data.payment_method,
    completed_at: webhookData.data.created_at
  })
  .eq('order_id', requestId)  // 使用系统订单ID匹配
  .select()
  .single();
```

## 🔑 关键要点

1. **订单ID生成**: 系统生成唯一的 `order_id`，格式：`ord_时间戳_随机字符串`
2. **ID映射**: `order_id` (系统) ↔ `request_id` (Creem) ↔ `order_id` (webhook 匹配键)
3. **状态管理**: `pending` → `succeeded/failed`
4. **会员升级**: 支付成功后自动升级为 31 天 premium 会员
5. **错误处理**: 支持错误码和错误消息记录

## 🧪 测试验证

- ✅ 支付订单创建成功
- ✅ Webhook 处理正确
- ✅ 数据库记录完整
- ✅ 会员状态更新
- ✅ ID 映射关系正确

## 📁 相关文件

- `/src/lib/database.types.ts` - TypeScript 类型定义
- `/proxy-server.cjs` - 本地代理服务器（开发环境）
- `/src/components/PricingSection.tsx` - 前端支付组件
- `/test-new-payment-schema.cjs` - 测试脚本

## 🚀 部署说明

1. 确保 Supabase 数据库使用新的 payments 表结构
2. 更新生产环境的 webhook 处理逻辑
3. 配置正确的 Creem API 密钥和 webhook 密钥
4. 测试端到端支付流程