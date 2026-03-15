import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('in development mode', () => {
    it('should call console.log for logger.log', async () => {
      vi.stubEnv('DEV', true);
      const { logger } = await import('../logger');
      logger.log('test message');
      expect(console.log).toHaveBeenCalledWith('test message');
      vi.unstubAllEnvs();
    });

    it('should call console.warn for logger.warn', async () => {
      vi.stubEnv('DEV', true);
      const { logger } = await import('../logger');
      logger.warn('warning');
      expect(console.warn).toHaveBeenCalledWith('warning');
      vi.unstubAllEnvs();
    });

    it('should call console.error for logger.error', async () => {
      vi.stubEnv('DEV', true);
      const { logger } = await import('../logger');
      logger.error('error');
      expect(console.error).toHaveBeenCalledWith('error');
      vi.unstubAllEnvs();
    });
  });

  describe('in production mode', () => {
    it('should NOT call console.log for logger.log', async () => {
      vi.stubEnv('DEV', false);
      const { logger } = await import('../logger');
      logger.log('test message');
      expect(console.log).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it('should NOT call console.warn for logger.warn', async () => {
      vi.stubEnv('DEV', false);
      const { logger } = await import('../logger');
      logger.warn('warning');
      expect(console.warn).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });

    it('should NOT call console.error for logger.error', async () => {
      vi.stubEnv('DEV', false);
      const { logger } = await import('../logger');
      logger.error('error');
      expect(console.error).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    });
  });
});
