import React from 'react';

const CallsTable = ({ calls, formatDuration, formatPhoneNumber, billingRate = 0.04, showRevenue = false }) => {
  const getStatusColor = (status) => {
    const colors = {
      'answered': 'bg-green-100 text-green-800',
      'completed': 'bg-green-100 text-green-800',
      'missed': 'bg-red-100 text-red-800',
      'failed': 'bg-red-100 text-red-800',
      'busy': 'bg-yellow-100 text-yellow-800',
      'voicemail': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getEndReasonText = (endReason) => {
    const reasons = {
      'hangup': 'Hangup',
      'completed': 'Completed',
      'no_answer': 'No Answer',
      'busy': 'Busy',
      'voicemail': 'Voicemail',
      'error': 'Error'
    };
    return reasons[endReason] || endReason || 'Unknown';
  };

  // Add null/undefined checks
  if (!calls || !Array.isArray(calls) || calls.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-4xl mb-4">📞</div>
        <p>No calls found in the selected date range</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Started At
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From → To
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Minutes
            </th>
            {showRevenue && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              End Reason
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Summary
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {calls.map((call, index) => {
            const isBillable = call.is_billable !== undefined ? call.is_billable : (call.from_e164 && call.from_e164.length > 0);
            const revenue = isBillable ? (call.billed_minutes || 0) * billingRate : 0;
            
            return (
              <tr key={call.external_call_id || call.id || index} className="hover:bg-gray-50">
                {/* Type Badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {isBillable ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      💰 Billable
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                      🧪 Test
                    </span>
                  )}
                </td>
                
                {/* Started At */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(call.started_at).toLocaleString()}
                </td>
                
                {/* From → To */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    {call.from_e164 && call.to_e164 ? (
                      <>
                        <span className="text-gray-600">{formatPhoneNumber(call.from_e164)}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-gray-900">{formatPhoneNumber(call.to_e164)}</span>
                      </>
                    ) : (
                      <span className="text-gray-500 italic">Web Call</span>
                    )}
                  </div>
                </td>
                
                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                    {call.status}
                  </span>
                </td>
                
                {/* Duration */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(call.duration_seconds)}
                </td>
                
                {/* Minutes */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {call.billed_minutes || '0'}
                </td>
                
                {/* Revenue (conditional) */}
                {showRevenue && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isBillable ? (
                      <span className="font-medium text-green-600">
                        ${revenue.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">$0.00</span>
                    )}
                  </td>
                )}
                
                {/* End Reason */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getEndReasonText(call.end_reason)}
                </td>
                
                {/* Summary */}
                <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                  <div className="break-words" title={call.detailed_summary || 'No summary available'}>
                    {call.detailed_summary || 'No summary available'}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CallsTable;
