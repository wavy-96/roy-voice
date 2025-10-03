const axios = require('axios');
const supabase = require('./supabase');

class RetellService {
  constructor() {
    this.apiKey = process.env.RETELL_API_KEY;
    this.agentId = process.env.RETELL_AGENT_ID;
    this.baseURL = 'https://api.retellai.com/v1';
    
    if (!this.apiKey || !this.agentId) {
      throw new Error('Missing Retell configuration. Please set RETELL_API_KEY and RETELL_AGENT_ID');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Map Retell status to our internal status
  mapStatus(retellStatus) {
    const statusMap = {
      'call_answered': 'answered',
      'call_ended': 'completed',
      'call_failed': 'failed',
      'no_answer': 'missed',
      'busy': 'busy',
      'voicemail': 'voicemail'
    };
    return statusMap[retellStatus] || retellStatus;
  }

  // Map Retell end reason to our internal end reason
  mapEndReason(retellEndReason) {
    const endReasonMap = {
      'customer_hangup': 'hangup',
      'agent_hangup': 'hangup',
      'call_ended': 'completed',
      'no_answer': 'no_answer',
      'busy': 'busy',
      'voicemail': 'voicemail',
      'error': 'error'
    };
    return endReasonMap[retellEndReason] || retellEndReason;
  }

  // Calculate duration and billed minutes
  calculateMetrics(startedAt, connectedAt, endedAt) {
    const startTime = new Date(startedAt);
    const connectTime = connectedAt ? new Date(connectedAt) : startTime;
    const endTime = endedAt ? new Date(endedAt) : null;
    
    let durationSeconds = 0;
    let billedMinutes = 0;
    
    if (endTime && connectTime) {
      durationSeconds = Math.max(0, Math.floor((endTime - connectTime) / 1000));
      billedMinutes = Math.ceil(durationSeconds / 60.0);
    }
    
    return { durationSeconds, billedMinutes };
  }

  // Normalize phone number to E.164 format
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1 and is 11 digits, it's US/Canada
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it's 10 digits, assume US/Canada and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // Otherwise, add + if not present
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }

  // Convert timestamp to ISO string (handle both milliseconds and ISO strings)
  convertTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // If it's already an ISO string, return as-is
    if (typeof timestamp === 'string' && timestamp.includes('T')) {
      return timestamp;
    }
    
    // If it's a number (milliseconds), convert to ISO string
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
    
    // If it's a string that looks like milliseconds, convert it
    if (typeof timestamp === 'string' && /^\d+$/.test(timestamp)) {
      return new Date(parseInt(timestamp)).toISOString();
    }
    
    return timestamp;
  }

  // Transform Retell call data to our schema
  transformCallData(retellCall) {
    // Handle both API response format and webhook format
    const callId = retellCall.call_id || retellCall.id;
    const agentId = retellCall.agent_id || this.agentId;
    
    // Convert timestamps to ISO strings (handle both milliseconds and ISO strings)
    const startedAt = this.convertTimestamp(retellCall.started_at || retellCall.start_timestamp);
    const endedAt = this.convertTimestamp(retellCall.ended_at || retellCall.end_timestamp);
    
    // Phone numbers might not be available in webhook data for privacy reasons
    const fromNumber = retellCall.from_number || retellCall.from_phone_number || retellCall.from_phone || retellCall.caller_number || retellCall.caller_phone;
    const toNumber = retellCall.to_number || retellCall.to_phone_number || retellCall.to_phone || retellCall.called_number || retellCall.called_phone;
    const direction = retellCall.direction || retellCall.call_direction;
    const status = retellCall.status || retellCall.call_status;
    const endReason = retellCall.end_reason || retellCall.disconnection_reason;

    const { durationSeconds, billedMinutes } = this.calculateMetrics(
      startedAt,
      retellCall.connected_at,
      endedAt
    );

    return {
      external_call_id: callId,
      agent_id: agentId,
      started_at: startedAt,
      connected_at: retellCall.connected_at,
      ended_at: endedAt,
      direction: direction || 'unknown',
      from_e164: this.normalizePhoneNumber(fromNumber),
      to_e164: this.normalizePhoneNumber(toNumber),
      status: this.mapStatus(status),
      end_reason: this.mapEndReason(endReason),
      duration_seconds: durationSeconds,
      billed_minutes: billedMinutes,
      outcome: retellCall.connected_at ? 'answered' : 'missed',
      detailed_summary: retellCall.call_analysis?.call_summary || 
                       retellCall.call_analysis?.custom_analysis_data?.detailed_call_summary ||
                       retellCall.detailed_summary || 
                       retellCall.summary || 
                       retellCall.call_summary,
      transcript: retellCall.transcript || retellCall.call_transcript,
      raw: retellCall
    };
  }

