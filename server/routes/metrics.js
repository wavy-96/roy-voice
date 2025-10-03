const express = require('express');
const supabase = require('../services/supabase');

const router = express.Router();

// Get overview metrics
router.get('/overview', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to date parameters are required' });
    }

    // Convert dates to ISO strings
    const startDate = new Date(from).toISOString();
    const endDate = new Date(to).toISOString();

    // Get calls within date range
    const { data: calls, error } = await supabase
      .from('calls')
      .select('*')
      .gte('started_at', startDate)
      .lte('started_at', endDate)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching calls:', error);
      return res.status(500).json({ error: 'Failed to fetch calls' });
    }

    // Calculate metrics
    const totalCalls = calls.length;
    const answeredCalls = calls.filter(call => call.outcome === 'answered').length;
    const answeredPct = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
    
    const totalDurationSeconds = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    const avgDurationSeconds = totalCalls > 0 ? totalDurationSeconds / totalCalls : 0;
    
    const totalBilledMinutes = calls.reduce((sum, call) => sum + (call.billed_minutes || 0), 0);

    res.json({
      total_calls: totalCalls,
      answered_pct: Math.round(answeredPct * 100) / 100, // Round to 2 decimal places
      avg_duration_seconds: Math.round(avgDurationSeconds),
      total_billed_minutes: Math.round(totalBilledMinutes * 100) / 100,
      window: {
        from: startDate,
        to: endDate
      }
    });
  } catch (error) {
    console.error('Error in overview endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent calls
router.get('/calls', async (req, res) => {
  try {
    const { limit = 50, offset = 0, from, to } = req.query;
    
    let query = supabase
      .from('calls')
      .select('external_call_id, started_at, from_e164, to_e164, status, duration_seconds, billed_minutes, end_reason, detailed_summary')
      .order('started_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Add date filters if provided
    if (from && to) {
      const startDate = new Date(from).toISOString();
      const endDate = new Date(to).toISOString();
      query = query.gte('started_at', startDate).lte('started_at', endDate);
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
      return res.status(500).json({ error: 'Failed to fetch calls' });
    }

    res.json(calls || []);
  } catch (error) {
    console.error('Error in calls endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
