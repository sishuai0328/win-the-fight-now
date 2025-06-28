# 设置 Ngrok 和 Webhook 测试

## 🔧 步骤1: 安装和启动 Ngrok

### 安装 Ngrok
```bash
# 如果还没安装 ngrok
brew install ngrok
# 或者从官网下载: https://ngrok.com/download
```

### 启动 Ngrok 隧道
```bash
# 在新的终端窗口中运行
ngrok http 3001
```

这会输出类似这样的信息：
```
ngrok by @inconshreveable

Session Status                online
Account                       your-account
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**重要**: 复制 `https://abc123.ngrok.io` 这个公网URL

## 🔧 步骤2: 配置 Creem Webhook

### 在 Creem 后台设置
1. 登录 Creem 开发者后台
2. 进入项目设置 > Webhooks
3. 添加新的 webhook 端点：
   ```
   URL: https://your-ngrok-url.ngrok.io/api/webhook
   事件: checkout.completed
   ```

### 验证 Webhook 端点
访问 `https://your-ngrok-url.ngrok.io/api/webhook` 应该返回 405 Method Not Allowed（因为是 GET 请求）

## 🔧 步骤3: 测试完整流程

### 1. 启动代理服务器
```bash
node proxy-server.cjs
```

### 2. 启动 Ngrok
```bash
ngrok http 3001
```

### 3. 更新 Creem Webhook 配置
使用 ngrok 提供的 URL: `https://your-id.ngrok.io/api/webhook`

### 4. 进行真实支付测试
1. 在前端点击升级按钮
2. 完成支付流程
3. 观察本地代理服务器日志
4. 检查数据库更新情况

## 🔧 步骤4: 监控和调试

### 查看 Ngrok 流量
访问 `http://127.0.0.1:4040` 查看所有进入的请求

### 查看代理服务器日志
```bash
tail -f proxy.log
```

### 验证数据库更新
```bash
node verify-payment-system.cjs
```

## 📝 注意事项

1. **Ngrok URL 变化**: 免费版 ngrok 每次重启都会生成新的URL，需要更新 Creem 配置
2. **HTTPS 要求**: Creem webhook 要求 HTTPS，ngrok 默认提供 HTTPS
3. **超时设置**: webhook 有超时限制，确保处理逻辑尽快响应
4. **重试机制**: Creem 会重试失败的 webhook，注意幂等性

## 🚀 成功标志

当设置正确后，您应该看到：
1. 支付完成后，代理服务器收到真实的 webhook 请求
2. 数据库中的 `creem_order_id` 更新为真实的 Creem 订单ID
3. 会员状态正确升级
4. 在 ngrok 监控页面能看到 webhook 请求记录