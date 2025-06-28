import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types';

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

// 直接在这里实现 PaymentService 的方法，避免导入问题
class PaymentServiceWebhook {
  static async handlePaymentSuccess(webhookData: {
    checkout_id: string;
    order_id: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
    webhook_event_id: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
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
      if (payment.payment_type === 'one_time') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 31); // 31天会员

        const { error: memberError } = await supabase
          .from('member_info')
          .upsert({
            user_id: payment.user_id,
            status: 'active',
            membership_type: 'premium',
            expires_at: expiresAt.toISOString(),
            total_usage_count: 0,
            feature_limits: {
              max_conversations_per_day: -1,
              max_messages_per_conversation: -1,
              premium_features: true
            },
            payment_id: payment.id
          }, { onConflict: 'user_id' });

        if (memberError) {
          console.error('Error updating member info:', memberError);
          return { success: false, error: '更新会员信息失败' };
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Error in handlePaymentSuccess:', error);
      return { success: false, error: '处理支付成功事件失败' };
    }
  }

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
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id,
          creem_subscription_id: webhookData.subscription_id,
          creem_customer_id: webhookData.customer_id,
          product_id: webhookData.product_id,
          status: webhookData.status as any,
          current_period_start: webhookData.current_period_start,
          current_period_end: webhookData.current_period_end,
          cancel_at_period_end: false,
          metadata: webhookData.metadata
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return { success: false, error: '创建订阅记录失败' };
      }

      // 更新会员信息
      const { error: memberError } = await supabase
        .from('member_info')
        .upsert({
          user_id,
          status: 'active',
          membership_type: 'premium',
          expires_at: webhookData.current_period_end,
          total_usage_count: 0,
          feature_limits: {
            max_conversations_per_day: -1,
            max_messages_per_conversation: -1,
            premium_features: true
          },
          subscription_id: subscription.id
        }, { onConflict: 'user_id' });

      if (memberError) {
        console.error('Error updating member info for subscription:', memberError);
        return { success: false, error: '更新订阅会员信息失败' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in handleSubscriptionCreated:', error);
      return { success: false, error: '处理订阅创建事件失败' };
    }
  }
}

interface CreemWebhookEvent {
  id: string;
  eventType: string;
  created_at: number;
  object: {
    id: string;
    object: string;
    request_id?: string;
    status: string;
    metadata?: Record<string, any>;
    order?: {
      id: string;
      customer: string;
      product: string;
      amount: number;
      currency: string;
      status: string;
      type: string;
      created_at: string;
      updated_at: string;
      mode: string;
    };
    product?: {
      id: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      billing_type: string;
      status: string;
    };
    customer?: {
      id: string;
      object: string;
      email: string;
      name: string;
      country: string;
      created_at: string;
      updated_at: string;
      mode: string;
    };
    subscription?: {
      id: string;
      object: string;
      product: string;
      customer: string;
      collection_method: string;
      status: string;
      canceled_at: string | null;
      created_at: string;
      updated_at: string;
      metadata?: Record<string, any>;
      mode: string;
    };
    mode: string;
    [key: string]: any;
  };
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}

async function handleCheckoutCompleted(event: CreemWebhookEvent) {
  const { data } = event;
  
  try {
    // Update payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        webhook_event_id: event.id,
        metadata: data,
        updated_at: new Date().toISOString()
      })
      .eq('creem_checkout_id', data.checkout_id || data.id);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return false;
    }

    // If this is a subscription product, handle subscription creation/update
    if (data.subscription_id) {
      await handleSubscriptionActivation(event);
    }

    // Update user membership
    if (data.customer_id) {
      await updateUserMembership(data.customer_id, data.product_id, 'premium');
    }

    console.log('Checkout completed successfully processed:', data.id);
    return true;
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    return false;
  }
}

