import { supabase } from './supabaseClient';
import { Database } from './database.types';

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

type MemberInfo = Database['public']['Tables']['member_info']['Row'];
type MemberInfoInsert = Database['public']['Tables']['member_info']['Insert'];
type MemberInfoUpdate = Database['public']['Tables']['member_info']['Update'];

export class PaymentService {
  /**
   * 1. 支付结账流程
   * 验证用户存在性，调用第三方支付平台创建订单，记录支付信息
   */
  static async createCheckoutSession(params: {
    user_id: string;
    product_id: string;
    amount: number;
    payment_type: 'one_time' | 'subscription';
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; checkout_url?: string; payment_id?: string; error?: string }> {
    try {
      // 1. 验证用户存在性
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: '用户未登录或不存在' };
      }

      // 2. 生成订单ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 3. 调用 Creem API 创建结账会话
      const creemResponse = await fetch('https://test-api.creem.io/v1/checkouts', {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_CREEM_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: params.product_id,
          request_id: orderId,
          metadata: {
            ...params.metadata,
            user_id: params.user_id,
            payment_type: params.payment_type
          },
          success_url: `${window.location.origin}/payment-success`,
        }),
      });

      if (!creemResponse.ok) {
        const errorText = await creemResponse.text();
        return { success: false, error: `支付平台错误: ${errorText}` };
      }

      const checkoutData = await creemResponse.json();

      // 4. 在 payments 表记录初始支付信息
      const paymentData: PaymentInsert = {
        user_id: params.user_id,
        creem_order_id: orderId,
        creem_checkout_id: checkoutData.id,
        product_id: params.product_id,
        amount: params.amount,
        currency: 'USD',
        status: 'pending',
        payment_type: params.payment_type,
        metadata: {
          ...params.metadata,
          checkout_url: checkoutData.checkout_url
        }
      };

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('Error saving payment record:', paymentError);
        return { success: false, error: '保存支付记录失败' };
      }

      return {
        success: true,
        checkout_url: checkoutData.checkout_url,
        payment_id: payment.id
      };

    } catch (error) {
      console.error('Error in createCheckoutSession:', error);
      return { success: false, error: '创建支付会话失败' };
    }
  }

  /**
   * 2. 支付成功处理
   * 更新支付状态，更新会员信息
   */
  static async handlePaymentSuccess(webhookData: {
    checkout_id: string;
    order_id: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
    webhook_event_id: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 使用数据库事务确保数据一致性
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('creem_checkout_id', webhookData.checkout_id)
        .single();

      if (fetchError || !payment) {
        return { success: false, error: '支付记录不存在' };
      }

      // 更新支付状态
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          webhook_event_id: webhookData.webhook_event_id,
          metadata: {
            ...payment.metadata,
            ...webhookData.metadata,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', payment.id);

      if (updatePaymentError) {
        console.error('Error updating payment:', updatePaymentError);
        return { success: false, error: '更新支付状态失败' };
      }

      // 更新会员信息
      const memberUpdateResult = await this.updateMembershipAfterPayment({
        user_id: payment.user_id,
        payment_type: payment.payment_type as 'one_time' | 'subscription',
        payment_id: payment.id,
        amount: webhookData.amount
      });

      if (!memberUpdateResult.success) {
        return { success: false, error: memberUpdateResult.error };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in handlePaymentSuccess:', error);
      return { success: false, error: '处理支付成功事件失败' };
    }
  }

  /**
   * 3. 订阅创建处理
   */
  static async handleSubscriptionCreated(webhookData: {
    subscription_id: string;
    customer_id: string;
    product_id: string;
    current_period_start: string;
    current_period_end: string;
    status: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const user_id = webhookData.metadata?.user_id;
      if (!user_id) {
        return { success: false, error: '无法获取用户ID' };
      }

      // 创建订阅记录
      const subscriptionData: SubscriptionInsert = {
        user_id,
        creem_subscription_id: webhookData.subscription_id,
        creem_customer_id: webhookData.customer_id,
        product_id: webhookData.product_id,
        status: webhookData.status as any,
        current_period_start: webhookData.current_period_start,
        current_period_end: webhookData.current_period_end,
        cancel_at_period_end: false,
        metadata: webhookData.metadata
      };

      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return { success: false, error: '创建订阅记录失败' };
      }

      // 更新会员信息
      const memberUpdateResult = await this.updateMembershipForSubscription({
        user_id,
        subscription_id: subscription.id,
        period_end: webhookData.current_period_end
      });

      return memberUpdateResult;

    } catch (error) {
      console.error('Error in handleSubscriptionCreated:', error);
      return { success: false, error: '处理订阅创建事件失败' };
    }
  }

  /**
   * 4. 订阅更新处理
   */
  static async handleSubscriptionUpdated(webhookData: {
    subscription_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end?: boolean;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: webhookData.status as any,
          current_period_start: webhookData.current_period_start,
          current_period_end: webhookData.current_period_end,
          cancel_at_period_end: webhookData.cancel_at_period_end || false,
          metadata: webhookData.metadata
        })
        .eq('creem_subscription_id', webhookData.subscription_id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return { success: false, error: '更新订阅失败' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in handleSubscriptionUpdated:', error);
      return { success: false, error: '处理订阅更新事件失败' };
    }
  }

  /**
   * 5. 订阅取消处理
   */
  static async handleSubscriptionCanceled(webhookData: {
    subscription_id: string;
    canceled_at: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 更新订阅状态
      const { data: subscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: true,
          metadata: {
            ...webhookData.metadata,
            canceled_at: webhookData.canceled_at
          }
        })
        .eq('creem_subscription_id', webhookData.subscription_id)
        .select()
        .single();

      if (updateError || !subscription) {
        console.error('Error updating subscription:', updateError);
        return { success: false, error: '更新订阅状态失败' };
      }

      // 更新会员信息 - 保持激活到订阅期结束
      const { error: memberError } = await supabase
        .from('member_info')
        .update({
          status: 'active', // 保持激活到期结束
          expires_at: subscription.current_period_end
        })
        .eq('user_id', subscription.user_id);

      if (memberError) {
        console.error('Error updating member info:', memberError);
        return { success: false, error: '更新会员状态失败' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in handleSubscriptionCanceled:', error);
      return { success: false, error: '处理订阅取消事件失败' };
    }
  }

  /**
   * 6. 会员状态管理 - 支付后更新
   */
  private static async updateMembershipAfterPayment(params: {
    user_id: string;
    payment_type: 'one_time' | 'subscription';
    payment_id: string;
    amount: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (params.payment_type === 'one_time') {
        // 一次性支付：设置31天有效期
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 31);

        const memberData: MemberInfoInsert = {
          user_id: params.user_id,
          status: 'active',
          membership_type: 'premium',
          expires_at: expiresAt.toISOString(),
          total_usage_count: 0,
          feature_limits: {
            max_conversations_per_day: -1, // 无限制
            max_messages_per_conversation: -1, // 无限制
            premium_features: true
          },
          payment_id: params.payment_id
        };

        const { error } = await supabase
          .from('member_info')
          .upsert(memberData, { onConflict: 'user_id' });

        if (error) {
          console.error('Error updating member info:', error);
          return { success: false, error: '更新会员信息失败' };
        }

        return { success: true };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in updateMembershipAfterPayment:', error);
      return { success: false, error: '更新会员状态失败' };
    }
  }

  /**
   * 7. 会员状态管理 - 订阅相关
   */
  private static async updateMembershipForSubscription(params: {
    user_id: string;
    subscription_id: string;
    period_end: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const memberData: MemberInfoInsert = {
        user_id: params.user_id,
        status: 'active',
        membership_type: 'premium',
        expires_at: params.period_end,
        total_usage_count: 0,
        feature_limits: {
          max_conversations_per_day: -1,
          max_messages_per_conversation: -1,
          premium_features: true
        },
        subscription_id: params.subscription_id
      };

      const { error } = await supabase
        .from('member_info')
        .upsert(memberData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating member info for subscription:', error);
        return { success: false, error: '更新订阅会员信息失败' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in updateMembershipForSubscription:', error);
      return { success: false, error: '更新订阅会员状态失败' };
    }
  }

  /**
   * 8. 获取用户会员状态
   */
  static async getUserMembershipStatus(user_id: string): Promise<{
    success: boolean;
    memberInfo?: MemberInfo;
    error?: string;
  }> {
    try {
      const { data: memberInfo, error } = await supabase
        .from('member_info')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching member info:', error);
        return { success: false, error: '获取会员信息失败' };
      }

      return { success: true, memberInfo };

    } catch (error) {
      console.error('Error in getUserMembershipStatus:', error);
      return { success: false, error: '查询会员状态失败' };
    }
  }

  /**
   * 9. 检查会员是否有效
   */
  static async isUserPremiumActive(user_id: string): Promise<boolean> {
    try {
      const result = await this.getUserMembershipStatus(user_id);
      
      if (!result.success || !result.memberInfo) {
        return false;
      }

      const member = result.memberInfo;
      
      // 检查状态是否激活
      if (member.status !== 'active') {
        return false;
      }

      // 检查是否过期
      if (member.expires_at) {
        const expiresAt = new Date(member.expires_at);
        const now = new Date();
        if (now > expiresAt) {
          // 自动更新过期状态
          await supabase
            .from('member_info')
            .update({ status: 'expired' })
            .eq('user_id', user_id);
          return false;
        }
      }

      return member.membership_type === 'premium';

    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }
}

export default PaymentService;