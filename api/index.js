// Vercel Serverless Function Handler
// This wraps our Express app for Vercel's serverless environment

const app = require('../server/index');

// Export the Express app as a Vercel serverless function
module.exports = app;