async function handleSubscriptionPaid(event: CreemWebhookEvent) {
  const { data } = event;
  
  try {
    // Update or create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        creem_subscription_id: data.id,
        creem_customer_id: data.customer_id!,
        product_id: data.product_id,
        status: 'active',
        current_period_start: data.current_period_start || new Date().toISOString(),
        current_period_end: data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: data.cancel_at_period_end || false,
        metadata: data,
        updated_at: new Date().toISOString()
      })
      .eq('creem_subscription_id', data.id);

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      return false;
    }

    // Update user membership
    await updateUserMembership(data.customer_id!, data.product_id, 'premium');

    console.log('Subscription paid successfully processed:', data.id);
    return true;
  } catch (error) {
    console.error('Error handling subscription paid:', error);
    return false;
  }
}

async function handleSubscriptionCanceled(event: CreemWebhookEvent) {
  const { data } = event;
  
  try {
    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        metadata: data,
        updated_at: new Date().toISOString()
      })
      .eq('creem_subscription_id', data.id);

    if (subscriptionError) {
      console.error('Error updating canceled subscription:', subscriptionError);
      return false;
    }

    // Update user membership (keep active until period end)
    await updateUserMembership(data.customer_id!, data.product_id, 'premium', data.current_period_end);

    console.log('Subscription canceled successfully processed:', data.id);
    return true;
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    return false;
  }
}

async function handleSubscriptionExpired(event: CreemWebhookEvent) {
  const { data } = event;
  
  try {
    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        metadata: data,
        updated_at: new Date().toISOString()
      })
      .eq('creem_subscription_id', data.id);

    if (subscriptionError) {
      console.error('Error updating expired subscription:', subscriptionError);
      return false;
    }

    // Downgrade user membership to free
    await updateUserMembership(data.customer_id!, data.product_id, 'free');

    console.log('Subscription expired successfully processed:', data.id);
    return true;
  } catch (error) {
    console.error('Error handling subscription expiration:', error);
    return false;
  }
}

async function handleSubscriptionActivation(event: CreemWebhookEvent) {
  const { data } = event;
  
  try {
    // Get user_id from metadata or customer mapping
    const user_id = data.metadata?.user_id || data.customer_id;
    
    if (!user_id) {
      console.error('No user_id found for subscription:', data.id);
      return false;
    }

    // Create or update subscription
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id,
        creem_subscription_id: data.subscription_id || data.id,
        creem_customer_id: data.customer_id!,
        product_id: data.product_id,
        status: 'active',
        current_period_start: data.current_period_start || new Date().toISOString(),
        current_period_end: data.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        metadata: data
      })
      .eq('creem_subscription_id', data.subscription_id || data.id);

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error handling subscription activation:', error);
    return false;
  }
}

async function updateUserMembership(customer_id: string, product_id: string, membership_type: 'free' | 'premium' | 'enterprise', expires_at?: string) {
  try {
    // You might need to map customer_id to user_id based on your user system
    // For now, assuming customer_id can be used as user_id or you have a mapping
    const user_id = customer_id; // Adjust this based on your user mapping logic

    const membershipData = {
      user_id,
      membership_type,
      is_active: membership_type !== 'free',
      feature_limits: getMembershipFeatures(membership_type),
      expires_at: expires_at || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_memberships')
      .upsert(membershipData)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error updating user membership:', error);
      return false;
    }

    console.log('User membership updated:', user_id, membership_type);
    return true;
  } catch (error) {
    console.error('Error in updateUserMembership:', error);
    return false;
  }
}

