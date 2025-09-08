import { describe, it, expect } from 'vitest';

describe('Test Setup Validation', () => {
  it('should have access to vi functions', () => {
    expect(vi).toBeDefined();
    expect(vi.fn).toBeDefined();
    expect(vi.mock).toBeDefined();
  });

  it('should have mocked Google OAuth', () => {
    expect(window.google).toBeDefined();
    expect(window.google.accounts.id.initialize).toBeDefined();
  });

  it('should have mocked localStorage', () => {
    expect(window.localStorage).toBeDefined();
    expect(window.localStorage.getItem).toBeDefined();
    expect(window.localStorage.setItem).toBeDefined();
  });

  it('should have environment variables', () => {
    expect(process.env.VITE_API_URL).toBe('http://localhost:3000');
    expect(process.env.VITE_GOOGLE_CLIENT_ID).toBe('test-google-client-id');
  });

  it('should have mocked fetch', () => {
    expect(global.fetch).toBeDefined();
    expect(typeof global.fetch).toBe('function');
  });
});