  // Fetch calls from Retell API
  async fetchCalls(startDate, endDate, limit = 100, offset = 0) {
    try {
      console.log(`Fetching calls from ${startDate} to ${endDate}, limit: ${limit}, offset: ${offset}`);
      
      // Try different endpoint variations based on Retell documentation
      const endpoints = [
        '/calls',  // Simple calls endpoint
        '/list-calls',  // List calls endpoint
        '/calls/list',  // Alternative structure
        '/agents/' + this.agentId + '/calls'  // Agent-specific calls
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await this.client.get(endpoint, {
            params: {
              agent_id: this.agentId,
              start_timestamp: startDate,
              end_timestamp: endDate,
              limit,
              offset
            }
          });
          
          console.log(`Success with endpoint: ${endpoint}`);
          return response.data;
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError.response?.status);
          continue;
        }
      }
      
      throw new Error('All API endpoints failed');
    } catch (error) {
      console.error('Error fetching calls from Retell:', error.response?.data || error.message);
      throw error;
    }
  }

  // Alternative method to fetch calls (if main endpoint doesn't work)
  async fetchCallsAlternative(startDate, endDate, limit = 100, offset = 0) {
    try {
      // Try without agent_id filter first
      const response = await this.client.get('/list-calls', {
        params: {
          start_timestamp: startDate,
          end_timestamp: endDate,
          limit,
          offset
        }
      });

      // Filter by agent_id on our end if needed
      if (response.data && response.data.calls) {
        response.data.calls = response.data.calls.filter(call => call.agent_id === this.agentId);
      }

      return response.data;
    } catch (error) {
      console.error('Alternative API call also failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Store call data in Supabase
  async storeCall(callData) {
    try {
      const { data, error } = await supabase
        .from('calls')
        .upsert(callData, { 
          onConflict: 'external_call_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Error storing call:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error storing call in database:', error);
      throw error;
    }
  }

  // Backfill calls for a date range
  async backfillCalls(startDate, endDate) {
    try {
      console.log(`Starting backfill from ${startDate} to ${endDate}`);
      
      let offset = 0;
      const limit = 100;
      let totalCalls = 0;
      
      while (true) {
        const retellData = await this.fetchCalls(startDate, endDate, limit, offset);
        
        if (!retellData.calls || retellData.calls.length === 0) {
          break;
        }
        
        console.log(`Processing ${retellData.calls.length} calls (offset: ${offset})`);
        
        for (const retellCall of retellData.calls) {
          const transformedCall = this.transformCallData(retellCall);
          await this.storeCall(transformedCall);
          totalCalls++;
        }
        
        offset += limit;
        
        // If we got fewer calls than the limit, we've reached the end
        if (retellData.calls.length < limit) {
          break;
        }
      }
      
      console.log(`Backfill completed. Total calls processed: ${totalCalls}`);
      return totalCalls;
    } catch (error) {
      console.error('Error during backfill:', error);
      throw error;
    }
  }

  // Process webhook event
  async processWebhookEvent(eventData) {
    try {
      console.log('Processing webhook event:', eventData.event);
      
      // Handle Retell webhook events based on their documentation
      if (eventData.event === 'call_started' || 
          eventData.event === 'call_ended' || 
          eventData.event === 'call_analyzed') {
        
        const transformedCall = this.transformCallData(eventData.call);
        await this.storeCall(transformedCall);
        
        console.log(`Webhook processed: ${eventData.event} for call ${eventData.call.call_id}`);
      } else {
        console.log(`Unknown webhook event: ${eventData.event}`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }
}

module.exports = new RetellService();
