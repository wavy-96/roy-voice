import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSupabase } from '../contexts/SupabaseContext';
import OverviewCard from './OverviewCard';
import CallsTable from './CallsTable';
import DateRangePicker from './DateRangePicker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

function OrganizationDashboard({ user }) {
  const supabase = useSupabase();
  const [overview, setOverview] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
    to: new Date().toISOString() // Now
  });

  const inFlightRef = useRef(false);
  const lastRequestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!user || inFlightRef.current) return;
    const requestId = ++lastRequestIdRef.current;

    const controller = new AbortController();
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const token = session.access_token;

      console.log('Fetching organization data...');
      console.log('User:', user.email);
      console.log('Organization ID:', user.user_metadata?.organization_id);

      const [overviewResponse, callsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/multi-tenant/overview`, {
          params: { from: dateRange.from, to: dateRange.to },
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          signal: controller.signal
        }),
        axios.get(`${API_BASE_URL}/api/multi-tenant/calls`, {
          params: { from: dateRange.from, to: dateRange.to, limit: 50 },
          headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
          signal: controller.signal
        })
      ]);

      if (requestId !== lastRequestIdRef.current) return; // stale response

      setOverview(overviewResponse.data.overview);
      setCalls(callsResponse.data.calls);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      console.error('Error fetching data:', err);
      const message = err.response?.data?.error || (err.response?.status === 429
        ? 'Rate limit exceeded. Please wait a moment and refresh the page.'
        : 'Failed to fetch data');
      setError(message);
    } finally {
      if (requestId === lastRequestIdRef.current) setLoading(false);
      inFlightRef.current = false;
    }
    
    return () => controller.abort();
  }, [dateRange.from, dateRange.to, supabase]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchData();
    })();
    return () => { cancelled = true; };
  }, [fetchData, user]);

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDurationMinutes = (seconds) => {
    if (!seconds) return '0.00';
    return (seconds / 60).toFixed(2);
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'Web Call';
    
    // Remove +1 prefix for US numbers and format
    if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
      const number = phoneNumber.slice(2);
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    
    return phoneNumber;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Call Metrics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor your voice agent performance and call analytics
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Organization: {user.user_metadata?.organization_name || 'Unknown'}
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="mb-6">
          <DateRangePicker
            dateRange={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="mb-8">
            <OverviewCard 
              overview={overview}
              formatDuration={formatDuration}
              formatDurationMinutes={formatDurationMinutes}
            />
          </div>
        )}

        {/* Recent Calls Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Calls</h2>
            <p className="mt-1 text-sm text-gray-500">
              Last 50 calls within the selected date range
            </p>
          </div>
          
          <CallsTable
            calls={calls}
            formatDuration={formatDuration}
            formatPhoneNumber={formatPhoneNumber}
          />
        </div>
      </div>
    </div>
  );
}

export default OrganizationDashboard;
