const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Proxy endpoint for Creem API
app.post('/api/create-checkout', async (req, res) => {
  try {
    const { product_id, user_id, customer_email, metadata } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate unique order_id (系统内部唯一标识)
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const finalMetadata = { 
      ...metadata, 
      user_id, 
      env: 'development' 
    };

    const response = await fetch('https://test-api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'x-api-key': 'creem_test_4K2FMpIqasezjFQxcXxcZy',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id,
        request_id: orderId, // 使用系统生成的 order_id 作为 request_id
        metadata: finalMetadata,
        success_url: `http://localhost:3000/payment-success?order_id=${orderId}`,
        customer: customer_email ? { email: customer_email } : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Creem API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to create checkout session', details: errorData });
    }

    const checkoutData = await response.json();
    console.log('Checkout session created:', checkoutData);

    // Save payment record to database using new schema
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId, // 系统内部订单ID，主键
          user_id,
          product_id,
          amount: 5.00,
          currency: 'USD',
          status: 'pending',
          creem_checkout_id: checkoutData.id, // Creem返回的checkout ID
          customer_email: customer_email || null,
          metadata: finalMetadata
        });

      if (paymentError) {
        console.error('Error saving payment record:', paymentError);
      } else {
        console.log('Payment record saved to database');
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    return res.status(200).json(checkoutData);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Add root path webhook handler (fallback for Creem)
app.post('/', async (req, res) => {
  try {
    const signature = req.headers['creem-signature'];
    const rawBody = JSON.stringify(req.body);
    
    console.log('Received webhook at root path:', req.body.eventType, req.body.id);
    
    // Verify webhook signature
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    let processed = false;

    // Handle different webhook events
    switch (event.eventType) {
      case 'checkout.completed':
        console.log('Processing checkout.completed at root:', event.object);
        
        // 根据 request_id 查找支付记录 (request_id 对应我们的 order_id)
        const requestId = event.object.request_id;
        if (!requestId) {
          console.error('No request_id in webhook data');
          return res.status(400).json({ error: 'Missing request_id' });
        }

        // Update payment record using order_id as key
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .update({
            status: event.object.order?.status || event.object.status || 'completed',
            creem_order_id: event.object.order?.id || null, // Creem平台的订单ID
            payment_method: event.object.order?.payment_method || null,
            completed_at: event.object.order?.created_at ? new Date(event.object.order.created_at).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', requestId) // 使用 order_id 匹配
          .select()
          .single();

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
        } else {
          console.log('Payment updated successfully');
          
          // Update user membership - 31天会员
          const user_id = event.object.metadata?.user_id || payment.user_id;
          if (user_id && payment) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 31);

            const membershipData = {
              user_id: user_id, // 必须包含 user_id
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
        
        // 如果是订阅产品，还需要处理订阅记录
        if (!paymentError && event.object.subscription) {
          console.log('Processing subscription for checkout:', event.object.subscription.id);
          await handleSubscriptionFromCheckout(event.object, payment.user_id);
        }
        
        processed = !paymentError;
        break;
        
      case 'subscription.active':
      case 'subscription.paid':
        console.log('Processing subscription event:', event.eventType, event.object);
        
        const subscriptionData = event.object;
        const sub_user_id = subscriptionData.metadata?.user_id;
        
        if (!sub_user_id) {
          console.error('No user_id in subscription metadata');
          processed = false;
          break;
        }
        
        // 首先检查是否已存在订阅记录
        const { data: existingSubscription, error: checkError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('creem_subscription_id', subscriptionData.id)
          .single();
        
        let subscription;
        let subscriptionError;
        
        if (existingSubscription) {
          // 更新现有订阅
          const { data: updatedSub, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: subscriptionData.status,
              current_period_start: subscriptionData.current_period_start_date,
              current_period_end: subscriptionData.current_period_end_date,
              canceled_at: subscriptionData.canceled_at,
              updated_at: new Date().toISOString()
            })
            .eq('creem_subscription_id', subscriptionData.id)
            .select()
            .single();
          
          subscription = updatedSub;
          subscriptionError = updateError;
        } else {
          // 创建新订阅
          const { data: newSub, error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: sub_user_id,
              creem_subscription_id: subscriptionData.id,
              creem_customer_id: subscriptionData.customer,
              product_id: subscriptionData.product,
              status: subscriptionData.status,
              current_period_start: subscriptionData.current_period_start_date,
              current_period_end: subscriptionData.current_period_end_date,
              canceled_at: subscriptionData.canceled_at
            })
            .select()
            .single();
          
          subscription = newSub;
          subscriptionError = insertError;
        }
        
        if (subscriptionError) {
          console.error('Error creating/updating subscription:', subscriptionError);
          processed = false;
        } else {
          console.log('Subscription updated successfully:', subscription.id);
          
          // 更新会员信息基于订阅
          await updateMembershipFromSubscription(subscription);
          processed = true;
        }
        break;
        
      default:
        console.log('Unhandled webhook event at root:', event.eventType);
        processed = true;
    }

    if (processed) {
      return res.status(200).json({ received: true, event_id: event.id });
    } else {
      return res.status(500).json({ error: 'Failed to process webhook' });
    }
    
  } catch (error) {
    console.error('Error processing webhook at root:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add webhook endpoint for local testing
app.post('/api/webhook', async (req, res) => {
  try {
    const signature = req.headers['creem-signature'];
    const rawBody = JSON.stringify(req.body);
    
    console.log('Received webhook:', req.body.eventType, req.body.id);
    
    // Verify webhook signature
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    let processed = false;

    // Handle different webhook events
    switch (event.eventType) {
      case 'checkout.completed':
        console.log('Processing checkout.completed:', event.object);
        
        // 根据 request_id 查找支付记录 (request_id 对应我们的 order_id)
        const requestId = event.object.request_id;
        if (!requestId) {
          console.error('No request_id in webhook data');
          return res.status(400).json({ error: 'Missing request_id' });
        }

        // Update payment record using order_id as key
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .update({
            status: event.object.order?.status || event.object.status || 'completed',
            creem_order_id: event.object.order?.id || null, // Creem平台的订单ID
            payment_method: event.object.order?.payment_method || null,
            completed_at: event.object.order?.created_at ? new Date(event.object.order.created_at).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', requestId) // 使用 order_id 匹配
          .select()
          .single();

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
        } else {
          console.log('Payment updated successfully');
          
          // Update user membership - 31天会员
          const user_id = event.object.metadata?.user_id || payment.user_id;
          if (user_id && payment) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 31);

            const membershipData = {
              user_id: user_id, // 必须包含 user_id
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
        
        processed = !paymentError;
        break;
        
      default:
        console.log('Unhandled webhook event:', event.eventType);
        processed = true;
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
});

// Helper function to handle subscription from checkout
async function handleSubscriptionFromCheckout(checkoutObject, userId) {
  try {
    if (!checkoutObject.subscription) {
      return;
    }
    
    const sub = checkoutObject.subscription;
    console.log('Creating subscription from checkout:', sub.id);
    
    // 首先检查是否已存在订阅记录
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('creem_subscription_id', sub.id)
      .single();
    
    let subscription;
    let subscriptionError;
    
    if (existingSubscription) {
      // 更新现有订阅
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: sub.status,
          current_period_start: sub.current_period_start_date,
          current_period_end: sub.current_period_end_date,
          canceled_at: sub.canceled_at,
          updated_at: new Date().toISOString()
        })
        .eq('creem_subscription_id', sub.id)
        .select()
        .single();
      
      subscription = updatedSub;
      subscriptionError = updateError;
    } else {
      // 创建新订阅
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          creem_subscription_id: sub.id,
          creem_customer_id: sub.customer,
          product_id: sub.product,
          status: sub.status,
          current_period_start: sub.current_period_start_date,
          current_period_end: sub.current_period_end_date,
          canceled_at: sub.canceled_at
        })
        .select()
        .single();
      
      subscription = newSub;
      subscriptionError = insertError;
    }
    
    if (subscriptionError) {
      console.error('Error creating subscription from checkout:', subscriptionError);
    } else {
      console.log('Subscription created from checkout:', subscription.id);
      
      // 更新会员信息基于订阅
      await updateMembershipFromSubscription(subscription);
    }
  } catch (error) {
    console.error('Error in handleSubscriptionFromCheckout:', error);
  }
}

// Helper function to update membership based on all user's subscriptions
async function updateMembershipFromSubscription(subscription) {
  try {
    console.log('Updating membership from subscription:', subscription.creem_subscription_id);
    
    // 获取用户的所有激活订阅
    const { data: allSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', subscription.user_id)
      .eq('status', 'active')
      .order('current_period_start', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching user subscriptions:', fetchError);
      return;
    }
    
    console.log(`Found ${allSubscriptions.length} active subscriptions for user`);
    
    let membershipStatus = 'inactive';
    let membershipLevel = 'free';
    let expiresAt = null;
    let totalDays = 0;
    
    if (allSubscriptions.length > 0) {
      // 计算所有订阅的总时长
      let earliestStart = new Date(allSubscriptions[0].current_period_start);
      
      allSubscriptions.forEach(sub => {
        const startDate = new Date(sub.current_period_start);
        const endDate = new Date(sub.current_period_end);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        totalDays += days;
        
        console.log(`Subscription ${sub.creem_subscription_id}: ${days} days`);
      });
      
      // 计算累积的过期时间
      const accumulatedExpiry = new Date(earliestStart);
      accumulatedExpiry.setDate(accumulatedExpiry.getDate() + totalDays);
      
      membershipStatus = 'active';
      membershipLevel = 'premium';
      expiresAt = accumulatedExpiry.toISOString();
      
      console.log(`Total subscription days: ${totalDays}, expires at: ${expiresAt}`);
    }
    
    const membershipData = {
      user_id: subscription.user_id,
      membership_status: membershipStatus,
      membership_level: membershipLevel,
      expires_at: expiresAt,
      last_subscription_id: subscription.id,
      updated_at: new Date().toISOString()
    };
    
    const { error: membershipError } = await supabase
      .from('member_info')
      .upsert(membershipData, { onConflict: 'user_id' });
    
    if (membershipError) {
      console.error('Error updating membership from subscription:', membershipError);
    } else {
      console.log('Membership updated from subscription:', {
        user_id: subscription.user_id,
        status: membershipStatus,
        level: membershipLevel,
        expires_at: expiresAt,
        total_days: totalDays
      });
    }
  } catch (error) {
    console.error('Error in updateMembershipFromSubscription:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhook`);
});