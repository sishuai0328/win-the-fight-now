import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Zap, Copy, RefreshCw, Shuffle, Crown, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useUsageLimit } from '@/hooks/use-usage-limit';
import PricingSection from '@/components/PricingSection';
import UsageLimitModal from '@/components/UsageLimitModal';
import UserMenu from '@/components/UserMenu';

const Index = () => {
  // 默认吵架文案列表
  const defaultQuarrelTexts = [
    "你说话怎么这么难听？",
    "你这人怎么这样啊？",
    "你凭什么这么说我？",
    "你有什么资格指责我？",
    "你懂什么？别瞎说！",
    "你这话说得太过分了吧？",
    "你是不是有毛病？",
    "你这人真的很无礼",
    "你管得着吗？",
    "你以为你是谁啊？",
    "你这样说合适吗？",
    "你有证据吗就这么说？"
  ];

  const [opponentText, setOpponentText] = useState(defaultQuarrelTexts[0]);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  const [intensity, setIntensity] = useState([5]);
  const [responses, setResponses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponses, setStreamingResponses] = useState<string[]>(['', '', '']);
  const [currentStreamingIndex, setCurrentStreamingIndex] = useState(0);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const { usageInfo, incrementUsage } = useUsageLimit(user);
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    // 获取当前用户
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
    // 监听登录状态变化
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLoginGithub = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  const handleLoginGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleUpgrade = () => {
    toast({
      title: "功能开发中",
      description: "付费功能正在开发中，敬请期待！我们会尽快上线这个功能。",
    });
    setShowUsageLimitModal(false);
    setShowPricingModal(false);
  };

  const handleShowPricing = () => {
    setShowPricingModal(true);
  };

  // 根据语气强烈程度和回复索引分析回复类型
  const analyzeResponseType = (response: string, index: number, intensityLevel: number) => {
    const lowerResponse = response.toLowerCase();
    
    // 根据语气强烈程度定义不同的回复风格
    if (intensityLevel <= 3) {
      // 温和理性级别
      const styles = [
        { label: '理性分析', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { label: '温和反驳', color: 'bg-green-100 text-green-800 border-green-200' },
        { label: '委婉表达', color: 'bg-purple-100 text-purple-800 border-purple-200' }
      ];
      return styles[index] || styles[0];
    } else if (intensityLevel <= 6) {
      // 据理力争级别
      const styles = [
        { label: '逻辑反击', color: 'bg-orange-100 text-orange-800 border-orange-200' },
        { label: '据理力争', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { label: '机智回应', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
      ];
      return styles[index] || styles[0];
    } else if (intensityLevel <= 8) {
      // 强硬反击级别
      const styles = [
        { label: '强势反击', color: 'bg-red-100 text-red-800 border-red-200' },
        { label: '尖锐回应', color: 'bg-pink-100 text-pink-800 border-pink-200' },
        { label: '犀利反驳', color: 'bg-rose-100 text-rose-800 border-rose-200' }
      ];
      return styles[index] || styles[0];
    } else {
      // 火力全开级别
      const styles = [
        { label: '霸气回击', color: 'bg-slate-100 text-slate-800 border-slate-200' },
        { label: '锋芒毕露', color: 'bg-zinc-100 text-zinc-800 border-zinc-200' },
        { label: '毫不留情', color: 'bg-stone-100 text-stone-800 border-stone-200' }
      ];
      return styles[index] || styles[0];
    }
  };

  // 换一换按钮功能
  const handleChangeText = () => {
    const nextIndex = (currentTextIndex + 1) % defaultQuarrelTexts.length;
    setCurrentTextIndex(nextIndex);
    setOpponentText(defaultQuarrelTexts[nextIndex]);
  };

  const handleGenerateResponses = async () => {
    if (!opponentText.trim()) {
      toast({
        title: "请输入对方的话",
        description: "需要输入内容才能生成回复哦！",
        variant: "destructive",
      });
      return;
    }

    // 检查使用限制
    if (!usageInfo.canUse) {
      setShowUsageLimitModal(true);
      return;
    }

    setIsLoading(true);
    setResponses([]);
    setStreamingResponses(['', '', '']);
    setCurrentStreamingIndex(0);
    
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-8a4f5e083edb4e87bf150396bd2fdff1'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专门帮助用户回怼的助手。用户会给你一句对方说的话，以及语气强烈程度（1-10），你需要生成3条相同强烈程度但不同风格的回复。

【重要格式要求】
请严格按照以下格式输出，每条回复之间用 === 分隔：

回复内容1
===
回复内容2  
===
回复内容3

【注意事项】
- 不要包含"第一条"、"第二条"等编号
- 不要包含风格标签如"逻辑反击风格："
- 直接输出回复内容
- 语气强烈程度${intensity[0]}/10，三条回复保持相同强度
- 内容机智有理，避免脏话和人身攻击

根据强烈程度${intensity[0]}生成的风格要求：
${intensity[0] <= 3 ? 
  '风格1: 理性分析 - 用逻辑和事实回应\n风格2: 温和反驳 - 礼貌但坚定表达不同观点\n风格3: 委婉表达 - 用巧妙话术化解冲突' :
  intensity[0] <= 6 ? 
  '风格1: 逻辑反击 - 用强有力逻辑驳倒对方\n风格2: 据理力争 - 坚持原则，有理有据\n风格3: 机智回应 - 用聪明话术巧妙回击' :
  intensity[0] <= 8 ?
  '风格1: 强势反击 - 气势上压倒对方\n风格2: 尖锐回应 - 直接犀利地指出问题\n风格3: 犀利反驳 - 用尖锐言辞反击' :
  '风格1: 霸气回击 - 气场全开，强势回应\n风格2: 锋芒毕露 - 毫不掩饰地展现实力\n风格3: 毫不留情 - 直接有力，不给对方面子'
}`
            },
            {
              role: 'user',
              content: `对方说："${opponentText}"

请按照格式要求生成3条回复（语气强烈程度${intensity[0]}/10）：
- 直接输出回复内容，不要编号和标签
- 每条回复用===分隔
- 确保三条回复风格不同但强度相同`
            }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  await simulateTyping(fullContent);
                }
              } catch (e) {
                console.log('解析失败:', e);
              }
            }
          }
        }
      }

      // 处理完整内容并保存到历史记录
      const finalResponses = parseAIResponses(fullContent);
      setResponses(finalResponses);
      
      console.log('🎯 最终解析结果:', {
        原始内容长度: fullContent.length,
        解析出回复数: finalResponses.length,
        各回复长度: finalResponses.map(r => r.length)
      });
      
      // 增加使用次数
      try {
        await incrementUsage();
        console.log('✅ incrementUsage 调用完成');
      } catch (error) {
        console.error('❌ incrementUsage 调用失败:', error);
      }
      
      // 保存到 localStorage
      const history = JSON.parse(localStorage.getItem('quarrel-history') || '[]');
      history.unshift({
        opponent: opponentText,
        intensity: intensity[0],
        responses: finalResponses,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('quarrel-history', JSON.stringify(history.slice(0, 20)));
      
    } catch (error) {
      console.error('Error generating responses:', error);
      toast({
        title: "生成失败",
        description: "请稍后重试或检查网络连接",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 智能解析AI回复的函数
  const parseAIResponses = (content: string): string[] => {
    console.log('🔍 原始AI回复内容:', content);
    
    // 方案1: 尝试用 === 分隔
    let responseList = content.split('===').map((r: string) => r.trim()).filter((r: string) => r);
    if (responseList.length >= 2) {
      console.log('✅ 使用===分隔成功:', responseList.length, '条回复');
      return responseList.slice(0, 3);
    }
    
    // 方案2: 尝试用数字编号分隔 (1. 2. 3. 或 1、2、3、)
    const numberPatterns = [
      /(?:^|\n)\s*([1-3])[\.\、]\s*[^：:]*[：:]\s*["""]?([^"""\n]*(?:\n(?![1-3][\.\、])[^"""\n]*)*)/g,
      /(?:^|\n)\s*([1-3])[\.\、]\s*([^1-3\n][^\n]*(?:\n(?![1-3][\.\、])[^\n]*)*)/g,
      /(?:^|\n)\s*第?([一二三1-3])条?[：:\.\、]\s*([^\n]*(?:\n(?!第?[一二三1-3]条?[：:\.\、])[^\n]*)*)/g
    ];
    
    for (const pattern of numberPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length >= 2) {
        responseList = matches.map(match => {
          // 提取回复内容，去掉风格标签
          let responseText = match[2] || match[1];
          // 去掉可能的风格描述 (如：逻辑反击风格："xxx")
          responseText = responseText.replace(/^[^：:"]*[：:]\s*["""]?/, '').replace(/["""]?\s*$/, '');
          return responseText.trim();
        }).filter(r => r.length > 0);
        
        if (responseList.length >= 2) {
          console.log('✅ 使用数字编号分隔成功:', responseList.length, '条回复');
          return responseList.slice(0, 3);
        }
      }
    }
    
    // 方案3: 尝试用段落分隔（双换行）
    responseList = content.split(/\n\s*\n/).map((r: string) => r.trim()).filter((r: string) => r.length > 20);
    if (responseList.length >= 2) {
      console.log('✅ 使用段落分隔成功:', responseList.length, '条回复');
      return responseList.slice(0, 3);
    }
    
    // 方案4: 尝试用句号+换行分隔长句
    responseList = content.split(/[。！？]\s*\n/).map((r: string) => r.trim()).filter((r: string) => r.length > 15);
    if (responseList.length >= 2) {
      // 重新添加标点符号
      responseList = responseList.map((r, i) => i < responseList.length - 1 ? r + '。' : r);
      console.log('✅ 使用句号分隔成功:', responseList.length, '条回复');
      return responseList.slice(0, 3);
    }
    
    // 方案5: 如果都失败了，尝试用自然语言处理分割长文本
    if (content.length > 100) {
      const sentences = content.split(/[。！？；]/).filter(s => s.trim().length > 10);
      if (sentences.length >= 3) {
        const chunkSize = Math.ceil(sentences.length / 3);
        responseList = [];
        for (let i = 0; i < 3; i++) {
          const start = i * chunkSize;
          const end = Math.min((i + 1) * chunkSize, sentences.length);
          const chunk = sentences.slice(start, end).join('。') + (end < sentences.length ? '。' : '');
          if (chunk.trim()) responseList.push(chunk.trim());
        }
        if (responseList.length >= 2) {
          console.log('✅ 使用智能分块成功:', responseList.length, '条回复');
          return responseList;
        }
      }
    }
    
    // 最后的fallback: 如果内容足够长，强制分割为3段
    if (content.length > 60) {
      const third = Math.ceil(content.length / 3);
      responseList = [
        content.slice(0, third).trim() + '...',
        content.slice(third, third * 2).trim() + '...',
        content.slice(third * 2).trim()
      ].filter(r => r.length > 5);
      console.log('⚠️ 使用强制分割fallback:', responseList.length, '条回复');
      return responseList;
    }
    
    // 如果什么都不行，就返回原内容作为单条回复
    console.log('❌ 所有分割方案都失败，返回单条回复');
    return [content.trim()];
  };

  const simulateTyping = async (content: string) => {
    const responseList = parseAIResponses(content);
    
    setStreamingResponses(prev => {
      const newResponses = [...prev];
      for (let i = 0; i < Math.min(responseList.length, 3); i++) {
        newResponses[i] = responseList[i];
      }
      return newResponses;
    });

    // 添加一个小延迟来模拟打字效果
    await new Promise(resolve => setTimeout(resolve, 20));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: "回复内容已复制到剪贴板",
    });
  };

  const getIntensityLabel = (value: number) => {
    if (value <= 3) return '温和理性';
    if (value <= 6) return '据理力争';
    if (value <= 8) return '强硬反击';
    return '火力全开';
  };

  const getIntensityColor = (value: number) => {
    if (value <= 3) return 'bg-green-500';
    if (value <= 6) return 'bg-yellow-500';
    if (value <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // 显示正在流式输出的回复或者最终回复
  const displayResponses = isLoading ? streamingResponses.filter(r => r.length > 0) : responses;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      {/* 登录按钮区域，页面最头部右侧 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '8px 0 24px 0', position: 'relative', top: 0, right: 0, zIndex: 50 }}>
        {user ? (
          <UserMenu user={user} onLogout={handleLogout} onUpgrade={handleShowPricing} />
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={handleLoginGithub}>使用 GitHub 登录</Button>
            <Button variant="outline" size="sm" onClick={handleLoginGoogle}>使用 Google 登录</Button>
          </div>
        )}
      </div>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-800">吵架包赢</h1>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-gray-600">AI助你回怼，言辞犀利不失分寸</p>
        </div>

        {/* Usage Status and Upgrade Prompt */}
        {!usageInfo.isPaidUser && (
          <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      {usageInfo.isLoggedIn ? '当前为免费用户' : '未登录用户'}
                    </p>
                    <p className="text-xs text-yellow-700">
                      已使用 {usageInfo.currentRounds}/{usageInfo.maxRounds === Infinity ? '无限制' : usageInfo.maxRounds} 次对话
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!usageInfo.isLoggedIn && (
                    <Button size="sm" onClick={handleLoginGithub} className="bg-blue-600 hover:bg-blue-700">
                      登录解锁更多
                    </Button>
                  )}
                  {usageInfo.isLoggedIn && !usageInfo.isPaidUser && (
                    <Button size="sm" onClick={handleShowPricing} className="bg-green-600 hover:bg-green-700">
                      <Crown className="w-4 h-4 mr-1" />
                      升级专业版
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Input Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-green-600" />
              对方说了什么？
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Textarea
                  placeholder="输入对方的话..."
                  value={opponentText}
                  onChange={(e) => setOpponentText(e.target.value)}
                  className="min-h-[100px] border-green-200 focus:border-green-400 focus:ring-green-200 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangeText}
                  className="shrink-0 px-3 hover:bg-green-50 border-green-200"
                  title="换一换示例文案"
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">💡 点击右侧按钮可以切换示例文案</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  语气强烈程度
                </label>
                <Badge 
                  className={`${getIntensityColor(intensity[0])} text-white`}
                >
                  {intensity[0]}/10 · {getIntensityLabel(intensity[0])}
                </Badge>
              </div>
              
              <Slider
                value={intensity}
                onValueChange={setIntensity}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>温和理性</span>
                <span>火力全开</span>
              </div>
            </div>

            <Button 
              onClick={handleGenerateResponses}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  AI正在思考...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  开始吵架
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Responses */}
        {displayResponses.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-green-600">
                <Zap className="w-5 h-5" />
                AI为你生成的回复
                {isLoading && (
                  <span className="text-sm text-gray-500 ml-2">正在生成中...</span>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    已解析: {displayResponses.length} 条
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayResponses.map((response, index) => {
                  const responseType = analyzeResponseType(response, index, intensity[0]);
                  return (
                    <div 
                      key={index}
                      className="relative p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">
                              回复 {index + 1}
                            </Badge>
                            <Badge 
                              className={`text-xs border ${responseType.color}`}
                              variant="outline"
                            >
                              {responseType.label}
                            </Badge>
                            {isLoading && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className="text-gray-800 leading-relaxed">
                            {response}
                            {isLoading && index === displayResponses.length - 1 && (
                              <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1"></span>
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(response)}
                          className="shrink-0 hover:bg-green-100"
                          disabled={isLoading}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {/* 如果只有一条回复且长度过长，提示可能解析有问题 */}
                {!isLoading && displayResponses.length === 1 && displayResponses[0].length > 200 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">检测到可能的格式问题</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      AI回复可能没有正确分割。如果这条回复包含多个建议，请点击重新生成。
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                      onClick={handleGenerateResponses}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      重新生成
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>理性吵架，和谐社会 💚</p>
        </div>
      </div>

      {/* Pricing Section */}
      <PricingSection 
        onUpgrade={handleUpgrade}
        isLoggedIn={usageInfo.isLoggedIn}
      />

      {/* Usage Limit Modal */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        needsLogin={usageInfo.needsLogin}
        needsUpgrade={usageInfo.needsUpgrade}
        currentRounds={usageInfo.currentRounds}
        maxRounds={usageInfo.maxRounds}
        onLogin={handleLoginGithub}
        onUpgrade={handleUpgrade}
      />

      {/* Pricing Modal (same as pricing section but in modal form) */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">升级专业版</h2>
                <Button variant="ghost" onClick={() => setShowPricingModal(false)}>✕</Button>
              </div>
              <PricingSection 
                onUpgrade={handleUpgrade}
                isLoggedIn={usageInfo.isLoggedIn}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
