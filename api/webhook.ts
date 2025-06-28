import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-creem-signature'] as string;
    const body = JSON.stringify(req.body);
    
    // Verify webhook signature
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const expectedSignature = createHash('sha256')
      .update(body + secret)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    
    // Handle different webhook events
    switch (event.type) {
      case 'checkout.completed':
        console.log('Payment completed:', event.data);
        // Here you would update your database to mark the user as paid
        // For example:
        // await updateUserSubscription(event.data.customer_id, event.data.product_id);
        break;
        
      case 'checkout.failed':
        console.log('Payment failed:', event.data);
        // Handle failed payment
        break;
        
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}