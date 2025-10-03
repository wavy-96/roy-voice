import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSupabase } from '../contexts/SupabaseContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

function AgentDetailView({ agent, organization, onClose }) {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState('billable');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [billableCalls, setBillableCalls] = useState([]);
  const [testCalls, setTestCalls] = useState([]);
  const [billableOverview, setBillableOverview] = useState(null);
  const [testOverview, setTestOverview] = useState(null);
  
  // Pagination states
  const [billablePage, setBillablePage] = useState(1);
  const [testPage, setTestPage] = useState(1);
  const [hasMoreBillable, setHasMoreBillable] = useState(true);
  const [hasMoreTest, setHasMoreTest] = useState(true);

  // Get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'ngrok-skip-browser-warning': 'true'
    };
  };

  // Fetch billable calls
  const fetchBillableCalls = async (page = 1, append = false) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/multi-tenant/calls`,
        { 
          params: { 
            organization_id: organization.id,
            agent_id: agent.agent_id,
            is_billable: true,
            page: page,
            limit: 20
          },
          headers 
        }
      );
      
      if (append) {
        setBillableCalls(prev => [...prev, ...response.data.calls]);
      } else {
        setBillableCalls(response.data.calls);
      }
      
      setHasMoreBillable(response.data.has_more);
      setBillableOverview(response.data.overview);
    } catch (err) {
      console.error('Error fetching billable calls:', err);
      setError(err.response?.data?.error || 'Failed to fetch billable calls');
    }
  };

  // Fetch test calls
  const fetchTestCalls = async (page = 1, append = false) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/multi-tenant/calls`,
        { 
          params: { 
            organization_id: organization.id,
            agent_id: agent.agent_id,
            is_billable: false,
            page: page,
            limit: 20
          },
          headers 
        }
      );
      
      if (append) {
        setTestCalls(prev => [...prev, ...response.data.calls]);
      } else {
        setTestCalls(response.data.calls);
      }
      
      setHasMoreTest(response.data.has_more);
      setTestOverview(response.data.overview);
    } catch (err) {
      console.error('Error fetching test calls:', err);
      setError(err.response?.data?.error || 'Failed to fetch test calls');
    }
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchBillableCalls(1, false),
        fetchTestCalls(1, false)
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agent && organization) {
      fetchData();
    }
  }, [agent, organization]);

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format phone number helper
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'Web Call';
    
    // Remove +1 prefix for US numbers and format
    if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
      const number = phoneNumber.slice(2);
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    
    return phoneNumber;
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load more calls
  const loadMoreBillable = () => {
    const nextPage = billablePage + 1;
    setBillablePage(nextPage);
    fetchBillableCalls(nextPage, true);
  };

  const loadMoreTest = () => {
    const nextPage = testPage + 1;
    setTestPage(nextPage);
    fetchTestCalls(nextPage, true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading agent details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
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
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'billable', name: 'Billable Calls', icon: '💰', count: billableOverview?.total_calls || 0 },
    { id: 'test', name: 'Test Calls', icon: '🧪', count: testOverview?.total_calls || 0 },
    { id: 'config', name: 'Configuration', icon: '⚙️' }
  ];

  const renderBillableTab = () => (
    <div className="space-y-6">
      {/* Billable Overview Cards */}
      {billableOverview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border-2 border-green-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">📞</div>
              <div>
                <p className="text-sm font-medium text-green-700 opacity-75">Total Calls</p>
                <p className="text-xl font-bold text-green-900">{billableOverview.total_calls || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">✅</div>
              <div>
                <p className="text-sm font-medium text-blue-700 opacity-75">Answer Rate</p>
                <p className="text-xl font-bold text-blue-900">{billableOverview.answer_rate || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">⏱️</div>
              <div>
                <p className="text-sm font-medium text-purple-700 opacity-75">Avg Duration</p>
                <p className="text-xl font-bold text-purple-900">
                  {formatDuration(billableOverview.avg_duration_seconds || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">💰</div>
              <div>
                <p className="text-sm font-medium text-orange-700 opacity-75">Revenue</p>
                <p className="text-xl font-bold text-orange-900">
                  ${billableOverview.expected_revenue?.toFixed(2) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billable Calls Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Billable Calls</h3>
          <p className="text-sm text-gray-500">
            Customer calls that generate revenue
          </p>
        </div>
        
        {billableCalls.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No billable calls yet</h3>
            <p className="text-gray-500">Billable calls will appear here when customers call this agent</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billableCalls.map((call) => (
                  <tr key={call.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {call.call_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPhoneNumber(call.from_number)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        call.status === 'answered' ? 'bg-green-100 text-green-800' :
                        call.status === 'no_answer' ? 'bg-red-100 text-red-800' :
                        call.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${((call.duration_seconds / 60) * organization.billing_rate_per_minute).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(call.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {hasMoreBillable && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={loadMoreBillable}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderTestTab = () => (
    <div className="space-y-6">
      {/* Test Overview Cards */}
      {testOverview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border-2 border-yellow-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">🧪</div>
              <div>
                <p className="text-sm font-medium text-yellow-700 opacity-75">Test Calls</p>
                <p className="text-xl font-bold text-yellow-900">{testOverview.total_calls || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">✅</div>
              <div>
                <p className="text-sm font-medium text-blue-700 opacity-75">Answer Rate</p>
                <p className="text-xl font-bold text-blue-900">{testOverview.answer_rate || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
            <div className="flex items-center">
              <div className="text-xl mr-3">⏱️</div>
              <div>
                <p className="text-sm font-medium text-purple-700 opacity-75">Avg Duration</p>
                <p className="text-xl font-bold text-purple-900">
                  {formatDuration(testOverview.avg_duration_seconds || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Calls Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Test Calls</h3>
          <p className="text-sm text-gray-500">
            Web calls used for testing (not billed)
          </p>
        </div>
        
        {testCalls.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">🧪</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No test calls yet</h3>
            <p className="text-gray-500">Test calls will appear here when you test the webhook</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testCalls.map((call) => (
                  <tr key={call.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {call.call_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPhoneNumber(call.from_number)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        call.status === 'answered' ? 'bg-green-100 text-green-800' :
                        call.status === 'no_answer' ? 'bg-red-100 text-red-800' :
                        call.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(call.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {hasMoreTest && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={loadMoreTest}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Configuration</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Agent Name</dt>
            <dd className="text-sm text-gray-900">{agent.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Retell Agent ID</dt>
            <dd className="text-sm text-gray-900 font-mono">{agent.agent_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-sm text-gray-900">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                agent.status === 'active' ? 'bg-green-100 text-green-800' :
                agent.status === 'pending_validation' ? 'bg-yellow-100 text-yellow-800' :
                agent.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {agent.status.replace('_', ' ')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Validation Status</dt>
            <dd className="text-sm text-gray-900">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                agent.is_validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {agent.is_validated ? 'Validated' : 'Pending'}
              </span>
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
            <dd className="text-sm text-gray-900 font-mono break-all bg-gray-100 p-2 rounded">
              {agent.webhook_url}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-sm text-gray-900">
              {new Date(agent.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="text-sm text-gray-900">
              {new Date(agent.updated_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Settings</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Organization</dt>
            <dd className="text-sm text-gray-900">{organization.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Billing Rate</dt>
            <dd className="text-sm text-gray-900">${organization.billing_rate_per_minute}/min</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">COGS</dt>
            <dd className="text-sm text-gray-900">${organization.cogs_per_minute}/min</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Markup</dt>
            <dd className="text-sm text-gray-900">
              {((organization.billing_rate_per_minute / organization.cogs_per_minute - 1) * 100).toFixed(1)}%
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'billable': return renderBillableTab();
      case 'test': return renderTestTab();
      case 'config': return renderConfigTab();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Agent Details</h2>
            <p className="text-sm text-gray-500">{agent.name} • {organization.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AgentDetailView;
