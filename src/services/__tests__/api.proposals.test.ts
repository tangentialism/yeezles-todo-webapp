import { describe, it, expect, vi, beforeEach } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
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

const accepted = { area_id: 2, new_topics: [], assignments: [{ todo_id: 1, topic: 'Garden' }], note_edits: [] };

describe('proposal client methods', () => {
  const client = createAuthenticatedApiClient(() => 'token', vi.fn());
  beforeEach(() => { http.get.mockReset(); http.post.mockReset(); });

  it('listProposals asks for one status and returns data.proposals', async () => {
    http.get.mockReturnValue(ok({ proposals: [{ id: 7 }], count: 1 }));
    expect(await client.listProposals('pending')).toEqual([{ id: 7 }]);
    expect(http.get).toHaveBeenCalledWith('/proposals?status=pending');
  });

  it('getProposal returns the resolved proposal', async () => {
    http.get.mockReturnValue(ok({ proposal: { id: 7 }, summary: 's' }));
    expect(await client.getProposal(7)).toEqual({ proposal: { id: 7 }, summary: 's' });
    expect(http.get).toHaveBeenCalledWith('/proposals/7');
  });

  it('applyProposal posts { accepted } and returns proposal and created_topics', async () => {
    http.post.mockReturnValue(ok({ proposal: { id: 7, status: 'applied' }, created_topics: [{ id: 30, name: 'Kitchen reno' }] }));
    const result = await client.applyProposal(7, accepted);
    expect(http.post).toHaveBeenCalledWith('/proposals/7/apply', { accepted });
    expect(result.created_topics).toEqual([{ id: 30, name: 'Kitchen reno' }]);
  });

  it('rejectProposal returns data.proposal', async () => {
    http.post.mockReturnValue(ok({ proposal: { id: 7, status: 'rejected' } }));
    expect(await client.rejectProposal(7)).toEqual({ id: 7, status: 'rejected' });
    expect(http.post).toHaveBeenCalledWith('/proposals/7/reject');
  });

  it('a 422 carries errors[] and a 409 its code', async () => {
    http.post.mockReturnValueOnce(fail(422, { code: 'PROPOSAL_INVALID', message: '1 item(s) cannot be applied; nothing was applied', errors: [{ path: 'assignments[0].todo_id', reason: 'todo not found' }] }));
    await expect(client.applyProposal(7, accepted)).rejects.toMatchObject({ status: 422, errors: [{ path: 'assignments[0].todo_id', reason: 'todo not found' }] });
    http.post.mockReturnValueOnce(fail(409, { code: 'PROPOSAL_RESOLVED', message: 'Proposal is already applied' }));
    await expect(client.rejectProposal(7)).rejects.toMatchObject({ code: 'PROPOSAL_RESOLVED' });
  });
});
