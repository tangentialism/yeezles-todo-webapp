import React, { useState, useEffect } from 'react';
import { todoApi } from '../services/api';

const ApiStatus: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [apiInfo, setApiInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        setStatus('loading');
        const response = await todoApi.healthCheck();
        setApiInfo(response.data);
        setStatus('connected');
        setError(null);
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.message || err.message || 'Failed to connect to API');
        console.error('API Health Check Error:', err);
      }
    };

    checkApiHealth();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'connected': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return '⏳';
      case 'connected': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <h3 className="font-semibold">API Status</h3>
      </div>
      
      {status === 'loading' && (
        <p className="text-sm">Checking API connection...</p>
      )}
      
      {status === 'connected' && apiInfo && (
        <div className="text-sm space-y-1">
          <p>✓ Connected to API</p>
          <p>Status: {apiInfo.status}</p>
          <p>Database: {apiInfo.database?.status}</p>
          {apiInfo.database?.migrations_applied && (
            <p>Migrations: {apiInfo.database.migrations_applied}</p>
          )}
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-sm">
          <p>Failed to connect to API</p>
          {error && <p className="mt-1 font-mono text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default ApiStatus;
