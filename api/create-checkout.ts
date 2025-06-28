import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { product_id, request_id, metadata } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const response = await fetch('https://test-api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.VITE_CREEM_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: product_id || 'prod_1yWRgfSXvAaYQ1HfRE44VR',
        request_id: request_id || `order_${Date.now()}`,
        metadata: metadata || { env: 'production' },
        success_url: `${req.headers.origin || 'http://localhost:3000'}/payment-success`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Creem API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to create checkout session' });
    }

    const checkoutData = await response.json();
    return res.status(200).json(checkoutData);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}