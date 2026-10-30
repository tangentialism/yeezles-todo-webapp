import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '../apiError';

// A fake axios instance: the client calls axios.create() once in its constructor.
const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
}));
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, create: () => http } };
});

import { createAuthenticatedApiClient } from '../api';

// Captured right after the client is built, before any per-test mock clearing.
let capturedErrorHandler: ((error: unknown) => unknown) | undefined;
const captureHandler = () => {
  const calls = http.interceptors.response.use.mock.calls;
  capturedErrorHandler = calls[calls.length - 1][1];
};

const ok = <T,>(data: T) => Promise.resolve({ data: { success: true, data } });

/** The response interceptor's error handler, as the client registered it. */
const errorInterceptor = (): ((error: unknown) => unknown) => capturedErrorHandler!;

/** A rejection that passes through the real response interceptor first, as axios would. */
const failVia = (status: number, error: unknown, body?: unknown) => {
  const axiosError = Object.assign(new Error('Request failed with status code ' + status), {
    isAxiosError: true,
    config: { method: 'put', url: '/peopler/connection', data: body },
    request: {},
    response: { status, data: { success: false, error }, config: { data: body } },
  });
  try {
    errorInterceptor()(axiosError);
  } catch (thrown) {
    return Promise.reject(thrown);
  }
  return Promise.reject(axiosError);
};

const connected = {
  connected: true as const, status: 'ok' as const, peopler_email: 'quill@example.test',
  peopler_display_name: 'Avery Quill', peopler_account_id: 4, last_verified_at: '2026-10-30T00:00:00.000Z',
};

describe('peopler client methods', () => {
  const client = createAuthenticatedApiClient(() => 'token', vi.fn());
  captureHandler();

  beforeEach(() => {
    http.get.mockReset();
    http.post.mockReset();
    http.put.mockReset();
    http.delete.mockReset();
  });

  it('getPeoplerConnection GETs /peopler/connection', async () => {
    http.get.mockReturnValue(ok({ connected: false }));
    expect(await client.getPeoplerConnection()).toEqual({ connected: false });
    expect(http.get).toHaveBeenCalledWith('/peopler/connection');
  });

  it('connectPeopler PUTs { token } and returns the connection', async () => {
    http.put.mockReturnValue(ok(connected));
    expect(await client.connectPeopler('pt_x')).toEqual(connected);
    expect(http.put).toHaveBeenCalledWith('/peopler/connection', { token: 'pt_x' });
  });

  it('disconnectPeopler DELETEs and tolerates both { success: true } data and none', async () => {
    http.delete.mockReturnValue(ok({ success: true }));
    await expect(client.disconnectPeopler()).resolves.toBeUndefined();
    expect(http.delete).toHaveBeenCalledWith('/peopler/connection');
    http.delete.mockReturnValue(Promise.resolve({ data: { success: true } }));
    await expect(client.disconnectPeopler()).resolves.toBeUndefined();
  });

  it('searchPeopler URL-encodes q and returns data.results', async () => {
    const results = [{ id: 1, display_name: 'Avery Quill', company: null, title: null, created_at: '2026-10-01T00:00:00.000Z', already_linked_person_id: null }];
    http.get.mockReturnValue(ok({ account_id: 4, results }));
    expect(await client.searchPeopler('Avery Q')).toEqual(results);
    expect(http.get).toHaveBeenCalledWith('/peopler/search?q=Avery%20Q');
  });

  it('checkPeoplerLink posts {} or { force: true } and returns the person', async () => {
    http.post.mockReturnValue(ok({ id: 3 }));
    expect(await client.checkPeoplerLink(3)).toEqual({ id: 3 });
    expect(http.post).toHaveBeenLastCalledWith('/people/3/peopler-check', {});
    await client.checkPeoplerLink(3, true);
    expect(http.post).toHaveBeenLastCalledWith('/people/3/peopler-check', { force: true });
  });

  it('updatePerson({ peopler_id: null }) sends the key', async () => {
    http.put.mockReturnValue(ok({ id: 3 }));
    await client.updatePerson(3, { peopler_id: null });
    expect(http.put).toHaveBeenCalledWith('/people/3', { peopler_id: null });
    expect(Object.keys(http.put.mock.calls[0][1])).toEqual(['peopler_id']);
  });

  it('a 422 PEOPLER_TOKEN_REJECTED rejects with an ApiError carrying status and code', async () => {
    http.put.mockReturnValue(failVia(422, { code: 'PEOPLER_TOKEN_REJECTED', message: 'no' }));
    await expect(client.connectPeopler('pt_x')).rejects.toMatchObject({ status: 422, code: 'PEOPLER_TOKEN_REJECTED' });
    http.put.mockReturnValue(failVia(422, { code: 'PEOPLER_TOKEN_REJECTED', message: 'no' }));
    await expect(client.connectPeopler('pt_x')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('response interceptor logging (token safety)', () => {
  const SECRET = 'pt_secret_INVENTED_123';
  const client = createAuthenticatedApiClient(() => 'token', vi.fn());
  captureHandler();
  let spies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.stubEnv('DEV', true);
    spies = (['error', 'log', 'warn', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    spies.forEach((s) => s.mockRestore());
  });

  const render = (arg: unknown): string => {
    const seen = new WeakSet<object>();
    let json = '';
    try {
      json = JSON.stringify(arg, (_k, v) => {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[cycle]';
          seen.add(v);
        }
        return v;
      }) ?? '';
    } catch { /* unserialisable: String() below still runs */ }
    return String(arg) + json + (arg instanceof Error ? arg.message + arg.stack : '');
  };

  it('a rejected connect logs the status but nothing containing the token', async () => {
    http.put.mockReturnValue(failVia(422, { code: 'PEOPLER_TOKEN_REJECTED', message: 'no' }, JSON.stringify({ token: SECRET })));
    await expect(client.connectPeopler(SECRET)).rejects.toMatchObject({ code: 'PEOPLER_TOKEN_REJECTED' });
    const logged = spies.flatMap((s) => s.mock.calls.flat());
    expect(logged.length).toBeGreaterThan(0);
    for (const arg of logged) expect(render(arg)).not.toContain(SECRET);
    expect(logged.map(render).join(' ')).toContain('422');
  });
});
