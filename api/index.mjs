// Try using Web API Request/Response objects
export default async function handler(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://client-omega-plum-94.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, x-vercel-protection-bypass'
      }
    });
  }

  // Return JSON response
  return new Response(JSON.stringify({
    message: 'Serverless function is working!',
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
    success: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://client-omega-plum-94.vercel.app',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, x-vercel-protection-bypass'
    }
  });
}