function getMembershipFeatures(membership_type: string) {
  switch (membership_type) {
    case 'free':
      return {
        max_conversations_per_day: 3,
        max_messages_per_conversation: 3,
        premium_features: false
      };
    case 'premium':
      return {
        max_conversations_per_day: -1, // unlimited
        max_messages_per_conversation: -1, // unlimited
        premium_features: true
      };
    case 'enterprise':
      return {
        max_conversations_per_day: -1,
        max_messages_per_conversation: -1,
        premium_features: true,
        enterprise_features: true
      };
    default:
      return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['creem-signature'] as string;
    const rawBody = JSON.stringify(req.body);
    
    // Verify webhook signature
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!signature) {
      console.error('No signature provided');
      return res.status(401).json({ error: 'No signature provided' });
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event: CreemWebhookEvent = req.body;
    console.log('Processing webhook event:', event.eventType, event.id);
    
    let processed = false;

    // Handle different webhook events
    switch (event.eventType) {
      case 'checkout.completed':
        // 根据 request_id 查找并更新支付记录
        const requestId = event.object.request_id;
        if (!requestId) {
          console.error('No request_id in webhook data');
          return res.status(400).json({ error: 'Missing request_id' });
        }

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .update({
            status: event.object.order?.status || event.object.status || 'completed',
            creem_order_id: event.object.order?.id || null,
            payment_method: event.object.order?.payment_method || null,
            completed_at: event.object.order?.created_at ? new Date(event.object.order.created_at).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', requestId)
          .select()
          .single();

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
          processed = false;
        } else {
          console.log('Payment updated successfully');
          
          // Update user membership - 31天会员
          const user_id = event.object.metadata?.user_id || payment.user_id;
          if (user_id && payment) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 31);

            const membershipData = {
              user_id: user_id,
              membership_status: 'active',
              membership_level: 'premium',
              expires_at: expiresAt.toISOString(),
              last_payment_id: payment.id,
              updated_at: new Date().toISOString()
            };

            const { error: membershipError } = await supabase
              .from('member_info')
              .upsert(membershipData, { onConflict: 'user_id' });

            if (membershipError) {
              console.error('Error updating membership:', membershipError);
            } else {
              console.log('User membership upgraded to premium for 31 days');
            }
          }
        }
        break;
        
      case 'subscription.created':
      case 'subscription.active':
        const user_id_sub = event.object.metadata?.user_id || event.object.subscription?.customer;
        if (user_id_sub && event.object.subscription) {
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: user_id_sub,
              creem_subscription_id: event.object.subscription.id,
              creem_customer_id: event.object.subscription.customer,
              product_id: event.object.subscription.product,
              status: event.object.subscription.status as any,
              current_period_start: event.object.subscription.created_at,
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancel_at_period_end: false,
              metadata: event.object.metadata
            })
            .eq('creem_subscription_id', event.object.subscription.id);
          
          processed = !subscriptionError;
        }
        break;
        
      case 'subscription.updated':
        if (event.object.subscription) {
          const { error: updateSubError } = await supabase
            .from('subscriptions')
            .update({
              status: event.object.subscription.status as any,
              current_period_start: event.object.subscription.created_at,
              current_period_end: event.object.subscription.updated_at,
              cancel_at_period_end: false,
              metadata: event.object.metadata
            })
            .eq('creem_subscription_id', event.object.subscription.id);
          processed = !updateSubError;
        }
        break;
        
      case 'subscription.canceled':
        const { data: canceledSub, error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            metadata: { ...event.data, canceled_at: new Date().toISOString() }
          })
          .eq('creem_subscription_id', event.data.id)
          .select()
          .single();

        if (!cancelError && canceledSub) {
          // 更新会员状态 - 保持到期结束
          await supabase
            .from('member_info')
            .update({
              status: 'active',
              expires_at: canceledSub.current_period_end
            })
            .eq('user_id', canceledSub.user_id);
        }
        processed = !cancelError;
        break;
        
      case 'subscription.expired':
        const { data: expiredSub, error: expireError } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            metadata: event.data
          })
          .eq('creem_subscription_id', event.data.id)
          .select()
          .single();

        if (!expireError && expiredSub) {
          // 降级会员到免费
          await supabase
            .from('member_info')
            .update({
              status: 'expired',
              membership_type: 'free',
              expires_at: null
            })
            .eq('user_id', expiredSub.user_id);
        }
        processed = !expireError;
        break;
        
      case 'refund.created':
        const { error: refundError } = await supabase
          .from('payments')
          .update({
            status: 'refunded',
            webhook_event_id: event.id,
            metadata: event.data,
            updated_at: new Date().toISOString()
          })
          .eq('creem_order_id', event.data.order_id || event.data.id);
          
        processed = !refundError;
        break;
        
      default:
        console.log('Unhandled webhook event:', event.eventType);
        processed = true; // Mark as processed to avoid retries
    }

    if (processed) {
      return res.status(200).json({ received: true, event_id: event.id });
    } else {
      return res.status(500).json({ error: 'Failed to process webhook' });
    }
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}