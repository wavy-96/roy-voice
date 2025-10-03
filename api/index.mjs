// Simple test function following Vercel documentation exactly
export default function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://client-omega-plum-94.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, x-vercel-protection-bypass');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    message: 'Serverless function is working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    success: true
  });
}
