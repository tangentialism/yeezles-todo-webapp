import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const ok = <T,>(data: T) => Promise.resolve({ data: { success: true, data } });
const fail = (status: number, error: unknown) =>
  Promise.reject(Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data: { success: false, error } } }));

const topic = {
  id: 3, user_id: 1, area_id: 2, name: 'Kitchen reno', description: null,
  status_note: null, status_note_updated_at: null, archived: false,
  created_at: '2026-10-13T00:00:00.000Z', updated_at: '2026-10-13T00:00:00.000Z',
};

describe('topic client methods', () => {
  const client = createAuthenticatedApiClient(() => 'token', vi.fn());

  beforeEach(() => {
    http.get.mockReset();
    http.post.mockReset();
    http.put.mockReset();
    http.delete.mockReset();
  });

  it('getTopics sends area_id and include_archived and returns data.topics', async () => {
    http.get.mockReturnValue(ok({ topics: [{ ...topic, open_count: 4, done_count: 2 }], count: 1 }));
    const topics = await client.getTopics({ areaId: 2, includeArchived: true });
    expect(http.get).toHaveBeenCalledWith('/topics?area_id=2&include_archived=true');
    expect(topics).toEqual([{ ...topic, open_count: 4, done_count: 2 }]);
  });

  it('getTopics without options lists every area', async () => {
    http.get.mockReturnValue(ok({ topics: [], count: 0 }));
    await client.getTopics();
    expect(http.get).toHaveBeenCalledWith('/topics');
  });

  it('getTopic, createTopic, updateTopic and setTopicNote return data.topic', async () => {
    http.get.mockReturnValue(ok({ topic: { ...topic, open_count: 1, done_count: 0 } }));
    expect(await client.getTopic(3)).toMatchObject({ id: 3, open_count: 1 });
    expect(http.get).toHaveBeenCalledWith('/topics/3');

    http.post.mockReturnValue(ok({ topic }));
    expect(await client.createTopic({ name: 'Kitchen reno', area_id: 2 })).toEqual(topic);
    expect(http.post).toHaveBeenCalledWith('/topics', { name: 'Kitchen reno', area_id: 2 });

    http.put.mockReturnValue(ok({ topic: { ...topic, archived: true } }));
    expect(await client.updateTopic(3, { archived: true })).toMatchObject({ archived: true });
    expect(http.put).toHaveBeenCalledWith('/topics/3', { archived: true });

    http.put.mockReturnValue(ok({ topic: { ...topic, status_note: 'Waiting' } }));
    expect(await client.setTopicNote(3, 'Waiting')).toMatchObject({ status_note: 'Waiting' });
    expect(http.put).toHaveBeenLastCalledWith('/topics/3/note', { status_note: 'Waiting' });
  });

  it('deleteTopic calls DELETE /topics/:id', async () => {
    http.delete.mockReturnValue(ok({ message: 'Topic deleted successfully', topic_id: 3 }));
    await client.deleteTopic(3);
    expect(http.delete).toHaveBeenCalledWith('/topics/3');
  });

  it('throws ApiError with the backend code', async () => {
    http.post.mockReturnValue(fail(409, { code: 'TOPIC_NAME_TAKEN', message: 'A topic named "Garden" already exists' }));
    await expect(client.createTopic({ name: 'garden', area_id: 2 })).rejects.toMatchObject({
      status: 409,
      code: 'TOPIC_NAME_TAKEN',
    });
    await expect(client.createTopic({ name: 'garden', area_id: 2 })).rejects.toBeInstanceOf(ApiError);
  });

  it('deleteArea throws ApiError for AREA_HAS_TOPICS', async () => {
    http.delete.mockReturnValue(fail(409, { code: 'AREA_HAS_TOPICS', message: 'Area still has topics' }));
    await expect(client.deleteArea(2)).rejects.toMatchObject({ code: 'AREA_HAS_TOPICS' });
  });

  it('createTodo and updateTodo throw ApiError carrying the server message', async () => {
    http.post.mockReturnValue(fail(404, { code: 'TOPIC_NOT_FOUND', message: 'Topic not found' }));
    await expect(client.createTodo({ title: 'x', area_id: 1, topic_id: 9 })).rejects.toMatchObject({ code: 'TOPIC_NOT_FOUND', message: 'Topic not found' });
    http.put.mockReturnValue(fail(400, { code: 'TOPIC_AREA_MISMATCH', message: 'Topic belongs to another area' }));
    await expect(client.updateTodo(5, { area_id: 1, topic_id: 9 })).rejects.toMatchObject({ code: 'TOPIC_AREA_MISMATCH' });
  });

  it('getTodos passes topic_id', async () => {
    http.get.mockReturnValue(ok([]));
    await client.getTodos({ topic_id: 3, completed: true });
    expect(http.get).toHaveBeenCalledWith('/todos?completed=true&topic_id=3');
  });
});
