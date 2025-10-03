import React from 'react';

function AgentDetailView({ agent, organization, onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Agent Details</h2>
            <p className="text-sm text-gray-500">{agent.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Agent Detail View - Coming Soon
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This component will show:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Billable calls vs Test calls tabs</li>
                    <li>Call history and metrics</li>
                    <li>Agent configuration details</li>
                    <li>Webhook status and logs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Agent Info */}
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Agent Name</dt>
                <dd className="text-sm text-gray-900">{agent.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Retell Agent ID</dt>
                <dd className="text-sm text-gray-900">{agent.agent_id}</dd>
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
              <div>
                <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
                <dd className="text-sm text-gray-900 font-mono break-all">{agent.webhook_url}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(agent.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentDetailView;
