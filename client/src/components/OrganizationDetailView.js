import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSupabase } from '../contexts/SupabaseContext';
import AgentWizardModal from './AgentWizardModal';
import AgentDetailView from './AgentDetailView';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

function OrganizationDetailView({ organization, onBack }) {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // Modal states
  const [showAgentWizard, setShowAgentWizard] = useState(false);
  const [showAgentDetail, setShowAgentDetail] = useState(false);

  // Get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'ngrok-skip-browser-warning': 'true'
    };
  };

  // Fetch organization overview
  const fetchOverview = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/multi-tenant/overview`,
        { 
          params: { 
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString()
          },
          headers 
        }
      );
      setOverview(response.data);
    } catch (err) {
      console.error('Error fetching overview:', err);
      setError(err.response?.data?.error || 'Failed to fetch overview');
    }
  };

  // Fetch agents for organization
  const fetchAgents = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/agents/organizations/${organization.id}/agents`,
        { headers }
      );
      setAgents(response.data);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err.response?.data?.error || 'Failed to fetch agents');
    }
  };

  // Fetch users for organization
  const fetchUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/api/users`, { headers });
      // Filter users for this organization
      const orgUsers = response.data.filter(user => 
        user.organization_id === organization.id
      );
      setUsers(orgUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to fetch users');
    }
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchOverview(),
        fetchAgents(),
        fetchUsers()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  // Handle agent creation
  const handleCreateAgent = () => {
    setShowAgentWizard(true);
  };

  const handleAgentWizardSuccess = () => {
    setShowAgentWizard(false);
    fetchAgents(); // Refresh agents list
  };

  const handleAgentWizardClose = () => {
    setShowAgentWizard(false);
  };

  // Handle agent selection
  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setShowAgentDetail(true);
  };

  const handleAgentDetailClose = () => {
    setShowAgentDetail(false);
    setSelectedAgent(null);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organization details...</p>
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'agents', name: 'Agents', icon: '🤖' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📞</div>
              <div>
                <p className="text-sm font-medium text-blue-700 opacity-75">Total Calls</p>
                <p className="text-2xl font-bold text-blue-900">{overview.total_calls || 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {overview.billable_calls || 0} billable, {overview.test_calls || 0} test
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-green-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <p className="text-sm font-medium text-green-700 opacity-75">Answered Rate</p>
                <p className="text-2xl font-bold text-green-900">{overview.answer_rate || 0}%</p>
                <p className="text-xs text-green-600 mt-1">
                  {overview.answered_calls || 0} answered
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-purple-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⏱️</div>
              <div>
                <p className="text-sm font-medium text-purple-700 opacity-75">Avg Duration</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatDuration(overview.avg_duration_seconds || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {(overview.avg_duration_seconds / 60 || 0).toFixed(2)} min avg
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-orange-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💰</div>
              <div>
                <p className="text-sm font-medium text-orange-700 opacity-75">Total Minutes</p>
                <p className="text-2xl font-bold text-orange-900">
                  {overview.total_billed_minutes?.toFixed(1) || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  ${overview.expected_revenue?.toFixed(2) || 0} revenue
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            <p className="text-sm text-gray-500">Active Agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-sm text-gray-500">Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {agents.filter(a => a.is_validated).length}
            </p>
            <p className="text-sm text-gray-500">Validated Agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {agents.filter(a => a.status === 'active').length}
            </p>
            <p className="text-sm text-gray-500">Active Status</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAgentsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Agents</h3>
          <p className="text-sm text-gray-500">
            Manage voice agents for {organization.name}
          </p>
        </div>
        <button
          onClick={handleCreateAgent}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Agent
        </button>
      </div>

      {/* Agents Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-500 mb-4">Create your first voice agent to get started</p>
            <button
              onClick={handleCreateAgent}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Agent
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleAgentClick(agent)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.agent_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      agent.status === 'active' ? 'bg-green-100 text-green-800' :
                      agent.status === 'pending_validation' ? 'bg-yellow-100 text-yellow-800' :
                      agent.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      agent.is_validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.is_validated ? 'Validated' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAgentClick(agent);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Users</h3>
        <p className="text-sm text-gray-500">
          Manage users for {organization.name}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
            <p className="text-gray-500">Users will appear here once they're created</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sign In
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {user.first_name?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'org_admin' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'org_viewer' ? 'bg-gray-100 text-gray-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'super_admin' ? 'Super Admin' :
                       user.role === 'org_admin' ? 'Org Admin' :
                       user.role === 'org_viewer' ? 'Org Viewer' :
                       user.role === 'user' ? 'User' : user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Organization Settings</h3>
        <p className="text-sm text-gray-500">
          Configure settings for {organization.name}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Organization Name</dt>
                <dd className="text-sm text-gray-900">{organization.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="text-sm text-gray-900">{organization.slug}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(organization.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Billing Configuration</h4>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">COGS per Minute</dt>
                <dd className="text-sm text-gray-900">${organization.cogs_per_minute}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Billing Rate per Minute</dt>
                <dd className="text-sm text-gray-900">${organization.billing_rate_per_minute}</dd>
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
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'agents': return renderAgentsTab();
      case 'users': return renderUsersTab();
      case 'settings': return renderSettingsTab();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={onBack}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
              <p className="mt-2 text-gray-600">
                Organization details and management
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
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
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Modals */}
        {showAgentWizard && (
          <AgentWizardModal
            organization={organization}
            onClose={handleAgentWizardClose}
            onSuccess={handleAgentWizardSuccess}
          />
        )}

        {showAgentDetail && selectedAgent && (
          <AgentDetailView
            agent={selectedAgent}
            organization={organization}
            onClose={handleAgentDetailClose}
          />
        )}
      </div>
    </div>
  );
}

export default OrganizationDetailView;
