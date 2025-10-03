#!/usr/bin/env node

/**
 * Pagination Test Script
 * Tests cursor-based pagination functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const API_URL = 'http://localhost:3002';

// Create Supabase client for authentication
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function loginAsOrgAdmin() {
  console.log('\n🔐 Logging in as organization admin...\n');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'orgadmin@thecreativehorse.ca',
    password: 'admin123'
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }

  console.log('✅ Logged in successfully');
  console.log(`   User: ${data.user.email}`);
  console.log(`   Organization ID: ${data.user.user_metadata?.organization_id}`);
  
  return data.session.access_token;
}

async function testBasicPagination(token) {
  console.log('\n🔍 Testing Basic Pagination (First Page)...\n');

  try {
    const response = await fetch(`${API_URL}/api/multi-tenant/calls?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    console.log('📊 Response Structure:');
    console.log(`   Organization: ${data.organization.name}`);
    console.log(`   Calls Returned: ${data.calls.length}`);
    console.log(`   Pagination:`);
    console.log(`     - Limit: ${data.pagination.limit}`);
    console.log(`     - Count: ${data.pagination.count}`);
    console.log(`     - Has More: ${data.pagination.hasMore}`);
    console.log(`     - Next Cursor: ${data.pagination.nextCursor || 'null'}`);

    if (data.calls.length > 0) {
      console.log(`\n   First Call:`);
      console.log(`     - ID: ${data.calls[0].external_call_id}`);
      console.log(`     - Created: ${data.calls[0].created_at}`);
      
      if (data.calls.length > 1) {
        console.log(`\n   Last Call:`);
        console.log(`     - ID: ${data.calls[data.calls.length - 1].external_call_id}`);
        console.log(`     - Created: ${data.calls[data.calls.length - 1].created_at}`);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function testCursorPagination(token, cursor) {
  console.log('\n🔍 Testing Cursor-Based Pagination (Next Page)...\n');

  if (!cursor) {
    console.log('⚠️  No cursor provided, skipping cursor pagination test');
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/multi-tenant/calls?limit=10&cursor=${encodeURIComponent(cursor)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    console.log('📊 Response Structure:');
    console.log(`   Calls Returned: ${data.calls.length}`);
    console.log(`   Pagination:`);
    console.log(`     - Cursor Used: ${cursor}`);
    console.log(`     - Has More: ${data.pagination.hasMore}`);
    console.log(`     - Next Cursor: ${data.pagination.nextCursor || 'null'}`);

    if (data.calls.length > 0) {
      console.log(`\n   First Call on This Page:`);
      console.log(`     - ID: ${data.calls[0].external_call_id}`);
      console.log(`     - Created: ${data.calls[0].created_at}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function testPaginationWithDateRange(token) {
  console.log('\n🔍 Testing Pagination with Date Range...\n');

  try {
    const from = '2024-01-01T00:00:00.000Z';
    const to = '2024-12-31T23:59:59.999Z';
    
    const response = await fetch(
      `${API_URL}/api/multi-tenant/calls?limit=5&from=${from}&to=${to}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    console.log('📊 Response Structure:');
    console.log(`   Date Range: ${from} to ${to}`);
    console.log(`   Calls Returned: ${data.calls.length}`);
    console.log(`   Has More: ${data.pagination.hasMore}`);

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testLargePageSize(token) {
  console.log('\n🔍 Testing Large Page Size (100 items)...\n');

  try {
    const response = await fetch(`${API_URL}/api/multi-tenant/calls?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    
    console.log('📊 Response Structure:');
    console.log(`   Requested: 100 items`);
    console.log(`   Returned: ${data.calls.length} items`);
    console.log(`   Has More: ${data.pagination.hasMore}`);

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testCursorConsistency(token, firstPageData) {
  console.log('\n🔍 Testing Cursor Consistency...\n');

  if (!firstPageData || !firstPageData.pagination.nextCursor) {
    console.log('⚠️  Not enough data to test cursor consistency');
    return;
  }

  try {
    // Fetch same data twice using cursor
    const response1 = await fetch(
      `${API_URL}/api/multi-tenant/calls?limit=5&cursor=${encodeURIComponent(firstPageData.pagination.nextCursor)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const response2 = await fetch(
      `${API_URL}/api/multi-tenant/calls?limit=5&cursor=${encodeURIComponent(firstPageData.pagination.nextCursor)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data1 = await response1.json();
    const data2 = await response2.json();

    const sameCount = data1.calls.length === data2.calls.length;
    const sameFirstId = data1.calls[0]?.external_call_id === data2.calls[0]?.external_call_id;
    
    console.log('📊 Consistency Check:');
    console.log(`   Same Count: ${sameCount ? '✅' : '❌'} (${data1.calls.length} vs ${data2.calls.length})`);
    console.log(`   Same First Item: ${sameFirstId ? '✅' : '❌'}`);

    if (sameCount && sameFirstId) {
      console.log('\n✅ Cursor pagination is consistent!');
    } else {
      console.log('\n⚠️  Cursor pagination may have consistency issues');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Pagination Test Suite              ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    // Login first
    const token = await loginAsOrgAdmin();

    // Test basic pagination
    const firstPageData = await testBasicPagination(token);

    // Test cursor pagination if we have a cursor
    let secondPageData = null;
    if (firstPageData?.pagination?.nextCursor) {
      secondPageData = await testCursorPagination(token, firstPageData.pagination.nextCursor);
    }

    // Test pagination with date range
    await testPaginationWithDateRange(token);

    // Test large page size
    await testLargePageSize(token);

    // Test cursor consistency
    await testCursorConsistency(token, firstPageData);

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   All Tests Complete!                ║');
    console.log('╚═══════════════════════════════════════╝\n');

    // Sign out
    await supabase.auth.signOut();

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();

