#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * Tests that rate limiting is working correctly
 */

const axios = require('axios');

const API_URL = 'http://localhost:3002';

async function testHealthCheckRateLimit() {
  console.log('\n🔍 Testing Health Check Rate Limit (60 requests/minute)...\n');
  
  let successCount = 0;
  let rateLimitCount = 0;
  
  // Make 65 requests rapidly (should hit limit at 61)
  for (let i = 1; i <= 65; i++) {
    try {
      const response = await axios.get(`${API_URL}/health`);
      successCount++;
      if (i % 10 === 0) {
        console.log(`✅ Request ${i}: Success (${response.status})`);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitCount++;
        console.log(`⚠️  Request ${i}: Rate Limited (429) - ${error.response.data?.error}`);
      } else {
        console.error(`❌ Request ${i}: Error (${error.message})`);
      }
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Rate Limited: ${rateLimitCount}`);
  console.log(`   Expected: ~60 success, ~5 rate limited`);
  
  if (rateLimitCount > 0) {
    console.log(`\n✅ Rate limiting is WORKING!`);
  } else {
    console.log(`\n⚠️  Rate limiting may not be configured correctly`);
  }
}

async function testAPIRateLimit() {
  console.log('\n🔍 Testing API Rate Limit (100 requests/15min)...\n');
  
  let successCount = 0;
  let rateLimitCount = 0;
  
  // Make 10 quick requests to API endpoint
  for (let i = 1; i <= 10; i++) {
    try {
      const response = await axios.get(`${API_URL}/api/organizations`);
      successCount++;
      console.log(`✅ Request ${i}: Success (${response.status})`);
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitCount++;
        console.log(`⚠️  Request ${i}: Rate Limited (429)`);
      } else if (error.response?.status === 401) {
        // Unauthorized is expected (no JWT token)
        successCount++;
        console.log(`✅ Request ${i}: Reached endpoint (401 - auth required)`);
      } else {
        console.error(`❌ Request ${i}: Error (${error.message})`);
      }
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Reached endpoint: ${successCount}`);
  console.log(`   Rate Limited: ${rateLimitCount}`);
  console.log(`   Expected: All 10 should reach endpoint (under 100/15min limit)`);
}

async function checkRateLimitHeaders() {
  console.log('\n🔍 Checking Rate Limit Headers...\n');
  
  try {
    const response = await axios.get(`${API_URL}/health`);
    
    console.log('Rate Limit Headers:');
    console.log(`   RateLimit-Limit: ${response.headers['ratelimit-limit']}`);
    console.log(`   RateLimit-Remaining: ${response.headers['ratelimit-remaining']}`);
    console.log(`   RateLimit-Reset: ${response.headers['ratelimit-reset']}`);
    
    if (response.headers['ratelimit-limit']) {
      console.log(`\n✅ Rate limit headers are present!`);
    } else {
      console.log(`\n⚠️  Rate limit headers not found`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Rate Limiting Test Suite           ║');
  console.log('╚═══════════════════════════════════════╝');
  
  try {
    await checkRateLimitHeaders();
    await testAPIRateLimit();
    await testHealthCheckRateLimit();
    
    console.log('\n✅ All tests complete!\n');
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
}

// Run tests
runAllTests();

