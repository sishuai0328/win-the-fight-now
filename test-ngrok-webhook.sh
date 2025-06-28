#!/bin/bash

# 测试 Ngrok Webhook 脚本

echo "🚀 启动 Ngrok Webhook 测试..."

# 检查 ngrok 是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok 未安装，请先安装:"
    echo "brew install ngrok"
    echo "或访问: https://ngrok.com/download"
    exit 1
fi

# 检查代理服务器是否运行
if ! curl -s http://localhost:3001 &> /dev/null; then
    echo "⚠️  代理服务器未运行，正在启动..."
    node proxy-server.cjs > proxy.log 2>&1 &
    sleep 3
fi

echo "✅ 代理服务器已启动 (localhost:3001)"

# 启动 ngrok (在后台)
echo "🔗 启动 ngrok 隧道..."
ngrok http 3001 > /dev/null 2>&1 &
NGROK_PID=$!

sleep 5

# 获取 ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok\.io')

if [ -z "$NGROK_URL" ]; then
    echo "❌ 无法获取 ngrok URL，请手动检查"
    echo "访问 http://localhost:4040 查看隧道状态"
    exit 1
fi

echo "✅ Ngrok 隧道已建立: $NGROK_URL"
echo ""
echo "📋 下一步操作:"
echo "1. 复制这个 URL: $NGROK_URL/api/webhook"
echo "2. 在 Creem 后台配置 webhook 端点"
echo "3. 进行真实支付测试"
echo ""
echo "🔍 监控工具:"
echo "- Ngrok 监控: http://localhost:4040"
echo "- 代理服务器日志: tail -f proxy.log"
echo ""
echo "⏹️  停止测试: Ctrl+C"

# 等待用户中断
trap "echo ''; echo '🛑 停止测试...'; kill $NGROK_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
while true; do
    sleep 10
    # 检查 ngrok 是否还在运行
    if ! ps -p $NGROK_PID > /dev/null 2>&1; then
        echo "❌ Ngrok 进程意外终止"
        exit 1
    fi
done