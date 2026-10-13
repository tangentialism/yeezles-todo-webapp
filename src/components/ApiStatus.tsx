import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { logger } from '../utils/logger';

const STATUS = {
  loading: { label: 'Checking connection…', dot: 'bg-line-strong' },
  connected: { label: 'Connected', dot: 'bg-ok' },
  error: { label: 'Disconnected', dot: 'bg-danger' },
} as const;

/**
 * Compact status line that pings `GET /health` on mount and shows whether
 * the backend API is reachable. Shown inside the account menu.
 */
const ApiStatus: React.FC = () => {
  const [status, setStatus] = useState<keyof typeof STATUS>('loading');
  const apiClient = useApi();

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        setStatus('loading');
        await apiClient.healthCheck();
        setStatus('connected');
      } catch (err: unknown) {
        setStatus('error');
        logger.error('API Health Check Error:', err);
      }
    };

    checkApiHealth();
  }, [apiClient]);

  const { label, dot } = STATUS[status];

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] text-ink-muted" role="status">
      <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />
      {label}
    </div>
  );
};

export default ApiStatus;
