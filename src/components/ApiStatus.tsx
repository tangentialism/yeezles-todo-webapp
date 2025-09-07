import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const ApiStatus: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const apiClient = useApi();

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        setStatus('loading');
        await apiClient.healthCheck();
        setStatus('connected');
      } catch (err: any) {
        setStatus('error');
        console.error('API Health Check Error:', err);
      }
    };

    checkApiHealth();
  }, [apiClient]);

  const getStatusText = () => {
    switch (status) {
      case 'loading': return '⏳ Checking API connection...';
      case 'connected': return '✅ API Connected';
      case 'error': return '❌ API Disconnected';
      default: return '❓ API Status Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'text-yellow-600';
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="text-center py-1">
      <p className={`text-xs ${getStatusColor()}`}>
        {getStatusText()}
      </p>
    </div>
  );
};

export default ApiStatus;
