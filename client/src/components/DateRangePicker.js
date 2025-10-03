import React, { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const DateRangePicker = ({ dateRange, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: 'Last 24 hours',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)).toISOString(),
        to: endOfDay(new Date()).toISOString()
      })
    },
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 7)).toISOString(),
        to: endOfDay(new Date()).toISOString()
      })
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 30)).toISOString(),
        to: endOfDay(new Date()).toISOString()
      })
    }
  ];

  const handlePresetClick = (preset) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const handleCustomChange = (field, value) => {
    onChange({
      ...dateRange,
      [field]: new Date(value).toISOString()
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Date Range</h3>
        
        <div className="flex items-center space-x-4">
          {/* Preset buttons */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium text-gray-700"
            >
              Quick Select
            </button>
            
            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  {presetRanges.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetClick(preset)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom date inputs */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={format(new Date(dateRange.from), 'yyyy-MM-dd')}
              onChange={(e) => handleCustomChange('from', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={format(new Date(dateRange.to), 'yyyy-MM-dd')}
              onChange={(e) => handleCustomChange('to', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-sm text-gray-500">
        Showing data from {format(new Date(dateRange.from), 'MMM dd, yyyy')} to {format(new Date(dateRange.to), 'MMM dd, yyyy')}
      </div>
    </div>
  );
};

export default DateRangePicker;
