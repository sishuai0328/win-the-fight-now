# 手动设置 Webhook 测试

## 🔧 快速设置步骤

### 1. 安装 Ngrok
```bash
# 如果上面的安装还在进行中，等待完成
# 或者直接从官网下载: https://ngrok.com/download

# 验证安装
ngrok version
```

### 2. 启动代理服务器
```bash
# 在第一个终端窗口
node proxy-server.cjs
```

### 3. 启动 Ngrok 隧道
```bash
# 在第二个终端窗口
ngrok http 3001
```

你会看到类似输出：
```
Forwarding    https://abcd1234.ngrok.io -> http://localhost:3001
```

### 4. 配置 Creem Webhook
1. 复制 ngrok 提供的 HTTPS URL
2. 在 Creem 后台设置 webhook：
   ```
   URL: https://abcd1234.ngrok.io/api/webhook
   Events: checkout.completed
   ```

### 5. 测试真实支付
1. 在网站上点击升级
2. 完成支付流程
3. 观察代理服务器日志

## 🔍 监控工具

### Ngrok 监控面板
访问: http://localhost:4040
- 查看所有进入的请求
- 查看请求详情和响应

### 代理服务器日志
```bash
tail -f proxy.log
```

### 数据库验证
```bash
node verify-payment-system.cjs
```

## 🎯 预期结果

成功配置后，当完成真实支付时：

1. **Ngrok 监控页面** 显示来自 Creem 的 POST 请求到 `/api/webhook`
2. **代理服务器日志** 显示：
   ```
   Received webhook: checkout.completed evt_xxxxx
   Processing checkout.completed: { ... }
   Payment updated successfully
   User membership upgraded to premium for 31 days
   ```
3. **数据库更新**：
   - `creem_order_id` 更新为真实的 Creem 订单ID
   - `status` 更新为 'paid' 或 'completed'
   - 会员状态升级为 premium

## ⚠️ 注意事项

1. **免费版 ngrok** 每次重启都会生成新的 URL
2. **webhook 延迟** 通常在支付完成后 1-5 秒内到达
3. **测试模式** 确保使用的是 Creem 测试环境

## 🚨 故障排除

### 如果没有收到 webhook：
1. 检查 Creem 后台 webhook 配置
2. 验证 ngrok URL 是否正确
3. 检查 ngrok 是否还在运行
4. 查看 ngrok 监控页面是否有请求

### 如果收到 webhook 但处理失败：
1. 检查代理服务器日志
2. 验证 webhook 数据结构
3. 检查数据库连接