const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Proxy endpoint for Creem API
app.post('/api/create-checkout', async (req, res) => {
  try {
    const { product_id, request_id, metadata } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const response = await fetch('https://test-api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'x-api-key': 'creem_test_4K2FMpIqasezjFQxcXxcZy',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id,
        request_id: request_id || `order_${Date.now()}`,
        metadata: metadata || { env: 'development' },
        success_url: 'http://localhost:5174/payment-success',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Creem API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to create checkout session', details: errorData });
    }

    const checkoutData = await response.json();
    console.log('Checkout session created:', checkoutData);
    return res.status(200).json(checkoutData);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});