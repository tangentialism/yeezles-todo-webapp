import React, { useState } from 'react';
import { useArea } from '../contexts/AreaContext';
import AreaManagementModal from './AreaManagementModal';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const { areas, currentArea, setCurrentArea, isLoading } = useArea();

  const views = [
    { id: 'all', label: 'All Todos', icon: '📝' },
    { id: 'today', label: 'Today', icon: '⭐' },
    { id: 'completed', label: 'Completed', icon: '✅' },
  ];

  const handleAreaChange = (areaId: number | null) => {
    const selectedArea = areaId && Array.isArray(areas) 
      ? areas.find(area => area.id === areaId) || null 
      : null;
    setCurrentArea(selectedArea);
    setIsAreaDropdownOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Navigation Views */}
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  currentView === view.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1 sm:mr-2">{view.icon}</span>
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            ))}
          </div>

          {/* Area Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
              disabled={isLoading}
              className="flex items-center py-2 px-3 rounded-lg border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              ) : (
                <>
                  {/* Current Area Color Indicator */}
                  <div
                    className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                    style={{ backgroundColor: currentArea?.color || '#6B7280' }}
                  ></div>
                  <span className="hidden sm:inline mr-2">
                    {currentArea ? currentArea.name : 'All Areas'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isAreaDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {/* Area Dropdown */}
            {isAreaDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {/* All Areas Option */}
                  <button
                    onClick={() => handleAreaChange(null)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center ${
                      !currentArea ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full mr-3 border border-gray-300 bg-gray-200"></div>
                    All Areas
                    {!currentArea && (
                      <svg className="w-4 h-4 ml-auto text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Individual Areas */}
                  {Array.isArray(areas) && areas.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => handleAreaChange(area.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center ${
                        currentArea?.id === area.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-3 border border-gray-300"
                        style={{ backgroundColor: area.color }}
                      ></div>
                      {area.name}
                      {area.is_default && (
                        <span className="ml-auto text-xs text-gray-400">default</span>
                      )}
                      {currentArea?.id === area.id && (
                        <svg className="w-4 h-4 ml-auto text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-1"></div>

                  {/* Manage Areas Button */}
                  <button
                    onClick={() => {
                      setIsAreaModalOpen(true);
                      setIsAreaDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center text-gray-700"
                  >
                    <svg className="w-3 h-3 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Manage Areas...
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area Management Modal */}
      <AreaManagementModal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
      />
    </nav>
  );
};

export default Navigation;
