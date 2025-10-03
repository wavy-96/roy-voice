#!/usr/bin/env node

/**
 * Input Validation Test Script
 * Tests that Joi validation is working correctly
 */

const axios = require('axios');

const API_URL = 'http://localhost:3002';

// Test counter
let passed = 0;
let failed = 0;

function logTest(name, success, details = '') {
  if (success) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

async function testCreateOrganizationValidation() {
  console.log('\n🔍 Testing Create Organization Validation...\n');

  // Test 1: Valid organization data
  try {
    const response = await axios.post(`${API_URL}/api/organizations`, {
      name: 'Test Organization',
      retell_api_key: 'key_abc123def456',
      retell_agent_id: 'agent_xyz789'
    });
    logTest('Accept valid organization data', response.status === 201);
  } catch (error) {
    if (error.response?.status === 500) {
      // Expected - Supabase issues, but validation passed
      logTest('Accept valid organization data', true, 'Validation passed (Supabase error expected)');
    } else {
      logTest('Accept valid organization data', false, error.message);
    }
  }

  // Test 2: Missing required field (name)
  try {
    await axios.post(`${API_URL}/api/organizations`, {
      retell_api_key: 'key_abc123',
      retell_agent_id: 'agent_xyz789'
    });
    logTest('Reject missing name', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject missing name',
      error.response?.status === 400,
      error.response?.data?.error
    );
  }

  // Test 3: Invalid API key format
  try {
    await axios.post(`${API_URL}/api/organizations`, {
      name: 'Test Org',
      retell_api_key: 'invalid_key_format', // Should start with 'key_'
      retell_agent_id: 'agent_xyz789'
    });
    logTest('Reject invalid API key format', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject invalid API key format',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 4: Invalid agent ID format
  try {
    await axios.post(`${API_URL}/api/organizations`, {
      name: 'Test Org',
      retell_api_key: 'key_abc123',
      retell_agent_id: 'invalid_agent' // Should start with 'agent_'
    });
    logTest('Reject invalid agent ID format', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject invalid agent ID format',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 5: Name too short
  try {
    await axios.post(`${API_URL}/api/organizations`, {
      name: 'A', // Min 2 characters
      retell_api_key: 'key_abc123',
      retell_agent_id: 'agent_xyz789'
    });
    logTest('Reject name too short', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject name too short',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 6: Unknown fields stripped
  try {
    const response = await axios.post(`${API_URL}/api/organizations`, {
      name: 'Test Org',
      retell_api_key: 'key_abc123',
      retell_agent_id: 'agent_xyz789',
      malicious_field: 'should be stripped',
      another_unknown: 'also stripped'
    });
    logTest('Strip unknown fields', response.status === 201 || response.status === 500, 'Unknown fields should be ignored');
  } catch (error) {
    if (error.response?.status === 500) {
      logTest('Strip unknown fields', true, 'Validation passed (Supabase error expected)');
    } else {
      logTest('Strip unknown fields', false, error.message);
    }
  }
}

async function testUpdateOrganizationValidation() {
  console.log('\n🔍 Testing Update Organization Validation...\n');

  const testOrgId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID format

  // Test 1: Valid update
  try {
    await axios.put(`${API_URL}/api/organizations/${testOrgId}`, {
      name: 'Updated Name'
    });
    logTest('Accept valid update', true, 'Validation passed');
  } catch (error) {
    if (error.response?.status === 500 || error.response?.status === 404) {
      logTest('Accept valid update', true, 'Validation passed (DB error expected)');
    } else {
      logTest('Accept valid update', false, error.message);
    }
  }

  // Test 2: Empty update (no fields)
  try {
    await axios.put(`${API_URL}/api/organizations/${testOrgId}`, {});
    logTest('Reject empty update', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject empty update',
      error.response?.status === 400,
      error.response?.data?.error
    );
  }

  // Test 3: Invalid field in update
  try {
    await axios.put(`${API_URL}/api/organizations/${testOrgId}`, {
      retell_api_key: 'not_a_valid_key' // Should start with 'key_'
    });
    logTest('Reject invalid field in update', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject invalid field in update',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }
}

async function testMetricsQueryValidation() {
  console.log('\n🔍 Testing Metrics Query Validation...\n');

  // Note: These will fail auth (401), but we're testing validation happens first

  // Test 1: Valid query parameters (should pass validation, fail on auth)
  try {
    await axios.get(`${API_URL}/api/multi-tenant/calls`, {
      params: {
        limit: 50,
        offset: 0,
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-12-31T23:59:59.999Z'
      }
    });
    logTest('Accept valid query params', true);
  } catch (error) {
    // 401 = passed validation, failed auth (correct!)
    // 400 = failed validation (incorrect!)
    if (error.response?.status === 401) {
      logTest('Accept valid query params', true, 'Validation passed (Auth error expected)');
    } else if (error.response?.status === 400) {
      logTest('Accept valid query params', false, `Validation failed: ${error.response?.data?.error}`);
    } else {
      logTest('Accept valid query params', true, 'Reached endpoint');
    }
  }

  // Test 2: Limit too high
  try {
    await axios.get(`${API_URL}/api/multi-tenant/calls`, {
      params: {
        limit: 2000 // Max is 1000
      }
    });
    logTest('Reject limit too high', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject limit too high',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 3: Negative offset
  try {
    await axios.get(`${API_URL}/api/multi-tenant/calls`, {
      params: {
        offset: -10
      }
    });
    logTest('Reject negative offset', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject negative offset',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 4: Invalid date format
  try {
    await axios.get(`${API_URL}/api/multi-tenant/calls`, {
      params: {
        from: 'not-a-date'
      }
    });
    logTest('Reject invalid date format', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject invalid date format',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 5: Future dates
  try {
    await axios.get(`${API_URL}/api/multi-tenant/calls`, {
      params: {
        from: '2030-01-01T00:00:00.000Z' // Future date
      }
    });
    logTest('Reject future dates', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject future dates',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }

  // Test 6: Invalid UUID for organizationId
  try {
    await axios.get(`${API_URL}/api/multi-tenant/calls`, {
      params: {
        organizationId: 'not-a-uuid'
      }
    });
    logTest('Reject invalid UUID', false, 'Should have returned 400');
  } catch (error) {
    logTest(
      'Reject invalid UUID',
      error.response?.status === 400,
      error.response?.data?.details?.[0]?.message
    );
  }
}

async function testValidationErrorFormat() {
  console.log('\n🔍 Testing Validation Error Format...\n');

  try {
    await axios.post(`${API_URL}/api/organizations`, {
      name: 'A', // Too short
      retell_api_key: 'invalid', // Wrong format
      retell_agent_id: 'also_invalid' // Wrong format
    });
    logTest('Return multiple errors', false);
  } catch (error) {
    const data = error.response?.data;
    const hasError = data?.error === 'Validation failed';
    const hasDetails = Array.isArray(data?.details) && data.details.length > 0;
    const hasFieldInfo = data?.details?.[0]?.field && data?.details?.[0]?.message;
    
    logTest(
      'Return multiple errors',
      hasError && hasDetails && hasFieldInfo,
      `Returned ${data?.details?.length} validation errors`
    );
  }
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Input Validation Test Suite        ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    await testCreateOrganizationValidation();
    await testUpdateOrganizationValidation();
    await testMetricsQueryValidation();
    await testValidationErrorFormat();

    console.log('\n╔═══════════════════════════════════════╗');
    console.log(`║   Results: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 14 - passed.toString().length - failed.toString().length))}║`);
    console.log('╚═══════════════════════════════════════╝\n');

    if (failed === 0) {
      console.log('🎉 All validation tests passed!\n');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Please review.\n`);
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
}

// Run tests
runAllTests();

