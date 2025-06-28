import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types';

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { product_id, request_id, metadata, user_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const finalRequestId = request_id || `order_${Date.now()}`;
    const finalMetadata = { 
      ...metadata, 
      user_id, 
      env: process.env.NODE_ENV || 'development' 
    };

    const response = await fetch('https://test-api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.VITE_CREEM_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: product_id || 'prod_1yWRgfSXvAaYQ1HfRE44VR',
        request_id: finalRequestId,
        metadata: finalMetadata,
        success_url: `${req.headers.origin || 'http://localhost:3000'}/payment-success`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Creem API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to create checkout session' });
    }

    const checkoutData = await response.json();

    // Save payment record to database
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id,
          creem_order_id: finalRequestId,
          creem_checkout_id: checkoutData.id,
          product_id: product_id || 'prod_1yWRgfSXvAaYQ1HfRE44VR',
          amount: 5.00,
          currency: 'USD',
          status: 'pending',
          payment_type: 'one_time', // 当前默认为一次性支付
          metadata: finalMetadata
        });

      if (paymentError) {
        console.error('Error saving payment record:', paymentError);
        // Continue anyway, webhook will handle the payment update
      } else {
        console.log('Payment record saved successfully');
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue anyway, webhook will handle the payment update
    }

    return res.status(200).json(checkoutData);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}