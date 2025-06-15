import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Zap, Copy, RefreshCw, Shuffle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

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

语气强烈程度${intensity[0]}，请严格按照这个强度生成回复，不要有强弱差别。

根据强烈程度${intensity[0]}，请生成3条不同风格的回复：
${intensity[0] <= 3 ? 
  '1. 第一条：理性分析风格 - 用逻辑和事实回应\n2. 第二条：温和反驳风格 - 礼貌但坚定地表达不同观点\n3. 第三条：委婉表达风格 - 用巧妙的话术化解冲突' :
  intensity[0] <= 6 ? 
  '1. 第一条：逻辑反击风格 - 用强有力的逻辑驳倒对方\n2. 第二条：据理力争风格 - 坚持原则，有理有据\n3. 第三条：机智回应风格 - 用聪明的话术巧妙回击' :
  intensity[0] <= 8 ?
  '1. 第一条：强势反击风格 - 气势上压倒对方\n2. 第二条：尖锐回应风格 - 直接犀利地指出问题\n3. 第三条：犀利反驳风格 - 用尖锐的言辞反击' :
  '1. 第一条：霸气回击风格 - 气场全开，强势回应\n2. 第二条：锋芒毕露风格 - 毫不掩饰地展现实力\n3. 第三条：毫不留情风格 - 直接有力，不给对方面子'
}

请确保所有回复都保持相同的强烈程度${intensity[0]}/10，只是表达方式不同。回复内容要机智、有理有据，不使用脏话或人身攻击。每条回复用===分隔。`
            },
            {
              role: 'user',
              content: `对方说："${opponentText}"，语气强烈程度：${intensity[0]}/10，请生成3条相同强度但不同风格的回复。`
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
      const responseList = fullContent.split('===').map((r: string) => r.trim()).filter((r: string) => r);
      const finalResponses = responseList.slice(0, 3);
      setResponses(finalResponses);
      
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

  const simulateTyping = async (content: string) => {
    const responseList = content.split('===').map((r: string) => r.trim()).filter((r: string) => r);
    
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            )}
            <span style={{ marginRight: 8 }}>{user.user_metadata?.user_name || user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>退出登录</Button>
          </div>
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>理性吵架，和谐社会 💚</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
