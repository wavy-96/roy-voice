// Regular Vercel Function using Node.js runtime
module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://client-omega-plum-94.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, x-vercel-protection-bypass');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple test response
  res.status(200).json({
    message: 'Vercel Function is working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    success: true
  });
};
