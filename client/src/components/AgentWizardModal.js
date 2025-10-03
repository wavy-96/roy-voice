import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSupabase } from '../contexts/SupabaseContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

function AgentWizardModal({ organization, onClose, onSuccess }) {
  const supabase = useSupabase();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [agentData, setAgentData] = useState({
    name: '',
    agent_id: '',
    organization_id: organization?.id || ''
  });
  const [validationStatus, setValidationStatus] = useState('waiting'); // waiting, validating, success, timeout, error
  const [validationAttempts, setValidationAttempts] = useState(0);
  const [maxAttempts] = useState(3);

  useEffect(() => {
    if (currentStep === 3) {
      // Start listening for webhook validation
      startWebhookValidation();
    }
  }, [currentStep]);

  const startWebhookValidation = async () => {
    setValidationStatus('validating');
    setValidationAttempts(0);
    
    // Poll for webhook validation every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'ngrok-skip-browser-warning': 'true'
        };

        // Check if agent was validated
        const response = await axios.get(
          `${API_BASE_URL}/api/agents/webhook-url/${encodeURIComponent(webhookUrl)}`,
          { headers }
        );

        if (response.data && response.data.is_validated) {
          setValidationStatus('success');
          clearInterval(pollInterval);
          setTimeout(() => {
            setCurrentStep(4);
          }, 2000);
        } else {
          setValidationAttempts(prev => {
            const newAttempts = prev + 1;
            if (newAttempts >= maxAttempts) {
              setValidationStatus('timeout');
              clearInterval(pollInterval);
            }
            return newAttempts;
          });
        }
      } catch (err) {
        console.error('Validation check failed:', err);
        setValidationAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts >= maxAttempts) {
            setValidationStatus('error');
            clearInterval(pollInterval);
          }
          return newAttempts;
        });
      }
    }, 5000);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (validationStatus === 'validating') {
        setValidationStatus('timeout');
      }
    }, 120000);
  };

  const handleStep1Next = () => {
    if (!agentData.name.trim() || !agentData.agent_id.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };

      // Create the agent
      const response = await axios.post(
        `${API_BASE_URL}/api/agents`,
        agentData,
        { headers }
      );

      setWebhookUrl(response.data.webhook_url);
      setCurrentStep(3);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err.response?.data?.error || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Next = () => {
    if (validationStatus === 'success') {
      setCurrentStep(4);
    }
  };

  const handleFinish = () => {
    onSuccess?.();
    onClose();
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    // You could add a toast notification here
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🤖</div>
        <h3 className="text-xl font-semibold text-gray-900">Agent Details</h3>
        <p className="text-gray-600 mt-2">Enter the basic information for your Retell AI agent</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={agentData.name}
            onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="My Voice Agent"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Retell Agent ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={agentData.agent_id}
            onChange={(e) => setAgentData({ ...agentData, agent_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="agent_1234567890abcdef"
            pattern="^agent_[a-zA-Z0-9]+$"
          />
          <p className="text-xs text-gray-500 mt-1">
            Must start with "agent_" followed by alphanumeric characters
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">💡 Where to find your Agent ID:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Log into your Retell AI dashboard</li>
            <li>2. Go to the "Agents" section</li>
            <li>3. Copy the Agent ID from your agent's details page</li>
          </ol>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-xl font-semibold text-gray-900">Webhook Configuration</h3>
        <p className="text-gray-600 mt-2">Configure the webhook URL in your Retell AI agent</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL
          </label>
          <div className="flex">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-700"
            />
            <button
              onClick={copyWebhookUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-md">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important Steps:</h4>
          <ol className="text-sm text-yellow-800 space-y-1">
            <li>1. Copy the webhook URL above</li>
            <li>2. Go to your Retell AI agent settings</li>
            <li>3. Paste the URL in the "Webhook URL" field</li>
            <li>4. Save the agent configuration</li>
            <li>5. Click "Next" to proceed with testing</li>
          </ol>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🧪</div>
        <h3 className="text-xl font-semibold text-gray-900">Test Webhook</h3>
        <p className="text-gray-600 mt-2">Test your webhook by making a call to your agent</p>
      </div>

      <div className="space-y-4">
        {validationStatus === 'waiting' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-600">Ready to test your webhook...</p>
          </div>
        )}

        {validationStatus === 'validating' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">Waiting for webhook test...</p>
            <p className="text-sm text-gray-500">Attempt {validationAttempts + 1} of {maxAttempts}</p>
          </div>
        )}

        {validationStatus === 'success' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 font-medium">Webhook test successful!</p>
            <p className="text-sm text-gray-500 mt-2">Your agent is now validated and ready to use</p>
          </div>
        )}

        {validationStatus === 'timeout' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⏰</div>
            <p className="text-orange-600 font-medium">Test timeout</p>
            <p className="text-sm text-gray-500 mt-2">No webhook received within the timeout period</p>
          </div>
        )}

        {validationStatus === 'error' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 font-medium">Test failed</p>
            <p className="text-sm text-gray-500 mt-2">There was an error validating your webhook</p>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">📞 How to test:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Go to your Retell AI dashboard</li>
            <li>2. Find your agent and click "Test" or "Call"</li>
            <li>3. Make a test call to your agent</li>
            <li>4. The webhook will be automatically validated</li>
          </ol>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-gray-900">Agent Created Successfully!</h3>
        <p className="text-gray-600 mt-2">Your agent is now ready to handle calls</p>
      </div>

      <div className="bg-green-50 p-4 rounded-md">
        <h4 className="font-medium text-green-900 mb-2">✅ What's been set up:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Agent "{agentData.name}" created</li>
          <li>• Webhook URL configured and validated</li>
          <li>• Agent is active and ready to receive calls</li>
          <li>• Call data will be tracked in your dashboard</li>
        </ul>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">📊 Next steps:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Monitor call metrics in your dashboard</li>
          <li>• Set up additional agents if needed</li>
          <li>• Configure billing rates for your organization</li>
        </ul>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return agentData.name.trim() && agentData.agent_id.trim();
      case 2: return true;
      case 3: return validationStatus === 'success';
      case 4: return true;
      default: return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Agent Details';
      case 2: return 'Webhook Configuration';
      case 3: return 'Test Webhook';
      case 4: return 'Success';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Create New Agent</h2>
            <p className="text-sm text-gray-500">Step {currentStep} of 4: {getStepTitle()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={() => {
                  if (currentStep === 1) handleStep1Next();
                  else if (currentStep === 2) handleStep2Next();
                  else if (currentStep === 3) handleStep3Next();
                }}
                disabled={!canProceed() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Next'}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentWizardModal;
