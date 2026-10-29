import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../apiError';
import { makePerson } from '../../test/personFactories';
import type { Person } from '../../types/person';

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

const ok = <T,>(data: T) => Promise.resolve({ data: { success: true, data } });
const fail = (status: number, error: unknown) =>
  Promise.reject(Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data: { success: false, error } } }));

const person: Person = {
  id: 7, user_id: 1, display_name: 'Priya Raman', aliases: ['Pri'], peopler_id: null, peopler_url: null,
  created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z',
};

describe('person client methods', () => {
  const client = createAuthenticatedApiClient(() => 'token', vi.fn());

  beforeEach(() => {
    http.get.mockReset();
    http.post.mockReset();
    http.put.mockReset();
    http.delete.mockReset();
  });

  it('getPeople hits /people bare and returns the array as is', async () => {
    const rows = [makePerson({ id: 7, open_count: 3, done_count: 5 })];
    http.get.mockReturnValue(ok(rows));
    expect(await client.getPeople()).toEqual(rows);
    expect(http.get).toHaveBeenCalledWith('/people');
  });

  it('getPeople sends q and limit, URL-encoding q', async () => {
    http.get.mockReturnValue(ok([]));
    await client.getPeople({ q: 'pri', limit: 8 });
    expect(http.get).toHaveBeenLastCalledWith('/people?q=pri&limit=8');
    await client.getPeople({ q: 'Sam & co' });
    expect(http.get).toHaveBeenLastCalledWith('/people?q=Sam+%26+co');
  });

  it('getPerson, createPerson, updatePerson and mergePerson return bare data', async () => {
    http.get.mockReturnValue(ok({ ...person, open_count: 1, done_count: 0 }));
    expect(await client.getPerson(7)).toMatchObject({ id: 7, open_count: 1 });
    expect(http.get).toHaveBeenCalledWith('/people/7');

    http.post.mockReturnValue(ok(person));
    expect(await client.createPerson({ display_name: 'Priya Raman', aliases: ['Pri'] })).toEqual(person);
    expect(http.post).toHaveBeenCalledWith('/people', { display_name: 'Priya Raman', aliases: ['Pri'] });

    http.put.mockReturnValue(ok({ ...person, display_name: 'Priya R.' }));
    expect(await client.updatePerson(7, { display_name: 'Priya R.' })).toMatchObject({ display_name: 'Priya R.' });
    expect(http.put).toHaveBeenCalledWith('/people/7', { display_name: 'Priya R.' });

    http.post.mockReturnValue(ok({ ...person, id: 9 }));
    expect(await client.mergePerson(7, 9)).toMatchObject({ id: 9 });
    expect(http.post).toHaveBeenLastCalledWith('/people/7/merge', { into_id: 9 });
  });

  it('deletePerson resolves to undefined on { success: true } with no data', async () => {
    http.delete.mockReturnValue(Promise.resolve({ data: { success: true } }));
    await expect(client.deletePerson(7)).resolves.toBeUndefined();
    expect(http.delete).toHaveBeenCalledWith('/people/7');
  });

  it('rejects with ApiError carrying the backend code and status', async () => {
    http.post.mockReturnValue(fail(409, { code: 'PERSON_MERGE_CONFLICT', message: 'Linked to different Peopler people' }));
    const err = await client.mergePerson(7, 9).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'PERSON_MERGE_CONFLICT' });

    http.get.mockReturnValue(fail(404, { code: 'PERSON_NOT_FOUND', message: 'Person not found' }));
    await expect(client.getPerson(99)).rejects.toMatchObject({ status: 404, code: 'PERSON_NOT_FOUND' });

    http.get.mockReturnValue(Promise.reject(Object.assign(new Error('Network Error'), { isAxiosError: true })));
    await expect(client.getPeople()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('getTodos sends person_id and no area_id', async () => {
    http.get.mockReturnValue(ok([]));
    await client.getTodos({ person_id: 7, completed: false });
    const url = http.get.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('person_id')).toBe('7');
    expect(params.get('completed')).toBe('false');
    expect(params.has('area_id')).toBe(false);
  });
});
