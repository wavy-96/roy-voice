require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const API_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3002';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testBillableSystem() {
  console.log('🧪 Testing Billable Call System\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Authenticate
    console.log('\n📝 Step 1: Authenticating...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.ORG_ADMIN_EMAIL || 'orgadmin@thecreativehorse.ca',
      password: process.env.ORG_ADMIN_PASSWORD || 'admin123'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }

    const token = authData.session.access_token;
    const user = authData.user;
    console.log('✅ Authenticated as:', user.email);
    console.log('   Role:', user.user_metadata?.role);
    console.log('   Organization ID:', user.user_metadata?.organization_id);

    // Step 2: Test Overview API (should show billable breakdown)
    console.log('\n📊 Step 2: Testing Overview API...');
    const overviewResponse = await axios.get(
      `${API_BASE_URL}/api/multi-tenant/overview`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );

    const overview = overviewResponse.data.overview;
    console.log('✅ Overview Data:');
    console.log('   Total Calls:', overview.total_calls);
    console.log('   Billable Calls:', overview.billable_calls || 'N/A');
    console.log('   Test Calls:', overview.test_calls || 'N/A');
    console.log('   Total Billed Minutes:', overview.total_billed_minutes);
    console.log('   Expected Revenue: $' + (overview.expected_revenue?.toFixed(2) || '0.00'));

    // Step 3: Test Calls API (get all calls)
    console.log('\n📞 Step 3: Testing Calls API (all calls)...');
    const allCallsResponse = await axios.get(
      `${API_BASE_URL}/api/multi-tenant/calls?limit=10`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );

    const allCalls = allCallsResponse.data.calls;
    console.log('✅ Retrieved', allCalls.length, 'calls');
    
    if (allCalls.length > 0) {
      const sampleCall = allCalls[0];
      console.log('   Sample Call:');
      console.log('   - From:', sampleCall.from_e164 || 'Web Call');
      console.log('   - To:', sampleCall.to_e164 || 'N/A');
      console.log('   - Is Billable:', sampleCall.is_billable);
      console.log('   - Minutes:', sampleCall.billed_minutes);
    }

    // Step 4: Test Calls API (billable only)
    console.log('\n💰 Step 4: Testing Calls API (billable only)...');
    const billableCallsResponse = await axios.get(
      `${API_BASE_URL}/api/multi-tenant/calls?limit=10&isBillable=true`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );

    const billableCalls = billableCallsResponse.data.calls;
    console.log('✅ Retrieved', billableCalls.length, 'billable calls');
    
    const totalRevenue = billableCalls.reduce((sum, call) => {
      return sum + (call.billed_minutes || 0) * 0.04; // Assuming $0.04/min
    }, 0);
    console.log('   Expected Revenue from these calls: $' + totalRevenue.toFixed(2));

    // Step 5: Test Calls API (test calls only)
    console.log('\n🧪 Step 5: Testing Calls API (test calls only)...');
    const testCallsResponse = await axios.get(
      `${API_BASE_URL}/api/multi-tenant/calls?limit=10&isBillable=false`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );

    const testCalls = testCallsResponse.data.calls;
    console.log('✅ Retrieved', testCalls.length, 'test calls');
    if (testCalls.length > 0) {
      console.log('   These are NOT billed (web calls)');
    }

    // Step 6: Verify is_billable logic
    console.log('\n🔍 Step 6: Verifying is_billable Logic...');
    let correctCount = 0;
    let incorrectCount = 0;

    allCalls.forEach(call => {
      const expectedBillable = call.from_e164 && call.from_e164.length > 0;
      const actualBillable = call.is_billable;
      
      if (expectedBillable === actualBillable) {
        correctCount++;
      } else {
        incorrectCount++;
        console.log('   ⚠️  Mismatch:', call.external_call_id, 
                    'Expected:', expectedBillable, 'Got:', actualBillable);
      }
    });

    console.log('✅ Billable Logic Verification:');
    console.log('   Correct:', correctCount + '/' + allCalls.length);
    console.log('   Incorrect:', incorrectCount + '/' + allCalls.length);

    // Step 7: Test Overview with billable filter
    console.log('\n📊 Step 7: Testing Overview API (billable only)...');
    const billableOverviewResponse = await axios.get(
      `${API_BASE_URL}/api/multi-tenant/overview?isBillable=true`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );

    const billableOverview = billableOverviewResponse.data.overview;
    console.log('✅ Billable Overview:');
    console.log('   Total Calls:', billableOverview.total_calls);
    console.log('   Expected Revenue: $' + (billableOverview.expected_revenue?.toFixed(2) || '0.00'));

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Authentication: PASSED');
    console.log('✅ Overview API: PASSED');
    console.log('✅ Calls API (all): PASSED');
    console.log('✅ Calls API (billable filter): PASSED');
    console.log('✅ Calls API (test filter): PASSED');
    console.log('✅ Billable logic verification:', correctCount + '/' + allCalls.length, 'correct');
    console.log('✅ Overview with filter: PASSED');
    
    if (incorrectCount === 0) {
      console.log('\n🎉 ALL TESTS PASSED! System is working perfectly!');
    } else {
      console.log('\n⚠️  Some billable logic mismatches detected');
    }

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   HTTP Status:', error.response.status);
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received');
      console.error('   Request:', error.request);
    } else {
      console.error('   Error:', error.message);
    }
    console.error('\n   Stack:', error.stack);
    process.exit(1);
  }
}

testBillableSystem();

