import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const SessionHealthWarning: React.FC = () => {
  const { sessionHealth, authMethod, isAuthenticated } = useAuth();

  // Only show for authenticated persistent sessions that need refresh warning
  if (!isAuthenticated ||
      authMethod !== 'persistent-session' ||
      !sessionHealth.needsRefreshWarning ||
      sessionHealth.daysUntilExpiry === null) {
    return null;
  }

  const daysLeft = sessionHealth.daysUntilExpiry;
  const isUrgent = daysLeft <= 2;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border ${
      isUrgent
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isUrgent ? (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {isUrgent ? 'Session Expiring Soon' : 'Session Refresh Recommended'}
          </h3>
          <p className="mt-1 text-sm">
            Your session expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
            {isUrgent ? ' Please sign in again soon.' : ' Consider signing in again to refresh your session.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionHealthWarning;