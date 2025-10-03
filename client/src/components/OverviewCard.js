import React from 'react';

const OverviewCard = ({ overview, formatDuration }) => {
  // Add null checks
  if (!overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg border-2 border-gray-200 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Calls',
      value: overview.total_calls || 0,
      subtitle: overview.billable_calls !== undefined 
        ? `${overview.billable_calls || 0} billable, ${overview.test_calls || 0} test`
        : null,
      icon: '📞',
      color: 'blue'
    },
    {
      title: 'Answered Rate',
      value: `${overview.answer_rate || 0}%`,
      subtitle: `${overview.answered_calls || 0} answered`,
      icon: '✅',
      color: 'green'
    },
    {
      title: 'Avg Duration',
      value: formatDuration(overview.avg_duration_seconds || 0),
      subtitle: `${overview.avg_billed_minutes?.toFixed(2) || 0} min avg`,
      icon: '⏱️',
      color: 'purple'
    },
    {
      title: 'Total Minutes',
      value: `${overview.total_billed_minutes?.toFixed(2) || 0}`,
      subtitle: overview.expected_revenue !== undefined 
        ? `$${overview.expected_revenue.toFixed(2)} revenue`
        : null,
      icon: '💰',
      color: 'orange'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white p-6 rounded-lg border-2 ${getColorClasses(card.color)}`}
        >
          <div className="flex items-center">
            <div className="text-2xl mr-3">{card.icon}</div>
            <div>
              <p className="text-sm font-medium opacity-75">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs opacity-60 mt-1">{card.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Time Window Info */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
        <div className="flex items-center">
          <div className="text-2xl mr-3">📅</div>
          <div>
            <p className="text-sm font-medium text-gray-500">Time Window</p>
            <p className="text-sm font-bold text-gray-900">
              {overview.window?.from ? new Date(overview.window.from).toLocaleDateString() : 'N/A'} - {overview.window?.to ? new Date(overview.window.to).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCard;
