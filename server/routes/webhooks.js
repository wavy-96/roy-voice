const express = require('express');
const crypto = require('crypto');
const retellService = require('../services/retell');
const AgentService = require('../services/agent');

const router = express.Router();
const agentService = new AgentService();

// Verify webhook signature (if Retell provides HMAC verification)
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) {
    console.warn('No webhook secret configured, skipping signature verification');
    return true;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Webhook endpoint for Retell call events
router.post('/retell/calls', async (req, res) => {
  try {
    // Log the full webhook payload for debugging
    console.log('=== WEBHOOK DEBUG ===');
    console.log('Event:', req.body.event);
    console.log('Call ID:', req.body.call?.call_id || req.body.call?.id);
    console.log('Agent ID:', req.body.call?.agent_id);
    console.log('From Number:', req.body.call?.from_number || req.body.call?.from_phone_number || req.body.call?.from_phone || req.body.call?.caller_number);
    console.log('To Number:', req.body.call?.to_number || req.body.call?.to_phone_number || req.body.call?.to_phone || req.body.call?.called_number);
    console.log('Detailed Summary:', req.body.call?.detailed_summary || req.body.call?.summary);
    console.log('Full Payload:', JSON.stringify(req.body, null, 2));
    console.log('===================');
    
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-retell-signature'] || req.headers['x-webhook-signature'];
    
    // Verify signature if provided
    if (signature && !verifyWebhookSignature(payload, signature, process.env.RETELL_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process the webhook event
    await retellService.processWebhookEvent(req.body);
    
    // Log the webhook attempt (without PII)
    console.log(`Webhook processed: ${req.body.event} for agent ${req.body.call?.agent_id || 'unknown'}`);
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Manual backfill endpoint (for testing)
router.post('/retell/backfill', async (req, res) => {
  try {
    const { from, to } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to dates are required' });
    }

    const totalCalls = await retellService.backfillCalls(from, to);
    
    res.json({ 
      status: 'success', 
      message: `Backfilled ${totalCalls} calls`,
      total_calls: totalCalls
    });
  } catch (error) {
    console.error('Error during backfill:', error);
    res.status(500).json({ error: 'Backfill failed' });
  }
});

// Per-agent webhook endpoint (for agent validation and specific routing)
router.post('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const webhookUrlPath = `/webhooks/agent/${agentId}`;
    
    // Log the webhook for debugging
    console.log('=== AGENT WEBHOOK RECEIVED ===');
    console.log('Agent ID (from URL):', agentId);
    console.log('Event:', req.body.event);
    console.log('Call ID:', req.body.call?.call_id || req.body.call?.id);
    console.log('Agent ID (from Retell):', req.body.call?.agent_id);
    console.log('==============================');
    
    // Get the agent from database to verify it exists
    const agent = await agentService.getAgentByWebhookUrl(webhookUrlPath);
    
    if (!agent) {
      console.error(`Agent not found for webhook URL: ${webhookUrlPath}`);
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Extract agent_id from Retell's webhook payload
    const retellAgentId = req.body.call?.agent_id;
    
    if (!retellAgentId) {
      console.error('No agent_id in webhook payload');
      return res.status(400).json({ error: 'Invalid webhook payload: missing agent_id' });
    }
    
    // Validate that the Retell agent_id matches our stored agent_id
    if (agent.agent_id !== retellAgentId) {
      console.error(`Agent ID mismatch. Expected: ${agent.agent_id}, Got: ${retellAgentId}`);
      return res.status(400).json({ error: 'Agent ID mismatch' });
    }
    
    // Record webhook received (validates the agent if it was pending)
    try {
      await agentService.recordWebhookReceived(webhookUrlPath, retellAgentId);
      console.log(`✅ Agent ${agent.name} validated successfully`);
    } catch (recordError) {
      console.error('Error recording webhook:', recordError);
      // Continue processing even if recording fails
    }
    
    // Process the webhook event normally
    await retellService.processWebhookEvent(req.body);
    
    res.status(200).json({ status: 'success', agent_validated: true });
  } catch (error) {
    console.error('Error processing agent webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Health check for webhooks
router.get('/retell/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    agent_id: process.env.RETELL_AGENT_ID 
  });
});

// Debug endpoint to see webhook data structure
router.get('/retell/debug', async (req, res) => {
  try {
    const supabase = require('../services/supabase');
    const { data: calls, error } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    res.json({
      latest_call: calls[0],
      raw_data: calls[0]?.raw
    });
  } catch (error) {
    console.error('Debug endpoint failed:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

module.exports = router;
